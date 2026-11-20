import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
export const digest = (token) =>
  createHash("sha256").update(token).digest("hex");
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt, 64, options);
  return salt + "." + hash.toString("hex");
}
export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(".");
  const candidate = await derive(password, salt, 64, options);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}
export function fail(status, code, message) {
  throw Object.assign(new Error(message), { status, code });
}
