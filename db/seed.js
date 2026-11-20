import {enrichSeed,seedHistories} from "./configure.js";
import {seedThirty} from "./seed30.js";
import {setupDemo} from "./demo.js";
import { pool, transaction } from "../server/db.js";
import { hashPassword } from "../server/security.js";
if (
  process.env.NODE_ENV === "production" ||
  (process.env.DEMO_PASSWORD || "").length < 12
)
  throw Error("Set a development DEMO_PASSWORD of at least 12 characters.");
const hash = await hashPassword(process.env.DEMO_PASSWORD);
try {
  await transaction(async (db) => {
    for (const [role, name] of Object.entries({
      ADMIN: "Samira Rahman",
      STUDENT: "Ayesha Islam",
      TEACHER: "Farhan Ahmed",
      ADVISOR: "Nadia Karim",
      ACCOUNTS_OFFICER: "Reza Hasan",
      LIBRARIAN: "Ishrat Ali",
      THESIS_SUPERVISOR: "Arif Chowdhury",
    })) {
      await db.execute(
        "INSERT INTO users(email,name,role,password_hash) VALUES (?,?,?,?) ON CONFLICT (email) DO NOTHING",
        [role.toLowerCase() + "@campus.test", name, role, hash],
      );
    }
    await db.query(
      "INSERT INTO departments(code,name) VALUES ('CSE','Computer Science & Engineering'),('EEE','Electrical & Electronic Engineering') ON CONFLICT (code) DO NOTHING",
    );
    await db.query(
      "INSERT INTO programs(code,name,department_id,credits) SELECT 'BCSE','B.Sc. in Computer Science & Engineering',id,160 FROM departments WHERE code='CSE' ON CONFLICT (code) DO NOTHING",
    );
    await db.query(
      "INSERT INTO academic_years(code,name,starts_on,ends_on) VALUES ('AY26','Academic year 2026–27','2026-07-01','2027-06-30') ON CONFLICT (code) DO NOTHING",
    );
    await db.query(
      "INSERT INTO semesters(code,name,year_id,starts_on,ends_on,opens_on,closes_on,drop_on) SELECT 'F26','Fall 2026',id,'2026-09-01','2026-12-31','2026-08-01','2026-09-07','2026-09-15' FROM academic_years WHERE code='AY26' ON CONFLICT (code) DO NOTHING",
    );
    await db.query(
      "INSERT INTO courses(code,name,department_id,credits) SELECT 'CSE101','Introduction to Computing',id,3 FROM departments WHERE code='CSE' ON CONFLICT (code) DO NOTHING",
    );
    await db.query(
      "INSERT INTO students(user_id,student_no,program_id,batch) SELECT u.id,'2026-CSE-001',p.id,'2026' FROM users u JOIN programs p ON p.code='BCSE' WHERE u.email='student@campus.test' ON CONFLICT (user_id) DO NOTHING",
    );
    await setupDemo(db,hash);
    await seedThirty(db,hash);
    await enrichSeed(db);
    await seedHistories(db);
  });
  console.log("Demo data ready.");
} finally {
  await pool.end();
}
