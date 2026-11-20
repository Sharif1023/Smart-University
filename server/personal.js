import { Router } from "express";
import { records, score } from "./operations/records.js";
import { fail } from "./security.js";
import { pool } from "./db.js";
export const personal = Router();
personal.get("/notifications/me", async (req, res) => {
  const [data] = await pool.execute(
    "SELECT id,message,seen,created FROM notifications WHERE recipient=? ORDER BY id DESC",
    [req.user.id],
  );
  res.json({ data });
});
personal.get(["/students/me", "/students/me/:area"], async (req, res) => {
  if (req.user.role !== "STUDENT")
    fail(403, "FORBIDDEN", "Student account required.");
  const d = await records(pool, req.user);
  const views = {
    profile: d.people[0] ?? null,
    attendance: d.attendance,
    results: d.regs
      .filter((r) => r.published)
      .map((r) => ({
        course: r.code,
        semester: r.semester,
        mark: score(r),
        grade: r.letter,
        points: r.grade_points,
        state: r.result_state,
      })),
    fees: d.bills,
  };
  const key = req.params.area ?? "profile";
  if (!Object.hasOwn(views, key))
    fail(404, "NOT_FOUND", "Unknown student view.");
  res.json({ data: views[key] });
});
