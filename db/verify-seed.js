import { pool } from "../server/db.js";

const expectedRoles = [
  "ADMIN",
  "STUDENT",
  "TEACHER",
  "ADVISOR",
  "THESIS_SUPERVISOR",
  "ACCOUNTS_OFFICER",
  "LIBRARIAN",
];

try {
  const [tables] = await pool.query(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name",
  );
  const counts = {};
  for (const { name } of tables) {
    const [[row]] = await pool.query(
      "SELECT COUNT(*) AS n FROM `" + name.replaceAll("`", "``") + "`",
    );
    counts[name] = Number(row.n);
  }

  const [demoUsers] = await pool.query(
    "SELECT role,COUNT(*) AS total FROM users WHERE email LIKE '%@demo.campus.test' GROUP BY role",
  );
  const roleCounts = Object.fromEntries(
    demoUsers.map(({ role, total }) => [role, Number(total)]),
  );
  const missingRoles = expectedRoles.filter((role) => roleCounts[role] !== 30);
  const [[coreUsers]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE email IN ('admin@campus.test','student@campus.test','teacher@campus.test','advisor@campus.test','accounts_officer@campus.test','librarian@campus.test','thesis_supervisor@campus.test')",
  );

  if (missingRoles.length || Number(coreUsers.total) !== 7)
    throw Error(
      "Seed check failed. Missing or incomplete demo roles: " +
        (missingRoles.join(", ") || "core accounts"),
    );

  console.log(
    JSON.stringify({ tables: counts, demoAccountsByRole: roleCounts }, null, 2),
  );
} finally {
  await pool.end();
}
