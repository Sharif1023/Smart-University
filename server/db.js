import mysql from "mysql2/promise";

const client = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || "smart_university",
  user: process.env.DB_USER || "campus",
  password: process.env.DB_PASSWORD ?? "local-campus-dev",
  waitForConnections: true,
  connectionLimit: 8,
  queueLimit: 0,
  connectTimeout: 5000,
  timezone: "+06:00",
  dateStrings: true,
  decimalNumbers: true,
});

client.on("connection", (connection) => {
  connection.query("SET time_zone = '+06:00'");
});

client.on("enqueue", () => {
  console.warn("MySQL pool is waiting for an available connection.");
});

export const pool = client;

export async function transaction(fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    throw error;
  } finally {
    connection.release();
  }
}
