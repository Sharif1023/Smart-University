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
const requestedPort = Number(process.env.PORT || 4000);
if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535)
  throw Error("PORT in .env must be between 1 and 65535.");
const host = process.env.HOST || "127.0.0.1";
let server;
let port = requestedPort;
for (let attempt = 0; attempt < 20; attempt += 1, port += 1) {
  try {
    server = await new Promise((resolve, reject) => {
      const candidate = app.listen(port, host);
      candidate.once("listening", () => resolve(candidate));
      candidate.once("error", reject);
    });
    break;
  } catch (error) {
    if (error.code !== "EADDRINUSE" || attempt === 19) throw error;
  }
}
process.env.PORT = String(port);
const defaultOrigins = [
  `http://localhost:${requestedPort}`,
  `http://127.0.0.1:${requestedPort}`,
];
if (!process.env.APP_ORIGIN || defaultOrigins.includes(process.env.APP_ORIGIN))
  process.env.APP_ORIGIN = `http://localhost:${port}`;
if (port !== requestedPort)
  console.log(`Port ${requestedPort} is busy; using ${port} instead.`);
console.log(`Campus API ready at http://localhost:${port}`);
for (const sig of ["SIGINT", "SIGTERM"])
  process.on(sig, () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    }),
  );
