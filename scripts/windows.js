import { copyFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));

function runDocker() {
  const result = spawnSync("docker", ["compose", "up", "-d", "--wait"], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    if (result.error.code === "ENOENT")
      throw Error("Install Docker Desktop, start it, then run this launcher again.");
    throw result.error;
  }
  if (result.status !== 0)
    throw Error("PostgreSQL did not start. Check Docker Desktop and compose.yaml.");
}

function run(file, args = []) {
  const result = spawnSync(process.execPath, [file, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(file + " failed. Check the PostgreSQL settings in .env.");
}

async function main() {
  const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
  if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 16))
    throw Error("Install Node.js 24 LTS and reopen this launcher.");

  if (!existsSync(".env") || statSync(".env").size === 0) {
    copyFileSync(".env.example", ".env");
    console.log("Created .env with local development settings.");
  }
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
  runDocker();
  run("db/migrate.js");
  run("db/seed.js");

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
  console.error(
    error.code === "EADDRINUSE"
      ? "Port " + (process.env.PORT || 4000) + " is in use. Change PORT in .env and try again."
      : error.message,
  );
  process.exitCode = 1;
});
