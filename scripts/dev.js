import { spawn } from "node:child_process";
const children = [
  ["--env-file-if-exists=.env", "--watch", "server/index.js"],
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"],
].map((args) => spawn(process.execPath, args, { stdio: "inherit" }));
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill());
  process.exitCode = code;
}
children.forEach((c) => c.on("exit", (code) => stop(code ?? 1)));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
