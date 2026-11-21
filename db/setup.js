import { readFile } from "node:fs/promises";
import { pool } from "../server/db.js";
import { hashPassword } from "../server/security.js";

async function runSqlFile(connection, url) {
  const source = await readFile(url, "utf8");
  let delimiter = ";";
  let pending = "";

  for (const line of source.split(/\r?\n/)) {
    const command = /^\s*DELIMITER\s+(\S+)\s*$/i.exec(line);
    if (command) {
      delimiter = command[1];
      continue;
    }
    pending += line + "\n";

    let boundary;
    while ((boundary = pending.indexOf(delimiter)) >= 0) {
      const statement = pending.slice(0, boundary).trim();
      pending = pending.slice(boundary + delimiter.length);
      if (statement) await connection.query(statement);
    }
  }

  if (pending.trim()) await connection.query(pending.trim());
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
const connection = await pool.getConnection();
try {
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
  await connection.rollback().catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  connection.release();
  await pool.end();
}
