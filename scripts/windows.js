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
import mysql from "mysql2/promise";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const prompt = createInterface({ input: process.stdin, output: process.stdout });

async function hiddenPassword() {
  process.stdout.write("MySQL administrator password: ");
  const sink = new Writable({ write(_chunk, _encoding, done) { done(); } });
  prompt.pause();
  const secret = createInterface({ input: process.stdin, output: sink, terminal: true });
  try {
    return await secret.question("");
  } finally {
    secret.close();
    process.stdout.write("\n");
  }
}

function quoteIdentifier(value) {
  if (!/^[a-z][a-z\d_]*$/.test(value))
    throw Error("Invalid generated MySQL identifier.");
  return "`" + value + "`";
}

function quoteAccount(value, host) {
  if (!/^[a-z][a-z\d_]*$/.test(value))
    throw Error("Invalid generated MySQL account.");
  return "'" + value + "'@'" + host + "'";
}

async function provisionLocalDatabase() {
  let demoPasswordSetting = "DEMO_PASSWORD=CampusDemo2026!";
  if (existsSync(".env") && statSync(".env").size > 0) {
    const previous = readFileSync(".env", "utf8");
    demoPasswordSetting =
      previous.split(/\r?\n/).find((line) => /^DEMO_PASSWORD=/.test(line)) ||
      demoPasswordSetting;
    const oldDatabaseSettings =
      /^(?:POSTGRES_[A-Z0-9_]+|MYSQL_ROOT_PASSWORD)=/m.test(previous) ||
      /^DB_PORT=543[23]\s*$/m.test(previous);
    if (!oldDatabaseSettings) return;
    if (existsSync(".env.previous"))
      throw Error("Move or remove .env.previous before converting the saved database settings.");
    renameSync(".env", ".env.previous");
    console.log("Saved the previous database settings in .env.previous.");
  }

  console.log(
    "First launch: MySQL Server must already be installed and running. Enter its local administrator connection details.",
  );
  const host = (await prompt.question("MySQL host [127.0.0.1]: ")).trim() || "127.0.0.1";
  const port = Number((await prompt.question("MySQL port [3306]: ")).trim() || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("Invalid MySQL port.");
  const adminUser = (await prompt.question("Administrator username [root]: ")).trim() || "root";
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

  const admin = await mysql.createConnection({
    host,
    port,
    user: adminUser,
    password: adminPassword,
    database: "mysql",
    connectTimeout: 5000,
  });
  try {
    const database = quoteIdentifier(setup.database);
    await admin.query(
      "CREATE DATABASE IF NOT EXISTS " + database +
        " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    );
    for (const accountHost of ["localhost", "127.0.0.1"]) {
      const account = quoteAccount(setup.user, accountHost);
      const password = "'" + setup.password + "'";
      await admin.query("CREATE USER IF NOT EXISTS " + account + " IDENTIFIED BY " + password);
      await admin.query("ALTER USER " + account + " IDENTIFIED BY " + password);
      await admin.query("GRANT ALL PRIVILEGES ON " + database + ".* TO " + account);
    }

    const verify = await mysql.createConnection({
      host,
      port,
      user: setup.user,
      password: setup.password,
      database: setup.database,
      connectTimeout: 5000,
      timezone: "+06:00",
      dateStrings: true,
    });
    await verify.query("SELECT 1");
    await verify.end();

    const lines = [
      "PORT=4000",
      "APP_ORIGIN=http://localhost:4000",
      "DB_HOST=127.0.0.1",
      "DB_PORT=" + port,
      "DB_NAME=" + setup.database,
      "DB_USER=" + setup.user,
      "DB_PASSWORD=" + setup.password,
      demoPasswordSetting,
      "ENABLE_PHASE4=false",
    ];
    writeFileSync(".env", lines.join("\n") + "\n", { mode: 0o600 });
    unlinkSync(".local-setup.json");
    console.log("Created the local MySQL database and restricted application account.");
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
      ? "Cannot connect to MySQL. Start its Windows service and check the host/port."
      : error.code === "ER_ACCESS_DENIED_ERROR"
        ? "MySQL administrator login failed. Check the username and password."
        : error.code === "EADDRINUSE"
          ? "Port " + (process.env.PORT || 4000) + " is in use. Change PORT in .env and try again."
          : error.message;
  console.error(message);
  prompt.close();
  process.exitCode = 1;
});
