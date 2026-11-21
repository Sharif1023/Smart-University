import { readFile } from "node:fs/promises";
import { pool } from "../server/db.js";
import { parseSqlStatements } from "./sql-statements.js";

const mode = process.argv[2];
const files = {
  schema: new URL("./updates/2026-semester-portal-schema.sql", import.meta.url),
  seed: new URL("./seeds/2026-semester-portal.sql", import.meta.url),
};

if (!["schema", "seed", "all"].includes(mode)) {
  console.error("Choose schema, seed, or all.");
  process.exitCode = 2;
} else {
  let connection;
  try {
    connection = await pool.getConnection();
    const apply = async (kind) => {
      const url = files[kind];
      console.log("Applying " + url.pathname.split("/").at(-1) + " …");
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
    };
    if (mode === "schema" || mode === "all") await apply("schema");
    if (mode === "seed" || mode === "all") await apply("seed");
    console.log("Semester portal update is ready.");
  } catch (error) {
    const location = error.scriptFile
      ? " (" + error.scriptFile + ", statement " + error.statementNumber + ")"
      : "";
    console.error("Semester portal update failed" + location + ":", error.message);
    process.exitCode = 1;
  } finally {
    connection?.release();
    await pool.end();
  }
}
