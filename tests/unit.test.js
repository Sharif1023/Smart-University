import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "../server/catalog.js";
import { hashPassword, verifyPassword, digest } from "../server/security.js";
const base = { code: " CSE ", name: "Computing", active: true };
test("catalog accepts normalized fields", () =>
  assert.equal(validate("departments", base).code, "CSE"));
test("extra fields cannot be written", () =>
  assert.throws(() => validate("departments", { ...base, role: "ADMIN" })));
test("strict booleans and positive credits", () => {
  assert.throws(() => validate("departments", { ...base, active: "false" }));
  assert.throws(() =>
    validate("courses", { ...base, department_id: 1, credits: -5 }),
  );
});
test("rejects impossible dates and reversed windows", () => {
  for (const [start, end] of [
    ["2026-02-30", "2026-03-01"],
    ["2027-01-01", "2026-12-31"],
  ])
    assert.throws(() =>
      validate("academic_years", { ...base, starts_on: start, ends_on: end }),
    );
});
test("salted hashes distinguish valid and invalid passwords", async () => {
  const a = await hashPassword("good password"),
    b = await hashPassword("good password");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("good password", a), true);
  assert.equal(await verifyPassword("wrong", a), false);
  assert.equal(digest("abc").length, 64);
});
