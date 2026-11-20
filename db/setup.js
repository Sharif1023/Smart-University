import { spawnSync } from "node:child_process";

for (const script of ["db/migrate.js", "db/seed.js"]) {
  console.log("\n> Database setup: " + script);
  const result = spawnSync(
    process.execPath,
    ["--env-file-if-exists=.env", script],
    { stdio: "inherit", env: process.env },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
