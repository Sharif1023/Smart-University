import { Router } from "express";
import { pool, transaction } from "./db.js";
import { fail } from "./security.js";
export const models = {
  departments: [],
  programs: ["department_id", "credits"],
  academic_years: ["starts_on", "ends_on"],
  semesters: [
    "year_id",
    "starts_on",
    "ends_on",
    "opens_on",
    "closes_on",
    "drop_on",
  ],
  courses: ["department_id", "credits"],
};
const parents = { department_id: "departments", year_id: "academic_years" };
const invalid = (message) => fail(422, "INVALID_INPUT", message);
export function validate(model, input) {
  const keys = ["code", "name", ...models[model], "active"];
  if (!input || Object.keys(input).some((k) => !keys.includes(k)))
    invalid("Unexpected fields.");
  const values = {};
  for (const field of keys) {
    const v = input[field];
    if (field === "active") {
      if (typeof v !== "boolean") invalid("Choose an active status.");
      values[field] = v;
    } else if (field === "code" || field === "name") {
      if (
        typeof v !== "string" ||
        !v.trim() ||
        v.trim().length > (field === "code" ? 24 : 140)
      )
        invalid("Enter a valid " + field + ".");
      values[field] = v.trim();
    } else if (field.endsWith("_on")) {
      if (
        typeof v !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
        !Number.isFinite(Date.parse(v)) ||
        new Date(v).toISOString().slice(0, 10) !== v ||
        v < "1000-01-01"
      )
        invalid("Enter a valid date.");
      values[field] = v;
    } else {
      if (
        typeof v !== "number" ||
        !Number.isFinite(v) ||
        v <= 0 ||
        (field === "credits"
          ? v > 999 || !Number.isInteger(v * 10)
          : !Number.isSafeInteger(v))
      )
        invalid("Enter a valid " + field + ".");
      values[field] = v;
    }
  }
  if (
    values.starts_on > values.ends_on ||
    values.opens_on > values.closes_on ||
    values.closes_on > values.drop_on ||
    values.drop_on > values.ends_on
  )
    invalid("Check the order of the academic dates.");
  return values;
}
export function catalogRouter() {
  const router = Router();
  router.use("/:model", (req, res, next) => {
    if (!Object.hasOwn(models, req.params.model))
      return fail(404, "NOT_FOUND", "Unknown collection.");
    if (req.user.role !== "ADMIN")
      return fail(403, "FORBIDDEN", "Administrator access required.");
    next();
  });
  router.get("/:model", async (req, res) => {
    const { model } = req.params;
    const page = Number(req.query.page ?? 1),
      pageSize = Number(req.query.pageSize ?? 10);
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    )
      invalid("Invalid page.");
    const search = "%" + String(req.query.q || req.query.search || "").slice(0, 140) + "%";
    const active = req.query.active;
    if (active !== undefined && !["0", "1"].includes(active))
      invalid("Invalid status filter.");
    const where =
      " WHERE (name ILIKE ? OR code ILIKE ?)" +
      (active === undefined ? "" : " AND active=?");
    const args =
      active === undefined ? [search, search] : [search, search, active];
    const [[{ total }]] = await pool.execute(
      "SELECT COUNT(*) AS total FROM " + model + where,
      args,
    );
    const [data] = await pool.execute(
      "SELECT * FROM " +
        model +
        where +
        " ORDER BY id DESC LIMIT " +
        pageSize +
        " OFFSET " +
        (page - 1) * pageSize,
      args,
    );
    res.json({ data, meta: { page, pageSize, total } });
  });
  async function save(req, res) {
    const { model } = req.params;
    const update = req.method === "PUT";
    const values = validate(model, req.body);
    const id = await transaction(async (db) => {
      // Lock the parent year before child writes so date constraints survive concurrent edits.
      for (const [field, parent] of Object.entries(parents))
        if (field in values) {
          const [[record]] = await db.execute(
            "SELECT * FROM " + parent + " WHERE id=? FOR UPDATE",
            [values[field]],
          );
          if (!record) invalid("Parent record does not exist.");
          if (
            field === "year_id" &&
            (values.starts_on < record.starts_on ||
              values.ends_on > record.ends_on)
          )
            invalid("Semester dates must fit the academic year.");
        }
      let recordId;
      if (update) {
        recordId = Number(req.params.id);
        if (!Number.isSafeInteger(recordId) || recordId < 1)
          invalid("Invalid identifier.");
        const [[row]] = await db.execute(
          "SELECT id FROM " + model + " WHERE id=? FOR UPDATE",
          [recordId],
        );
        if (!row) fail(404, "NOT_FOUND", "Record not found.");
        if (model === "academic_years") {
          const [[outside]] = await db.execute(
            "SELECT id FROM semesters WHERE year_id=? AND (starts_on<? OR ends_on>?) LIMIT 1",
            [recordId, values.starts_on, values.ends_on],
          );
          if (outside)
            invalid("An existing semester falls outside these dates.");
        }
        await db.execute(
          "UPDATE " +
            model +
            " SET " +
            Object.keys(values)
              .map((k) => k + "=?")
              .join(",") +
            " WHERE id=?",
          [...Object.values(values), recordId],
        );
      } else {
        const [result] = await db.execute(
          "INSERT INTO " +
            model +
            " (" +
            Object.keys(values).join(",") +
            ") VALUES (" +
            Object.keys(values)
              .map(() => "?")
              .join(",") +
            ")",
          Object.values(values),
        );
        recordId = result.insertId;
      }
      await db.execute(
        "INSERT INTO audit_logs(actor_id,action,resource,record_id) VALUES (?,?,?,?)",
        [req.user.id, update ? "UPDATE" : "CREATE", model, recordId],
      );
      return recordId;
    });
    res.status(update ? 200 : 201).json({ data: { id } });
  }
  router.post("/:model", save);
  router.put("/:model/:id", save);
  return router;
}
