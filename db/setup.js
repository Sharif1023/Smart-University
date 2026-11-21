import { readFile } from "node:fs/promises";
import { pool } from "../server/db.js";
import { hashPassword } from "../server/security.js";
import { parseSqlStatements } from "./sql-statements.js";

async function runSqlFile(connection, url) {
  const source = await readFile(url, "utf8");
  for (const [index, statement] of parseSqlStatements(source).entries()) {
    try {
      await connection.query(statement);
    } catch (error) {
      error.scriptFile = url.pathname.split("/").at(-1);
      error.statementNumber = index + 1;
      throw error;
    }
  }
}

const schemaOnly = process.argv.includes("--schema-only");
const seedOnly = process.argv.includes("--seed-only");
const demoPassword = process.env.DEMO_PASSWORD;
let demoPasswordHash;
if (!schemaOnly && demoPassword) {
  if (demoPassword.length < 12 || demoPassword.length > 256)
    throw Error("DEMO_PASSWORD must be 12–256 characters before seeding.");
  demoPasswordHash = await hashPassword(demoPassword);
}
let connection;
try {
  connection = await pool.getConnection();
  if (!seedOnly) {
    console.log("Applying db/schema.sql …");
    await runSqlFile(connection, new URL("./schema.sql", import.meta.url));
  }
  if (!schemaOnly) {
    if (demoPasswordHash)
      await connection.execute("SET @campus_demo_password_hash=?", [
        demoPasswordHash,
      ]);
    console.log("Applying db/seed.sql …");
    await runSqlFile(connection, new URL("./seed.sql", import.meta.url));
  }
  console.log(
    schemaOnly
      ? "MySQL schema is ready."
      : seedOnly
        ? "MySQL demo seed is ready."
        : "MySQL schema and demo seed are ready.",
  );
} catch (error) {
  if (connection) await connection.rollback().catch(() => {});
  const message =
    error.code === "ER_ACCESS_DENIED_ERROR"
      ? "MySQL rejected DB_USER/DB_PASSWORD. Check those values in .env; keep DB_PASSWORD= if your local account has no password."
      : error.code === "ECONNREFUSED"
        ? "Cannot connect to MySQL. Start its Windows service and check DB_HOST/DB_PORT in .env."
        : error.message;
  const location = error.scriptFile
    ? ` (${error.scriptFile}, statement ${error.statementNumber})`
    : "";
  console.error("Database setup failed" + location + ":", message);
  process.exitCode = 1;
} finally {
  connection?.release();
  await pool.end();
}
