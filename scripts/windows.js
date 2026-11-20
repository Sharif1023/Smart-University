import {
  existsSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import net from "node:net";
import pg from "pg";

const { Client } = pg;
process.chdir(fileURLToPath(new URL("../", import.meta.url)));

const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function hiddenPassword() {
  process.stdout.write("PostgreSQL administrator password: ");
  const sink = new Writable({ write(_chunk, _encoding, done) { done(); } });
  prompt.pause();
  const secret = createInterface({
    input: process.stdin,
    output: sink,
    terminal: true,
  });
  try {
    return await secret.question("");
  } finally {
    secret.close();
    process.stdout.write("\n");
  }
}

function quoteIdentifier(value) {
  if (!/^[a-z][a-z\d_]*$/.test(value))
    throw Error("Invalid generated PostgreSQL identifier.");
  return '"' + value + '"';
}

async function provisionLocalDatabase() {
  if (existsSync(".env") && statSync(".env").size > 0) {
    const previous = readFileSync(".env", "utf8");
    const oldDatabaseSettings =
      /^(?:MYSQL_ROOT_PASSWORD|POSTGRES_ADMIN_USER|POSTGRES_ADMIN_PASSWORD)=/m.test(previous) ||
      /^DB_PORT=5433$/m.test(previous);
    if (!oldDatabaseSettings) return;
    if (existsSync(".env.previous"))
      throw Error("Move or remove .env.previous before converting the saved database settings.");
    renameSync(".env", ".env.previous");
    console.log("Saved the previous database settings in .env.previous.");
  }

  console.log(
    "First launch: PostgreSQL must already be installed and running. Enter its local administrator connection details.",
  );
  const host = (await prompt.question("PostgreSQL host [127.0.0.1]: ")).trim() || "127.0.0.1";
  const port = Number((await prompt.question("PostgreSQL port [5432]: ")).trim() || 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("Invalid PostgreSQL port.");
  const adminUser = (await prompt.question("Administrator username [postgres]: ")).trim() || "postgres";
  const adminPassword = await hiddenPassword();

  let setup;
  if (existsSync(".local-setup.json")) {
    setup = JSON.parse(readFileSync(".local-setup.json", "utf8"));
    if (!/^[a-z][a-z\d_]{5,30}$/.test(setup.user) ||
        !/^smart_university_[a-f0-9]{12}$/.test(setup.database) ||
        !/^[a-f0-9]{48}$/.test(setup.password))
      throw Error("Invalid .local-setup.json file.");
  } else {
    const tag = randomBytes(6).toString("hex");
    setup = {
      user: "campus_" + tag,
      database: "smart_university_" + tag,
      password: randomBytes(24).toString("hex"),
    };
    writeFileSync(".local-setup.json", JSON.stringify(setup), {
      flag: "wx",
      mode: 0o600,
    });
  }

  const admin = new Client({
    host,
    port,
    user: adminUser,
    password: adminPassword,
    database: "postgres",
    connectionTimeoutMillis: 5000,
  });
  try {
    await admin.connect();
  } catch (error) {
    await admin.end().catch(() => {});
    throw error;
  }
  try {
    const role = quoteIdentifier(setup.user);
    const database = quoteIdentifier(setup.database);
    const existingRole = await admin.query(
      "SELECT 1 FROM pg_roles WHERE rolname=$1",
      [setup.user],
    );
    const password = "'" + setup.password + "'";
    if (existingRole.rowCount)
      await admin.query("ALTER ROLE " + role + " WITH LOGIN PASSWORD " + password);
    else
      await admin.query("CREATE ROLE " + role + " WITH LOGIN PASSWORD " + password);

    const existingDatabase = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname=$1",
      [setup.database],
    );
    if (existingDatabase.rowCount)
      await admin.query("ALTER DATABASE " + database + " OWNER TO " + role);
    else
      await admin.query("CREATE DATABASE " + database + " OWNER " + role);

    const verify = new Client({
      host,
      port,
      user: setup.user,
      password: setup.password,
      database: setup.database,
      connectionTimeoutMillis: 5000,
    });
    await verify.connect();
    await verify.end();

    const lines = [
      "PORT=4000",
      "APP_ORIGIN=http://localhost:4000",
      "DB_HOST=" + host,
      "DB_PORT=" + port,
      "DB_NAME=" + setup.database,
      "DB_USER=" + setup.user,
      "DB_PASSWORD=" + setup.password,
      "DEMO_PASSWORD=CampusDemo2026!",
      "ENABLE_PHASE4=false",
    ];
    writeFileSync(".env", lines.join("\n") + "\n", { mode: 0o600 });
    unlinkSync(".local-setup.json");
    console.log("Created the local PostgreSQL database and application role.");
  } finally {
    await admin.end();
  }
}

function run(file, args = []) {
  const result = spawnSync(process.execPath, [file, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(file + " failed. Inspect the error above and check .env.");
}

async function main() {
  const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
  if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 16))
    throw Error("Install Node.js 24 LTS and reopen this launcher.");

  await provisionLocalDatabase();
  prompt.close();
  process.loadEnvFile(".env");

  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("Invalid PORT value in .env.");
  const url = "http://localhost:" + port;
  process.env.APP_ORIGIN = url;
  process.env.HOST = "127.0.0.1";

  const probe = net.createServer();
  await new Promise((resolve, reject) =>
    probe.once("error", reject).listen(port, "127.0.0.1", resolve),
  );
  await new Promise((resolve) => probe.close(resolve));

  run("node_modules/typescript/bin/tsc", ["--noEmit"]);
  run("node_modules/vite/bin/vite.js", ["build"]);
  run("db/setup.js");

  console.log("Open " + url + " · Keep this window open. Press Ctrl+C to stop.");
  const server = spawn(process.execPath, ["server/index.js"], {
    stdio: "inherit",
    env: process.env,
  });
  const stop = () => server.kill();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  server.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(url + "/api/v1/health")).ok) {
        if (process.platform === "win32")
          spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
            stdio: "ignore",
          }).unref();
        return;
      }
    } catch {
      // The API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  stop();
  throw Error("The application did not start. Inspect the error above.");
}

main().catch((error) => {
  const message =
    error.code === "ECONNREFUSED"
      ? "Cannot connect to PostgreSQL. Start its Windows service and check the host/port."
      : error.code === "28P01"
        ? "PostgreSQL administrator login failed. Check the username and password."
        : error.code === "EADDRINUSE"
          ? "Port " + (process.env.PORT || 4000) + " is in use. Change PORT in .env and try again."
          : error.message;
  console.error(message);
  prompt.close();
  process.exitCode = 1;
});
