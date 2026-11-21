import test from "node:test";
import assert from "node:assert/strict";
import { validate } from "../server/catalog.js";
import { hashPassword, verifyPassword, digest } from "../server/security.js";
import { isIsoDate, isLocalTime, isSupportedProfileImage } from "../server/validation.js";
import { parseSqlStatements } from "../db/sql-statements.js";
const base = { code: " CSE ", name: "Computing", active: true };
test("SQL loader ignores comment semicolons and preserves quoted semicolons", () => {
  const statements = parseSqlStatements(
    "-- setup note; not a statement\nCREATE TABLE sample (note VARCHAR(40));\nINSERT INTO sample VALUES ('one;two');\n",
  );
  assert.equal(statements.length, 2);
  assert.match(statements[1], /'one;two'/);
});
test("SQL loader respects custom delimiters for stored procedures", () => {
  const statements = parseSqlStatements(
    "DELIMITER $$\nCREATE PROCEDURE seed_demo()\nBEGIN\n  SELECT ';' AS marker;\n  SELECT 2;\nEND$$\nDELIMITER ;\nCALL seed_demo();",
  );
  assert.equal(statements.length, 2);
  assert.match(statements[0], /SELECT 2;/);
  assert.equal(statements[1], "CALL seed_demo()");
});
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
test("portal date and exam-time validation handles boundaries", () => {
  assert.equal(isIsoDate("2024-02-29"), true);
  assert.equal(isIsoDate("2026-02-29"), false);
  assert.equal(isLocalTime("23:59"), true);
  assert.equal(isLocalTime("24:00"), false);
});
test("profile image validation checks the declared type against file bytes", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  assert.equal(isSupportedProfileImage("image/png", png), true);
  assert.equal(isSupportedProfileImage("image/jpeg", png), false);
  assert.equal(isSupportedProfileImage("image/png", Buffer.alloc(1048577)), false);
});
test("salted hashes distinguish valid and invalid passwords", async () => {
  const a = await hashPassword("good password"),
    b = await hashPassword("good password");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("good password", a), true);
  assert.equal(await verifyPassword("wrong", a), false);
  assert.equal(digest("abc").length, 64);
});
