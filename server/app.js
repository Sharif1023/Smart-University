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
import { isIsoDate, isSupportedProfileImage } from "./validation.js";
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
        "DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP",
      );
      await db.execute(
        "INSERT INTO sessions VALUES (?,?,CURRENT_TIMESTAMP + INTERVAL 8 HOUR)",
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
    "SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at > CURRENT_TIMESTAMP AND u.active=1",
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
  const [[student]] = req.user.role === "STUDENT"
    ? await pool.execute(
        "SELECT s.student_no,s.batch,s.status,p.name AS program,d.name AS department,term.name AS admission_session,advisor.advisor,staff.name AS advisor_name,sp.date_of_birth,sp.phone,sp.present_address,sp.permanent_address,sp.guardian_name,sp.guardian_phone,sp.emergency_name,sp.emergency_phone,(sp.photo_data IS NOT NULL) has_photo FROM students s JOIN programs p ON p.id=s.program_id JOIN departments d ON d.id=p.department_id LEFT JOIN student_details sd ON sd.student=s.user_id LEFT JOIN semesters term ON term.id=sd.admission LEFT JOIN advising advisor ON advisor.student=s.user_id LEFT JOIN users staff ON staff.id=advisor.advisor LEFT JOIN student_profiles sp ON sp.student=s.user_id WHERE s.user_id=?",
        [req.user.id],
      )
    : [[]];
  res.json({ data: { ...req.user, ...(student ?? {}) } });
});
api.get("/profile/photo", async (req, res) => {
  if (req.user.role !== "STUDENT")
    fail(404, "NOT_FOUND", "Profile photo unavailable.");
  const [[photo]] = await pool.execute(
    "SELECT photo_mime,photo_data FROM student_profiles WHERE student=? AND photo_data IS NOT NULL",
    [req.user.id],
  );
  if (!photo) fail(404, "NOT_FOUND", "No profile photo has been uploaded.");
  res.setHeader("Cache-Control", "private, no-store");
  res.type(photo.photo_mime).send(photo.photo_data);
});
api.put("/profile", async (req, res) => {
  if (req.user.role !== "STUDENT")
    fail(403, "FORBIDDEN", "Only students can edit these profile fields.");
  const body = req.body ?? {},
    field = (key, limit) => {
      const value = body[key];
      if (typeof value !== "string")
        fail(422, "INVALID_INPUT", "Check your contact and address fields.");
      const text = value.trim();
      if (text.length > limit)
        fail(422, "INVALID_INPUT", key.replaceAll("_", " ") + " is too long.");
      return text || null;
    },
    date = body.date_of_birth == null || body.date_of_birth === ""
      ? null
      : String(body.date_of_birth);
  if (date && (!isIsoDate(date) || date > new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10)))
    fail(422, "INVALID_INPUT", "Enter a valid date of birth.");
  const values = {
    phone: field("phone", 32),
    present_address: field("present_address", 250),
    permanent_address: field("permanent_address", 250),
    guardian_name: field("guardian_name", 100),
    guardian_phone: field("guardian_phone", 32),
    emergency_name: field("emergency_name", 100),
    emergency_phone: field("emergency_phone", 32),
  };
  for (const key of ["phone", "guardian_phone", "emergency_phone"])
    if (values[key] && !/^[+\d() .-]{7,32}$/.test(values[key]))
      fail(422, "INVALID_INPUT", "Enter a valid phone number.");
  const upload = body.photo;
  let photoBytes = null;
  if (upload !== undefined) {
    if (!upload || typeof upload.data !== "string" || upload.data.length > 1400000 || !/^[A-Za-z0-9+/]+=*$/.test(upload.data))
      fail(422, "INVALID_INPUT", "Choose a supported image up to 1 MiB.");
    photoBytes = Buffer.from(upload.data, "base64");
    const mime = upload.mime,
      valid = isSupportedProfileImage(mime, photoBytes);
    if (!valid) fail(422, "INVALID_INPUT", "Use a valid JPG, PNG or WebP image up to 1 MiB.");
  }
  if (body.remove_photo !== undefined && typeof body.remove_photo !== "boolean")
    fail(422, "INVALID_INPUT", "Invalid photo update.");
  await transaction(async (db) => {
    const [[exists]] = await db.execute("SELECT user_id FROM students WHERE user_id=? FOR UPDATE", [req.user.id]);
    if (!exists) fail(404, "NOT_FOUND", "Student profile unavailable.");
    await db.execute(
      "INSERT INTO student_profiles(student,date_of_birth,phone,present_address,permanent_address,guardian_name,guardian_phone,emergency_name,emergency_phone) VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE date_of_birth=VALUES(date_of_birth),phone=VALUES(phone),present_address=VALUES(present_address),permanent_address=VALUES(permanent_address),guardian_name=VALUES(guardian_name),guardian_phone=VALUES(guardian_phone),emergency_name=VALUES(emergency_name),emergency_phone=VALUES(emergency_phone)",
      [req.user.id, date, values.phone, values.present_address, values.permanent_address, values.guardian_name, values.guardian_phone, values.emergency_name, values.emergency_phone],
    );
    if (photoBytes)
      await db.execute("UPDATE student_profiles SET photo_mime=?,photo_data=? WHERE student=?", [upload.mime, photoBytes, req.user.id]);
    else if (body.remove_photo)
      await db.execute("UPDATE student_profiles SET photo_mime=NULL,photo_data=NULL WHERE student=?", [req.user.id]);
    await db.execute("INSERT INTO audit_logs(actor_id,action,resource,record_id) VALUES(?,'STUDENT_PROFILE_UPDATE','student_profiles',?)", [req.user.id, req.user.id]);
  });
  res.json({ data: { updated: true } });
});
api.get("/overview", async (req, res) => {
  const [terms] = await pool.query(
    "SELECT id,name,starts_on,ends_on,active FROM semesters ORDER BY starts_on DESC,id DESC",
  );
  const today = new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
  const current =
      terms.find((t) => t.starts_on <= today && t.ends_on >= today) ??
      terms.find((t) => t.active) ??
      terms[0],
    requested = Number(req.query.semester),
    term = (Number.isInteger(requested) && terms.find((t) => t.id === requested)) || current;
  const termInfo = term
    ? { name: term.name, starts_on: term.starts_on, ends_on: term.ends_on }
    : null;
  if (req.user.role !== "ADMIN")
    return res.json({ data: { term: termInfo } });
  const [[counts]] = await pool.query(
    "SELECT (SELECT COUNT(*) FROM departments WHERE active=1) AS departments,(SELECT COUNT(*) FROM programs WHERE active=1) AS programs,(SELECT COUNT(*) FROM courses WHERE active=1) AS courses",
  );
  const [activity] = await pool.query(
    "SELECT a.id,a.action,a.resource,a.record_id,a.created_at,u.name FROM audit_logs a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 8",
  );
  res.json({ data: { term: termInfo, counts, activity } });
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
  const duplicate = error.code === "ER_DUP_ENTRY";
  const relatedRecord = ["ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2"].includes(error.code);
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
