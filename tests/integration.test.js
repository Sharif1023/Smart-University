import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import app from "../server/app.js";
import { pool } from "../server/db.js";
if (
  !process.env.DB_NAME?.endsWith("_test") ||
  process.env.NODE_ENV === "production"
)
  throw Error("Use a dedicated seeded database with a name ending in _test.");
const server = app.listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const base = "http://127.0.0.1:" + server.address().port + "/api/v1";
const ids = [];
after(async () => {
  for (const [table, id] of ids.reverse())
    await pool.execute("DELETE FROM " + table + " WHERE id=?", [id]);
  await new Promise((r) => server.close(r));
  await pool.end();
});
function req(path, method = "GET", body, cookie) {
  return fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function login(role) {
  const res = await req("/auth/login", "POST", {
    email: role + "@campus.test",
    password: process.env.DEMO_PASSWORD,
  });
  assert.equal(res.status, 200);
  return res.headers.get("set-cookie").split(";")[0];
}
test("real database, authenticated navigation data, permissions and persisted catalog workflow", async () => {
  assert.equal((await req("/health")).status, 200);
  assert.equal((await req("/auth/me")).status, 401);
  assert.equal(
    (
      await req("/auth/login", "POST", {
        email: "student@campus.test",
        password: "wrong",
      })
    ).status,
    401,
  );
  const admin = await login("admin"),
    student = await login("student");
  assert.equal(
    (await (await req("/auth/me", "GET", undefined, admin)).json()).data.role,
    "ADMIN",
  );
  const profile = (
    await (await req("/profile?user_id=1", "GET", undefined, student)).json()
  ).data;
  assert.equal(profile.student_no, "2026-CSE-001");
  assert.equal(profile.role, "STUDENT");
  assert.equal(
    (await req("/catalog/departments", "GET", undefined, student)).status,
    403,
  );
  const code = randomUUID().slice(0, 8);
  const entry = { code, name: "Science", active: true };
  assert.equal(
    (await req("/catalog/departments", "POST", entry, student)).status,
    403,
  );
  async function create(table, body) {
    const r = await req("/catalog/" + table, "POST", body, admin);
    assert.equal(r.status, 201, await r.clone().text());
    const { data } = await r.json();
    ids.push([table, data.id]);
    return data.id;
  }
  const department = await create("departments", entry);
  assert.equal(
    (await req("/catalog/departments", "POST", entry, admin)).status,
    409,
  );
  await create("programs", {
    ...entry,
    department_id: department,
    credits: 150,
  });
  await create("courses", { ...entry, department_id: department, credits: 3 });
  const year = await create("academic_years", {
    ...entry,
    starts_on: "2026-01-01",
    ends_on: "2026-12-31",
  });
  const semester = {
    ...entry,
    year_id: year,
    starts_on: "2026-05-01",
    ends_on: "2026-07-31",
    opens_on: "2026-04-01",
    closes_on: "2026-05-07",
    drop_on: "2026-05-15",
  };
  await create("semesters", semester);
  assert.equal(
    (
      await req(
        "/catalog/semesters",
        "POST",
        { ...semester, ends_on: "2027-07-31" },
        admin,
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await req(
        "/catalog/departments/" + department,
        "PUT",
        { ...entry, active: false },
        admin,
      )
    ).status,
    200,
  );
  const list = await (
    await req(
      "/catalog/departments?active=0&q=" + code,
      "GET",
      undefined,
      admin,
    )
  ).json();
  assert.equal(list.data[0].active, 0);
  assert.equal(list.meta.total, 1);
  const [[audit]] = await pool.execute(
    "SELECT COUNT(*) AS n FROM audit_logs WHERE resource='departments' AND record_id=?",
    [department],
  );
  assert.equal(audit.n, 2);
  assert.equal((await req("/auth/logout", "POST", {}, student)).status, 200);
  assert.equal((await req("/profile", "GET", undefined, student)).status, 401);
  await req("/auth/logout", "POST", {}, admin);
});
test("password change revokes other sessions and disabling an account blocks reuse", async () => {
  const email = "probe-" + randomUUID() + "@campus.test";
  const [created] = await pool.execute(
    "INSERT INTO users(name,email,role,password_hash) SELECT 'Session test',?,'STUDENT',password_hash FROM users WHERE email='student@campus.test'",
    [email],
  );
  const password = process.env.DEMO_PASSWORD;
  async function signIn(p) {
    return req("/auth/login", "POST", { email, password: p });
  }
  try {
    const a = (await signIn(password)).headers.get("set-cookie").split(";")[0];
    const b = (await signIn(password)).headers.get("set-cookie").split(";")[0];
    const changed = randomUUID();
    assert.equal(
      (
        await req(
          "/auth/password",
          "POST",
          { currentPassword: password, newPassword: changed },
          a,
        )
      ).status,
      200,
    );
    for (const token of [a, b])
      assert.equal(
        (await req("/auth/me", "GET", undefined, token)).status,
        401,
      );
    assert.equal((await signIn(password)).status, 401);
    const last = (await signIn(changed)).headers
      .get("set-cookie")
      .split(";")[0];
    await pool.execute("UPDATE users SET active=0 WHERE id=?", [
      created.insertId,
    ]);
    assert.equal((await req("/auth/me", "GET", undefined, last)).status, 401);
    assert.equal((await signIn(changed)).status, 401);
  } finally {
    await pool.execute("DELETE FROM audit_logs WHERE actor_id=?", [
      created.insertId,
    ]);
    await pool.execute("DELETE FROM users WHERE id=?", [created.insertId]);
  }
});
