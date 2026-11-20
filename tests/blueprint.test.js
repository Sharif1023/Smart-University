import assert from "node:assert/strict";
import { test, after } from "node:test";
import { pool } from "../server/db.js";
import { records, rows, today } from "../server/operations/records.js";
import { mutate } from "../server/operations/mutate.js";
if (
  !process.env.DB_NAME?.endsWith("_test") ||
  process.env.NODE_ENV === "production"
)
  throw Error("Use a seeded _test database.");
after(() => pool.end());
async function fixture(fn) {
  const db = await pool.getConnection();
  await db.beginTransaction();
  try {
    const get = async (sql, ...a) => (await rows(db, sql, a))[0];
    const u = Object.fromEntries(
      (
        await rows(
          db,
          "SELECT id,role FROM users WHERE email IN ('student@campus.test','teacher@campus.test','advisor@campus.test','admin@campus.test','accounts_officer@campus.test','librarian@campus.test','thesis_supervisor@campus.test')",
        )
      ).map((x) => [x.role, x]),
    );
    const state = (role) => records(db, u[role]);
    const apply = async (role, key, data) =>
      mutate(db, u[role], await state(role), [], key, data, "test-request");
    await fn({ db, get, u, state, apply });
  } finally {
    await db.rollback();
    db.release();
  }
}
test("held sessions, excused absences, corrections, grading snapshots and publication", () =>
  fixture(async ({ get, state, apply }) => {
    const r = (await state("TEACHER")).regs.find((r) => r.code === "CSE201");
    await apply("TEACHER", "attendance", {
      reg: r.id,
      day: today(),
      present: "Excused",
      reason: "Approved absence",
    });
    await assert.rejects(
      apply("TEACHER", "attendance", {
        reg: r.id,
        day: today(),
        present: "Late",
      }),
    );
    await apply("TEACHER", "class_session", {
      offering: r.offering,
      day: today(),
      status: "Cancelled",
      reason: "Weather",
    });
    await assert.rejects(
      apply("TEACHER", "attendance", {
        reg: r.id,
        day: today(),
        present: "Present",
        reason: "Correction",
      }),
    );
    assert.equal(
      Number(
        (await state("STUDENT")).regs.find((x) => x.id === r.id).attendance,
      ),
      50,
    );
    await apply("TEACHER", "assessment", {
      offering: r.offering,
      title: "Project",
      category: "Assignment",
      maximum: 20,
      weight: 100,
      due: today(),
    });
    const a = await get(
      "SELECT id FROM assessments WHERE offering=? AND title='Project'",
      r.offering,
    );
    await assert.rejects(apply("TEACHER", "calculate", { reg: r.id }));
    await assert.rejects(
      apply("TEACHER", "assessment_mark", {
        assessment: a.id,
        reg: r.id,
        mark: 21,
      }),
    );
    await apply("TEACHER", "assessment_mark", {
      assessment: a.id,
      reg: r.id,
      mark: 15,
    });
    await apply("TEACHER", "calculate", { reg: r.id });
    assert.equal(
      (await state("STUDENT")).regs.find((x) => x.id === r.id).assessment,
      null,
    );
    const p = (await state("STUDENT")).people[0].program_id;
    await apply("ADMIN", "grade_band", {
      program: p,
      minimum: 75,
      letter: "A",
      points: 3.7,
    });
    await apply("TEACHER", "publish", { reg: r.id });
    await apply("TEACHER", "lock_result", { reg: r.id });
    assert.equal(
      (await state("STUDENT")).regs.find((x) => x.id === r.id).grade_points,
      3.7,
    );
    await assert.rejects(
      apply("TEACHER", "reopen", { reg: r.id, reason: "review" }),
    );
    await apply("ADMIN", "reopen", { reg: r.id, reason: "Moderation" });
    assert.equal(
      (await state("STUDENT")).regs.find((x) => x.id === r.id).assessment,
      null,
    );
  }));
test("credit limits, restricted approvals, catalog ownership and private notifications", () =>
  fixture(async ({ u, state, apply, db }) => {
    const s = (await state("STUDENT")).people[0],
      o = (await state("STUDENT")).offerings.find((o) => o.code === "CSE202");
    await apply("ADMIN", "policy", {
      program: s.program_id,
      credit_limit: 3,
      loan_limit: 1,
      fine_rate: 3,
      overdue: "Yes",
      degree: "Bachelor",
      duration: 4,
    });
    await assert.rejects(apply("STUDENT", "register", { offering: o.id }));
    const [other] = await rows(
      db,
      "SELECT id,role FROM users WHERE email='teacher01@demo.campus.test'",
    );
    const reg = (await state("TEACHER")).regs.find((r) => r.code === "CSE201");
    await assert.rejects(
      mutate(db, other, await records(db, other), [], "marks", {
        reg: reg.id,
        assessment: 5,
        exam: 8,
      }),
    );
    assert.ok(
      (await records(db, other)).regs.every((r) => r.teacher === other.id),
    );
    await mutate(
      db,
      u.ADMIN,
      await state("ADMIN"),
      [{ id: s.id, name: s.name, active: 1 }],
      "notice",
      {
        title: "Only for this student",
        body: "Appointment",
        audience: "User",
        target: "users-" + s.id,
      },
    );
    assert.ok(
      (await state("STUDENT")).notices.some(
        (n) => n.title === "Only for this student",
      ),
    );
    assert.ok(
      !(await records(db, other)).notices.some(
        (n) => n.title === "Only for this student",
      ),
    );
  }));
test("invoice items, pending waiver, approval, payment reversal and read scope", () =>
  fixture(async ({ state, apply }) => {
    const inv = (await state("STUDENT")).bills[0];
    await apply("ACCOUNTS_OFFICER", "add_item", {
      invoice: inv.id,
      label: "Lab supplies",
      amount: 10.25,
    });
    await apply("ACCOUNTS_OFFICER", "payment", {
      invoice: inv.id,
      amount: 10.25,
      kind: "Waiver",
      reference: "QA-W",
      reason: "Demonstration grant",
    });
    const waiver = (await state("ADMIN")).payments.find(
      (r) => r.reference === "QA-W",
    );
    assert.equal(Number((await state("STUDENT")).bills[0].balance), 9010.25);
    await apply("ADMIN", "waiver_review", {
      receipt: waiver.id,
      decision: "Approved",
      reason: "Eligibility checked",
    });
    assert.equal(Number((await state("STUDENT")).bills[0].balance), 9000);
    await apply("ACCOUNTS_OFFICER", "void_receipt", {
      receipt: waiver.id,
      reason: "Duplicate grant",
    });
    assert.equal(Number((await state("STUDENT")).bills[0].balance), 9010.25);
    const n = (await state("STUDENT")).extra.notifications[0];
    await apply("STUDENT", "acknowledge", { notification: n.id });
    assert.equal(
      Number((await state("STUDENT")).extra.notifications[0].seen),
      1,
    );
  }));
test("physical copy cannot be lent twice, borrowing policy and fine history", () =>
  fixture(async ({ state, apply }) => {
    const s = (await state("STUDENT")).people[0],
      c = (await state("LIBRARIAN")).extra.copies.find((c) => c.available);
    await apply("ADMIN", "policy", {
      program: s.program_id,
      credit_limit: 24,
      loan_limit: 1,
      fine_rate: 5,
      overdue: "Yes",
      degree: "Bachelor",
      duration: 4,
    });
    await apply("LIBRARIAN", "issue_copy", {
      copy: c.id,
      student: s.id,
      due: today(),
    });
    await assert.rejects(
      apply("LIBRARIAN", "issue_copy", {
        copy: c.id,
        student: s.id,
        due: today(),
      }),
    );
    const other = (await state("LIBRARIAN")).extra.copies.find(
      (x) => x.available,
    );
    await assert.rejects(
      apply("LIBRARIAN", "issue_copy", {
        copy: other.id,
        student: s.id,
        due: today(),
      }),
    );
    const l = (await state("STUDENT")).loans.find((l) => l.copy_id === c.id);
    await apply("LIBRARIAN", "return", { loan: l.id });
    await apply("LIBRARIAN", "fine", {
      loan: l.id,
      state: "Adjusted",
      amount: 10,
      reason: "Damaged cover",
    });
    assert.equal(
      Number((await state("STUDENT")).loans.find((x) => x.id === l.id).fine),
      10,
    );
  }));
test("reviewed routine and manual adjustments revalidate resource constraints", () =>
  fixture(async ({ state, apply }) => {
    const d = await state("ADMIN"),
      o = d.offerings.find((o) => o.code === "CSE202"),
      room = d.rooms.find((r) => r.kind === "Lab");
    await apply("ADMIN", "generate", { term: o.term });
    await apply("ADMIN", "room_block", {
      room: room.id,
      slot: 7,
      status: "Unavailable",
      reason: "Maintenance",
    });
    await assert.rejects(
      apply("ADMIN", "move", { offering: o.id, room: room.id, slot: 7 }),
    );
    await apply("ADMIN", "move", { offering: o.id, room: room.id, slot: 8 });
    await assert.rejects(apply("ADMIN", "release", { term: o.term }));
    await apply("ADMIN", "review_routine", { term: o.term });
    await apply("ADMIN", "release", { term: o.term });
    assert.equal(
      (await state("ADMIN")).routine.find((x) => x.offering === o.id).published,
      1,
    );
  }));
test("proposal revision, version-specific feedback, final submission and viva", () =>
  fixture(async ({ u, state, apply }) => {
    await apply("STUDENT", "thesis_draft", {
      title: "Sensors",
      proposal: "First draft",
    });
    await apply("STUDENT", "topic", {
      title: "Sensors",
      proposal: "Design plan",
    });
    const t = (await state("STUDENT")).theses[0];
    await apply("ADMIN", "revision", {
      thesis: t.id,
      note: "Clarify the experiment",
    });
    await apply("STUDENT", "topic", {
      title: "Sensors",
      proposal: "Revised design plan",
    });
    await apply("ADMIN", "allocate", {
      thesis: t.id,
      supervisor: u.THESIS_SUPERVISOR.id,
    });
    await apply("THESIS_SUPERVISOR", "milestone", {
      thesis: t.id,
      status: "In progress",
      note: "Approved",
    });
    await assert.rejects(
      apply("THESIS_SUPERVISOR", "viva", {
        thesis: t.id,
        day: today(),
        room_name: "A-1",
      }),
    );
    const document = {
      name: "report.pdf",
      data: Buffer.from("%PDF-1.4\n%%EOF").toString("base64"),
    };
    await apply("STUDENT", "progress", {
      thesis: t.id,
      note: "Draft upload",
      document,
    });
    const draft = (await state("STUDENT")).updates[0];
    await apply("THESIS_SUPERVISOR", "feedback", {
      submission: draft.id,
      note: "Revise section 2",
    });
    await apply("STUDENT", "final_submit", {
      thesis: t.id,
      note: "Final version",
      document,
    });
    await apply("THESIS_SUPERVISOR", "viva", {
      thesis: t.id,
      day: today(),
      room_name: "A-1",
    });
    await apply("THESIS_SUPERVISOR", "outcome", {
      thesis: t.id,
      outcome: "Passed",
      note: "Defense completed",
    });
    const d = await state("STUDENT");
    assert.equal(d.theses[0].status, "Defended");
    assert.equal(d.extra.feedback[0].submission, draft.id);
    assert.equal(d.updates.filter((x) => x.filename).length, 2);
  }));
test("administrative setup, fee scope, catalog metadata and permission enforcement", () =>
  fixture(async ({ db, state, apply, get, u }) => {
    const d = await state("ADMIN"),
      p = d.people.find((s) => s.id === u.STUDENT.id),
      o = d.offerings.find((o) => o.code === "CSE202"),
      t = d.catalog.semesters.find((t) => t.id === o.term),
      book = d.books[0],
      room = d.rooms.find((r) => r.kind === "Lab");
    await apply("ADMIN", "settings", {
      timezone_name: "Asia/Dhaka",
      currency_code: "BDT",
      date_locale: "bn-BD",
    });
    assert.equal((await state("ADMIN")).extra.settings.date_locale, "bn-BD");
    await apply("ADMIN", "employee", {
      teacher: u.TEACHER.id,
      employee_no: "QAF-001",
    });
    await apply("ADMIN", "admission", { student: p.id, term: t.id });
    await apply("ADMIN", "course_summary", {
      course: o.course,
      description: "Lab introduction",
    });
    await apply("ADMIN", "section_state", { offering: o.id, status: "Closed" });
    await assert.rejects(apply("STUDENT", "register", { offering: o.id }));
    await apply("ADMIN", "room_metadata", {
      room: room.id,
      code: "QA-LAB",
      building: "West wing",
      department: p.department_id,
      status: "Active",
    });
    await apply("LIBRARIAN", "book_metadata", {
      book: book.id,
      isbn: "9780306406157",
      category: "Science",
      edition: "2",
      publisher: "Campus",
      published_year: 2025,
    });
    await apply("LIBRARIAN", "coauthor", {
      book: book.id,
      name: "QA Research Group",
    });
    await apply("LIBRARIAN", "copy", { book: book.id, accession: "QA-ACC" });
    const copy = await get(
      "SELECT id FROM book_copies WHERE accession='QA-ACC'",
    );
    await apply("LIBRARIAN", "copy_condition", {
      copy: copy.id,
      condition: "Repair",
    });
    await assert.rejects(
      apply("LIBRARIAN", "issue_copy", {
        copy: copy.id,
        student: p.id,
        due: today(),
      }),
    );
    await apply("ACCOUNTS_OFFICER", "fee_type", {
      label: "QA Lab fee",
      amount: 350,
    });
    const f = await get("SELECT id FROM fee_types WHERE label='QA Lab fee'");
    await apply("ACCOUNTS_OFFICER", "fee_rule", {
      fee: f.id,
      program: p.program_id,
      term: t.id,
      category: "Lab",
      status: "Active",
    });
    await apply("ACCOUNTS_OFFICER", "standard_invoice", {
      fee: f.id,
      student: p.id,
      term: t.id,
      due: today(),
    });
    const unrelated = d.people.find((x) => x.program_id !== p.program_id);
    await assert.rejects(
      apply("ACCOUNTS_OFFICER", "standard_invoice", {
        fee: f.id,
        student: unrelated.id,
        term: t.id,
        due: today(),
      }),
    );
    const idle = await get(
      "SELECT id FROM users WHERE email='accounts_officer02@demo.campus.test'",
    );
    await apply("ADMIN", "change_role", {
      account: idle.id,
      role: "LIBRARIAN",
      reason: "Staff transfer",
    });
    assert.equal(
      (await get("SELECT role FROM users WHERE id=?", idle.id)).role,
      "LIBRARIAN",
    );
    const studentState = await state("STUDENT");
    for (const name of [
      "change_role",
      "book",
      "weight",
      "room_block",
      "grade_band",
      "void_receipt",
      "publish",
      "settings",
    ])
      await assert.rejects(mutate(db, u.STUDENT, studentState, [], name, {}), {
        status: 403,
      });
  }));
test("notice publication dates, private attachments and archived states", () =>
  fixture(async ({ apply, state }) => {
    await apply("ADMIN", "notice", {
      title: "QA release",
      body: "For students",
      audience: "STUDENT",
      target: "0",
    });
    const n = (await state("ADMIN")).notices.find(
      (n) => n.title === "QA release",
    );
    const day = today();
    await apply("ADMIN", "notice_state", {
      notice: n.id,
      state: "Draft",
      starts: day,
      ends: day,
    });
    assert.ok(!(await state("STUDENT")).notices.some((x) => x.id === n.id));
    const document = {
      name: "notice.pdf",
      data: Buffer.from("%PDF-1.4\n%%EOF").toString("base64"),
    };
    await apply("ADMIN", "notice_state", {
      notice: n.id,
      state: "Published",
      starts: day,
      ends: day,
      document,
    });
    assert.equal(
      (await state("STUDENT")).notices.find((x) => x.id === n.id).filename,
      "notice.pdf",
    );
    await apply("ADMIN", "notice_state", {
      notice: n.id,
      state: "Archived",
      starts: day,
      ends: day,
    });
    assert.ok(!(await state("STUDENT")).notices.some((x) => x.id === n.id));
  }));
