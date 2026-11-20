import {personal} from "./personal.js";
import { operations } from "./operations/workspace.js";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { pool, transaction } from "./db.js";
import { digest, fail, hashPassword, verifyPassword } from "./security.js";
import { catalogRouter } from "./catalog.js";
const sessionCookie = "campus_session";
const cookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
const dummyHash = "0".repeat(32) + "." + "0".repeat(128);
const app = express();
app.disable("x-powered-by");
app.use(
  helmet(),
  (req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader("X-Request-ID", req.requestId);
    if (req.path.startsWith("/api/")) {
      res.setHeader("Cache-Control", "no-store");
      if (
        !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
        req.headers.origin &&
        req.headers.origin !== process.env.APP_ORIGIN
      )
        return fail(403, "ORIGIN_DENIED", "Unrecognized application origin.");
    }
    next();
  },
  express.json({ limit: "2mb" }),
);
const api = express.Router();
app.use("/api/v1", api);
api.get("/health", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ data: { status: "ok" } });
});
api.post(
  "/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    skipSuccessfulRequests: true,
    handler: () => fail(429, "RATE_LIMIT", "Try signing in later."),
  }),
  async (req, res) => {
    const { email, password } = req.body ?? {};
    if (
      typeof email !== "string" ||
      email.length > 180 ||
      typeof password !== "string" ||
      password.length > 256
    )
      fail(400, "INVALID_INPUT", "Enter your email and password.");
    const { token, user } = await transaction(async (db) => {
      const [[row]] = await db.execute(
        "SELECT * FROM users WHERE email=? FOR UPDATE",
        [email.trim().toLowerCase()],
      );
      const valid = await verifyPassword(
        password,
        row?.password_hash || dummyHash,
      );
      if (!valid || !row?.active)
        fail(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      const token = randomBytes(32).toString("hex");
      await db.execute(
        "DELETE FROM sessions WHERE expires_at <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')",
      );
      await db.execute(
        "INSERT INTO sessions VALUES (?,?,(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '8 hours')",
        [digest(token), row.id],
      );
      return {
        token,
        user: { id: row.id, name: row.name, email: row.email, role: row.role },
      };
    });
    res
      .cookie(sessionCookie, token, { ...cookieOptions, maxAge: 8 * 3600000 })
      .json({ data: user });
  },
);
api.use(async (req, res, next) => {
  const token = (req.headers.cookie || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(sessionCookie + "="))
    ?.slice(sessionCookie.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    fail(401, "UNAUTHENTICATED", "Please sign in.");
  req.sessionHash = digest(token);
  const [[user]] = await pool.execute(
    "SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AND u.active=1",
    [req.sessionHash],
  );
  if (!user) fail(401, "UNAUTHENTICATED", "Your session has ended.");
  req.user = user;
  next();
});
api.get("/auth/me", (req, res) => res.json({ data: req.user }));
api.post("/auth/logout", async (req, res) => {
  await pool.execute("DELETE FROM sessions WHERE token_hash=?", [
    req.sessionHash,
  ]);
  res
    .clearCookie(sessionCookie, cookieOptions)
    .json({ data: { signedOut: true } });
});
api.post("/auth/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (
    typeof currentPassword !== "string" ||
    currentPassword.length > 256 ||
    typeof newPassword !== "string" ||
    newPassword.length < 12 ||
    newPassword.length > 256 ||
    newPassword === currentPassword
  )
    fail(
      422,
      "INVALID_INPUT",
      "Choose a different password of 12–256 characters.",
    );
  await transaction(async (db) => {
    const [[user]] = await db.execute(
      "SELECT password_hash FROM users WHERE id=? FOR UPDATE",
      [req.user.id],
    );
    if (!(await verifyPassword(currentPassword, user.password_hash)))
      fail(422, "INVALID_PASSWORD", "Current password is incorrect.");
    await db.execute("UPDATE users SET password_hash=? WHERE id=?", [
      await hashPassword(newPassword),
      req.user.id,
    ]);
    await db.execute("DELETE FROM sessions WHERE user_id=?", [req.user.id]);
    await db.execute(
      "INSERT INTO audit_logs(actor_id,action,resource,record_id) VALUES (?,'PASSWORD_CHANGE','users',?)",
      [req.user.id, req.user.id],
    );
  });
  res
    .clearCookie(sessionCookie, cookieOptions)
    .json({ data: { signedOut: true } });
});
api.get("/profile", async (req, res) => {
  const [[student]] = await pool.execute(
    "SELECT s.student_no,s.batch,s.status,p.name AS program,d.name AS department FROM students s JOIN programs p ON p.id=s.program_id JOIN departments d ON d.id=p.department_id WHERE s.user_id=?",
    [req.user.id],
  );
  res.json({ data: { ...req.user, ...student } });
});
api.get("/overview", async (req, res) => {
  const [[term]] = await pool.query(
    "SELECT name,starts_on,ends_on FROM semesters WHERE active=1 AND starts_on <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date AND ends_on >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Dhaka')::date ORDER BY starts_on DESC LIMIT 1",
  );
  if (req.user.role !== "ADMIN")
    return res.json({ data: { term: term || null } });
  const [[counts]] = await pool.query(
    "SELECT (SELECT COUNT(*) FROM departments WHERE active=1) AS departments,(SELECT COUNT(*) FROM programs WHERE active=1) AS programs,(SELECT COUNT(*) FROM courses WHERE active=1) AS courses",
  );
  const [activity] = await pool.query(
    "SELECT a.id,a.action,a.resource,a.record_id,a.created_at,u.name FROM audit_logs a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 8",
  );
  res.json({ data: { term: term || null, counts, activity } });
});
api.use(personal);
api.use("/operations", operations);
api.use("/catalog", catalogRouter());
app.use("/api", (req, res) => fail(404, "NOT_FOUND", "Endpoint not found."));
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
if (existsSync(dist + "index.html")) {
  app.use(express.static(dist));
  app.get("/{*path}", (req, res) => res.sendFile(dist + "index.html"));
}
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const duplicate = error.code === "23505";
  const relatedRecord = error.code === "23503";
  const conflict = duplicate || relatedRecord || error.status === 409;
  const status = conflict
    ? 409
    : error.status || 500;
  if (status >= 500) {
    const diagnostic = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      code: error.code || error.name,
    };
    if (process.env.NODE_ENV !== "production") {
      diagnostic.message = error.message;
      diagnostic.stack = error.stack;
    }
    console.error("API request failed:", diagnostic);
  }
  res
    .status(status)
    .json({
      error: {
        code:
          status === 409
            ? duplicate
              ? "DUPLICATE"
              : relatedRecord
                ? "RELATED_RECORD"
                : "CONFLICT"
            : status >= 500
              ? "INTERNAL_ERROR"
              : error.code || "INVALID_REQUEST",
        message:
          status === 409
            ? duplicate
              ? "This code is already in use."
              : relatedRecord
                ? "A related record prevents this change."
                : "The request conflicts with the current record."
            : status >= 500
              ? "The server could not complete this request."
              : error.message,
        details: error.details??[],
        requestId: req.requestId,
      },
    });
});
export default app;
