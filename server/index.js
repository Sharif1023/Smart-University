import app from "./app.js";
import { pool } from "./db.js";
try {
  await pool.query("SELECT 1");
} catch (error) {
  console.error("PostgreSQL connection failed:", error.message);
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
