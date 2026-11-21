import app from "./app.js";
import { pool } from "./db.js";
try {
  await pool.query("SELECT 1");
  const [[schema]] = await pool.query(
    "SELECT COUNT(*) AS ready FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='users'",
  );
  if (Number(schema.ready) !== 1)
    throw Error("Database schema is not initialized. Run `npm.cmd run db:setup` first.");
} catch (error) {
  console.error("MySQL connection or schema check failed:", error.message);
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
