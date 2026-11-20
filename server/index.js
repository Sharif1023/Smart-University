import app from "./app.js";
import { pool } from "./db.js";
try {
  await pool.query("SELECT 1");
  const [[schema]] = await pool.query(
    "SELECT to_regclass('schema_migrations') IS NOT NULL AS ready",
  );
  if (!schema.ready)
    throw Error("Database schema is not initialized. Run `npm.cmd run db:setup` first.");
  const [[migrations]] = await pool.query(
    "SELECT COUNT(*) AS applied FROM schema_migrations WHERE name IN ('001_foundation.sql','002_operations.sql','003_teaching_finance.sql','004_blueprint.sql','005_catalog_details.sql','006_resource_history.sql')",
  );
  if (Number(migrations.applied) !== 6)
    throw Error("Database migrations are incomplete. Run `npm.cmd run db:setup` first.");
} catch (error) {
  console.error("Application startup failed:", error.message);
  await pool.end();
  process.exit(1);
}
const server = app.listen(Number(process.env.PORT || 4000), process.env.HOST || "127.0.0.1", () =>
  console.log("Campus API on port", server.address().port),
);
for (const sig of ["SIGINT", "SIGTERM"])
  process.on(sig, () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    }),
  );
