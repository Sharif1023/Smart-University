import { test, after } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../server/db.js";
import {
  records,
  rows,
  today,
  performance,
} from "../server/operations/records.js";
import { mutate } from "../server/operations/mutate.js";
import app from "../server/app.js";
if (
  !process.env.DB_NAME?.endsWith("_test") ||
  process.env.NODE_ENV === "production"
)
  throw Error("Use a separate seeded _test database.");
after(() => pool.end());
test("seven authenticated workspaces load and student sees only own finance and grades", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  try {
    const base = "http://127.0.0.1:" + server.address().port + "/api/v1";
    for (const role of [
      "student",
      "admin",
      "teacher",
      "advisor",
      "accounts_officer",
      "librarian",
      "thesis_supervisor",
    ]) {
      const login = await fetch(base + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: role + "@campus.test",
          password: process.env.DEMO_PASSWORD,
        }),
      });
      assert.equal(login.status, 200);
      const headers = {
        Cookie: login.headers.get("set-cookie").split(";")[0],
        "Content-Type": "application/json",
      };
      const response = await fetch(base + "/operations", { headers });
      assert.equal(response.status, 200, await response.clone().text());
      const w = (await response.json()).data;
      assert.ok(w.groups.Analytics);
      if (role === "student") {
        const response = await fetch(base + "/operations/ask", {
          method: "POST",
          headers,
          body: JSON.stringify({ question: "How much fee is due?" }),
        });
        if(process.env.ENABLE_PHASE4==="true")assert.match((await response.json()).data,/9000/);else assert.equal(response.status,404);
        assert.ok(
          w.groups.Teaching.tables[0].items.every(
            (r) => r.publication !== "Draft",
          ),
        );
        assert.equal(
          (
            await fetch(base + "/operations/action/payment", {
              method: "POST",
              headers,
              body: "{}",
            })
          ).status,
          403,
        );
      }
    }
  } finally {
    await new Promise((r) => server.close(r));
  }
});
test("registration through graduation workflows, permissions and financial invariants", async () => {
  const db = await pool.getConnection();
  await db.beginTransaction();
  try {
    const users = Object.fromEntries(
      (
        await rows(
          db,
          "SELECT id,role,name FROM users WHERE active=1 AND email=CONCAT(LOWER(role),'@campus.test')",
        )
      ).map((u) => [u.role, u]),
    );
    const apply = async (role, key, body) => {
      const u = users[role];
      await mutate(db, u, await records(db, u), [], key, body);
    };
    const student = users.STUDENT.id,
      [off] = await rows(
        db,
        "SELECT o.* FROM offerings o JOIN courses c ON c.id=o.course WHERE c.code='CSE202'",
      ),
      [book] = await rows(db, "SELECT * FROM books WHERE code='LIB-001'");
    await apply("STUDENT", "register", { offering: off.id });
    const [reg] = await rows(
      db,
      "SELECT id FROM registrations WHERE student=? AND offering=?",
      [student, off.id],
    );
    await apply("ADVISOR", "review", { reg: reg.id, status: "Approved" });
    await apply("TEACHER", "attendance", {
      reg: reg.id,
      day: today(),
      present: "Present",
    });
    await apply("TEACHER", "marks", { reg: reg.id, assessment: 90, exam: 70 });
    await apply("TEACHER", "publish", { reg: reg.id });
    await assert.rejects(
      apply("TEACHER", "marks", { reg: reg.id, assessment: 0, exam: 0 }),
    );
    await apply("ADMIN", "generate", { term: off.term });
    await assert.rejects(apply("ADMIN","release",{term:off.term}));
    await apply("ADMIN","review_routine",{term:off.term});
    await apply("ADMIN", "release", { term: off.term });
    assert.ok(
      (await records(db, users.STUDENT)).routine.some(
        (r) => r.offering === off.id,
      ),
    );
    const day = today();
    await apply("ACCOUNTS_OFFICER", "invoice", {
      student,
      label: "Test ledger",
      amount: 100,
      due: day,
    });
    const [inv] = await rows(
      db,
      "SELECT id FROM invoices WHERE label='Test ledger'",
    );
    await apply("ACCOUNTS_OFFICER", "payment", {
      invoice: inv.id,
      amount: 75,
      kind: "Payment",
      reference: "TEST-75",
    });
    await assert.rejects(
      apply("ACCOUNTS_OFFICER", "payment", {
        invoice: inv.id,
        amount: 26,
        kind: "Waiver",
        reference: "TEST-26",
      }),
    );
    await apply("LIBRARIAN", "issue", { book: book.id, student, due: day });
    const [loan] = await rows(
      db,
      "SELECT id FROM loans WHERE book=? AND student=? AND returned IS NULL",
      [book.id, student],
    );
    await apply("LIBRARIAN", "return", { loan: loan.id });
    await assert.rejects(apply("LIBRARIAN", "return", { loan: loan.id }));
    await apply("STUDENT", "topic", {
      title: "Capstone",
      proposal: "Project plan",
    });
    const [thesis] = await rows(db, "SELECT id FROM theses WHERE student=?", [
      student,
    ]);
    await apply("ADMIN", "allocate", {
      thesis: thesis.id,
      supervisor: users.THESIS_SUPERVISOR.id,
    });
    await apply("STUDENT", "progress", {
      thesis: thesis.id,
      note: "First submission",
      document: {
        name: "first.pdf",
        data: Buffer.from("%PDF-1.4\n%%EOF").toString("base64"),
      },
    });
    await apply("THESIS_SUPERVISOR", "milestone", {
      thesis: thesis.id,
      status: "In progress",
      note: "Literature review accepted",
    });
    await apply("ADMIN", "notice", {
      title: "Library only",
      body: "Inventory",
      audience: "LIBRARIAN",
      target: "0",
    });
    assert.ok(
      !(await records(db, users.STUDENT)).notices.some(
        (n) => n.title === "Library only",
      ),
    );
    const note = (await records(db, users.LIBRARIAN)).notices.find(
      (n) => n.title === "Library only",
    );
    await apply("LIBRARIAN", "read", { notice: note.id });
  } finally {
    await db.rollback();
    db.release();
  }
});
test("prediction uses prior other-student examples and reports insufficient data", () => {
  const r = {
    id: 1,
    status: "Approved",
    student: 1,
    code: "CSE200",
    attendance: 60,
    assessment: 50,
    term_start: "2026-05-01",
  };
  const h = [2, 3, 4].map((id) => ({
    id,
    student: id,
    assessment: 50,
    exam: 60,
    attendance: 60,
    term_end: "2026-04-01",
  }));
  assert.equal(performance([r], h).forecasts[0].prediction, 56);
  assert.equal(performance([r], h.slice(1)).forecasts[0].prediction, null);
});
