import pg from "pg";

const { Pool, types } = pg;

// Keep PostgreSQL date values as database strings so API responses retain their
// academic calendar date and timestamp instead of inheriting the host timezone.
types.setTypeParser(1082, (value) => value); // date
types.setTypeParser(1114, (value) => value.replace(/(\.\d{3})\d+$/, "$1")); // timestamp without time zone
types.setTypeParser(20, (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : value;
}); // bigint/count

const client = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "smart_university",
  user: process.env.DB_USER || "campus",
  password: process.env.DB_PASSWORD || "local-campus-dev",
  max: 8,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  application_name: "smart-university-erp",
  options: "-c timezone=UTC",
});
client.on("error", (error) => {
  console.error("PostgreSQL pool connection error:", error.code || error.name);
});

const idColumnCache = new Map();

function bindParameters(sql) {
  let result = "";
  let parameter = 0;
  let quote = "";
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const current = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      result += current;
      if (current === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      result += current;
      if (current === "*" && next === "/") {
        result += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }
    if (quote) {
      result += current;
      if (current === quote && next === quote) {
        result += next;
        index += 1;
      } else if (current === quote && sql[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (current === "-" && next === "-") {
      result += "--";
      index += 1;
      lineComment = true;
    } else if (current === "/" && next === "*") {
      result += "/*";
      index += 1;
      blockComment = true;
    } else if (current === "'" || current === '"') {
      result += current;
      quote = current;
    } else if (current === "?") {
      result += "$" + ++parameter;
    } else {
      result += current;
    }
  }
  return result;
}

async function hasIdColumn(connection, table) {
  if (!idColumnCache.has(table)) {
    const result = await connection.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = 'id') AS present",
      [table],
    );
    idColumnCache.set(table, result.rows[0]?.present === true);
  }
  return idColumnCache.get(table);
}

async function run(connection, sql, params = []) {
  if (!Array.isArray(params)) params = [params];
  let statement = bindParameters(sql);
  const isInsert = /^\s*INSERT\s+INTO\s+([a-z_][a-z\d_]*)\b/i.exec(sql);
  if (
    isInsert &&
    !/\bRETURNING\b/i.test(statement) &&
    (await hasIdColumn(connection, isInsert[1].toLowerCase()))
  )
    statement += " RETURNING id";

  const values = params.map((value) =>
    typeof value === "boolean" ? Number(value) : value,
  );
  const result = await connection.query(statement, values);
  const fields = result.fields ?? [];

  if (result.command === "SELECT") return [result.rows, fields];
  return [
    {
      insertId: result.rows?.[0]?.id ?? null,
      affectedRows: result.rowCount ?? 0,
      rows: result.rows ?? [],
    },
    fields,
  ];
}

function wrapConnection(connection) {
  return {
    query: (sql, params) => run(connection, sql, params),
    execute: (sql, params) => run(connection, sql, params),
    beginTransaction: () => connection.query("BEGIN"),
    commit: () => connection.query("COMMIT"),
    rollback: () => connection.query("ROLLBACK"),
    release: () => connection.release(),
    destroy: () => connection.release(true),
  };
}

export const pool = {
  query: (sql, params) => run(client, sql, params),
  execute: (sql, params) => run(client, sql, params),
  getConnection: async () => wrapConnection(await client.connect()),
  end: () => client.end(),
};

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
