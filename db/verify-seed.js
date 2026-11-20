import { pool } from "../server/db.js";
const exempt = new Set([
  "schema_migrations",
  "release_seeds",
  "workflow_lock",
  "sessions",
  "campus_settings",
]);
try {
  const [tables] = await pool.query(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE' ORDER BY table_name",
  );
  const counts = {};
  for (const { name } of tables) {
    if (exempt.has(name)) continue;
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS n FROM "' + name.replaceAll('"', '""') + '"',
    );
    counts[name] = Number(row.n);
  }
  const [roles] = await pool.query(
    "SELECT role,COUNT(*) n FROM users WHERE email LIKE '%@demo.campus.test' GROUP BY role",
  );
  for (const r of roles) counts["role." + r.role] = Number(r.n);
  if (roles.length !== 7 || Object.values(counts).some((n) => n < 30))
    throw Error("Seed minimum failed: " + JSON.stringify(counts));
  console.log(JSON.stringify(counts, null, 2));
} finally {
  await pool.end();
}
