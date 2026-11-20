import {syncPermissions,normalizeResources} from "./configure.js";
import {mapLegacy} from "./blueprint-data.js";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pool } from "../server/db.js";
const db = await pool.getConnection();
try {
  const [[lock]] = await db.query(
    "SELECT pg_try_advisory_lock(hashtext(current_database() || '.migrate')) AS acquired",
  );
  if (!lock.acquired) throw Error("Another migration is running");
  await db.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(100) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
  );
  for (const name of ["001_foundation.sql","002_operations.sql","003_teaching_finance.sql","004_blueprint.sql","005_catalog_details.sql","006_resource_history.sql"]) {
    const sql = await readFile(new URL(name, import.meta.url), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const [[applied]] = await db.execute(
      "SELECT checksum FROM schema_migrations WHERE name=?",
      [name],
    );
    if (applied && applied.checksum !== checksum)
      throw Error("Applied migration changed: " + name);
    if (applied) continue;
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.query(statement);
    if(name==="004_blueprint.sql"){await db.beginTransaction();try{await mapLegacy(db);await db.commit();}catch(e){await db.rollback();throw e;}}
    if(name==="006_resource_history.sql")await normalizeResources(db);
    await db.execute(
      "INSERT INTO schema_migrations(name,checksum) VALUES (?,?)",
      [name, checksum],
    );
    console.log("Applied", name);
  }
  await syncPermissions(db);
} finally {
  try {
    await db.query(
      "SELECT pg_advisory_unlock(hashtext(current_database() || '.migrate'))",
    );
  } finally {
    db.release();
    await pool.end();
  }
}
