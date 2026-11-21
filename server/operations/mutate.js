import { runExtra, publishGrade, validPublication } from "./blueprint.js";
import { fail, hashPassword } from "../security.js";
import { slots, rows, today, eligible } from "./records.js";
import { actions, options } from "./forms.js";
export const reject = (msg) => fail(422, "INVALID_INPUT", msg);
export async function mutate(
  db,
  u,
  d,
  studentUsers,
  key,
  body,
  requestId = null,
) {
  const spec = Object.hasOwn(actions, key) && actions[key];
  if (
    !d.extra.permissions.some((p) => p.permission_name === key) ||
    !spec ||
    !spec.roles.some((r) => r === "*" || r === u.role)
  )
    fail(403, "FORBIDDEN", "This action is unavailable for your role.");
  const lists = options(d, studentUsers, u),
    b = {};
  for (const { key: f, type } of spec.fields) {
    let value = body?.[f];
    if (type === "optional") {
      value = String(value ?? "").trim();
      if (value.length > 140) reject("Text too long.");
    } else if (Object.hasOwn(lists, type)) {
      const item = lists[type].find((o) => String(o.id) === String(value));
      if (!item) reject("Choose an available " + f.replaceAll("_", " ") + ".");
      value = item.id;
    } else if (["money", "moneyOrZero", "integer", "mark"].includes(type)) {
      if (value == null || value === "") reject("Enter " + f + ".");
      value = Number(value);
      if (
        !Number.isFinite(value) ||
        value < (["mark", "moneyOrZero"].includes(type) ? 0 : 0.01) ||
        value >
          (type === "mark" ? 100 : type === "integer" ? 10000 : 999999999) ||
        Math.abs(value * 100 - Math.round(value * 100)) > 0.0001 ||
        (type === "integer" && !Number.isInteger(value))
      )
        reject("Invalid " + f + ".");
    } else if (type === "pdf") {
      if (
        value &&
        (!/^[A-Za-z0-9+/]+=*$/.test(value.data || "") ||
          value.data.length > 1400000 ||
          typeof value.name !== "string" ||
          value.name.length > 150 ||
          /[\\/]/.test(value.name) ||
          !/\.pdf$/i.test(value.name) ||
          Buffer.from(value.data, "base64").length > 1048576 ||
          Buffer.from(value.data, "base64").subarray(0, 5).toString() !==
            "%PDF-")
      )
        reject("Choose a PDF under 1 MiB.");
    } else {
      if (typeof value !== "string" || !value.trim())
        reject("Enter " + f + ".");
      if (type !== "password") value = value.trim();
      if (type === "url") {
        let link;
        try {
          link = new URL(value);
        } catch {
          reject("Enter a valid HTTPS link.");
        }
        if (link.protocol !== "https:") reject("Enter a valid HTTPS link.");
      }
      const limits = {
        url: 1200,
        email: 180,
        password: 256,
        student_no: 32,
        batch: 30,
        section: 20,
        code: 32,
        designation: 100,
        reference: 100,
        author: 100,
        label: 120,
        name: key === "room" ? 50 : 100,
        title: key === "topic" ? 160 : 140,
      };
      if (value.length > (limits[f] ?? (type === "long" ? 5000 : 140)))
        reject(f + " is too long.");
      if (
        type === "date" &&
        (!/^\d{4}-\d\d-\d\d$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      )
        reject("Invalid date.");
      if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        reject("Enter a valid email.");
      if (type === "password" && value.length < 12)
        reject("Use at least 12 characters.");
    }
    b[f] = value;
  }
  const run = (sql, ...a) => db.execute(sql, a);
  const reg = d.regs.find((r) => r.id === b.reg);
  const execute = async (sql, ...a) => (await run(sql, ...a))[0];
  let entity =
    b.reg ??
    b.thesis ??
    b.student ??
    b.invoice ??
    b.term ??
    b.account ??
    b.notice ??
    b.offering ??
    b.loan ??
    u.id;
  if (key === "register" || (key === "review" && b.status === "Approved")) {
    const section = d.offerings.find(
        (o) => o.id === (reg?.offering ?? b.offering),
      ),
      sid = reg?.student ?? u.id;
    const peers = d.regs.filter(
      (r) =>
        r.student === sid &&
        r.term === section.term &&
        r.id !== reg?.id &&
        ["Approved", "Pending"].includes(r.status),
    );
    const limit =
      d.extra.rules.find((p) => p.program === section.program)?.credit_limit ??
      24;
    if (
      peers.reduce((n, r) => n + Number(r.credits), Number(section.credits)) >
      Number(limit)
    )
      reject("Program credit limit exceeded.");
    const clash = await execute(
      "SELECT 1 FROM timetable a JOIN timetable t ON t.slot=a.slot AND t.offering<>a.offering JOIN registrations r ON r.offering=t.offering JOIN offerings o ON o.id=r.offering WHERE a.offering=? AND a.published=1 AND t.published=1 AND r.student=? AND o.term=? AND r.status IN ('Approved','Pending') LIMIT 1",
      section.id,
      sid,
      section.term,
    );
    if (clash.length) reject("This section conflicts with your timetable.");
  }
  if (!(await runExtra(db, u, d, key, b)))
    switch (key) {
      case "user":
        await run(
          "INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)",
          b.name,
          b.email.toLowerCase(),
          await hashPassword(b.password),
          b.role,
        );
        break;
      case "account_status":
        await run(
          "UPDATE users SET active=? WHERE id=?",
          b.access === "Active",
          b.account,
        );
        if (b.access === "Inactive")
          await run("DELETE FROM sessions WHERE user_id=?", b.account);
        break;
      case "profile": {
        const clash = await rows(
          db,
          "SELECT user_id FROM students WHERE student_no=? AND user_id<>?",
          [b.student_no, b.student],
        );
        if (clash.length) reject("Student number is already assigned.");
        await run(
          "INSERT INTO students(user_id,student_no,program_id,batch,status) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE student_no=VALUES(student_no),program_id=VALUES(program_id),batch=VALUES(batch),status=VALUES(status)",
          b.student,
          b.student_no,
          b.program,
          b.batch,
          b.status,
        );
        break;
      }
      case "faculty":
        await run(
          "INSERT INTO faculty VALUES(?,?,?) ON DUPLICATE KEY UPDATE department_id=VALUES(department_id),designation=VALUES(designation)",
          b.teacher,
          b.department,
          b.designation,
        );
        break;
      case "advise":
        await run(
          "INSERT INTO advising VALUES(?,?) ON DUPLICATE KEY UPDATE advisor=VALUES(advisor)",
          b.student,
          b.advisor,
        );
        break;
      case "prerequisite": {
        const seen = new Set(),
          stack = [b.required_course];
        while (stack.length) {
          const c = stack.pop();
          if (c === b.course) reject("Prerequisites would form a cycle.");
          if (seen.has(c)) continue;
          seen.add(c);
          stack.push(
            ...d.requirements
              .filter((x) => x.course === c)
              .map((x) => x.required_course),
          );
        }
        await run(
          "INSERT INTO prerequisites VALUES(?,?)",
          b.course,
          b.required_course,
        );
        break;
      }
      case "offering":
        await run(
          "INSERT INTO offerings(course,term,teacher,program,batch,section,capacity,kind) VALUES(?,?,?,?,?,?,?,?)",
          b.course,
          b.term,
          b.teacher,
          b.program,
          b.batch,
          b.section,
          b.capacity,
          b.kind,
        );
        break;
      case "register":
        await run(
          "INSERT INTO registrations(student,offering,status) VALUES(?,?,'Pending') ON DUPLICATE KEY UPDATE status='Pending'",
          u.id,
          b.offering,
        );
        break;
      case "review": {
        const o = d.offerings.find((o) => o.id === reg.offering),
          person = d.people.find((s) => s.id === reg.student);
        if (
          b.status === "Approved" &&
          (o.enrolled >= o.capacity ||
            today() > o.drop_on ||
            !eligible(
              person,
              o,
              d.regs.filter((r) => r.id !== reg.id),
              d.requirements,
            ))
        )
          reject(
            "Capacity, deadline or academic eligibility prevents approval.",
          );
        await run(
          "UPDATE registrations SET status=? WHERE id=?",
          b.status,
          b.reg,
        );
        break;
      }
      case "drop":
        if (
          (
            await rows(
              db,
              "SELECT reg FROM results WHERE reg=? UNION SELECT reg FROM attendance WHERE reg=?",
              [b.reg, b.reg],
            )
          ).length
        )
          reject("Academic records already exist for this registration.");
        await run(
          "UPDATE registrations SET status='Dropped' WHERE id=?",
          b.reg,
        );
        break;
      case "attendance": {
        let cls = d.extra.sessions.find(
          (s) => s.offering === reg.offering && s.day === b.day,
        );
        if (cls?.status === "Cancelled") reject("This session was cancelled.");
        const previous = d.attendance.find(
          (a) => a.reg === b.reg && a.day === b.day,
        );
        if (previous && !b.reason) reject("Enter a correction reason.");
        if (!cls) {
          const result = await execute(
            "INSERT INTO class_sessions(offering,day,status,actor) VALUES(?,?,'Held',?)",
            reg.offering,
            b.day,
            u.id,
          );
          cls = { id: result.insertId };
        }
        if (previous)
          await execute(
            "INSERT INTO attendance_notes(session_id,reg,actor,reason,previous_status,new_status) VALUES(?,?,?,?,?,?)",
            cls.id,
            b.reg,
            u.id,
            b.reason,
            previous.mark_status,
            b.present,
          );
        const [s] = await rows(
          db,
          "SELECT starts_on,ends_on FROM semesters WHERE id=?",
          [reg.term],
        );
        if (b.day < s.starts_on || b.day > s.ends_on || b.day > today())
          reject("Choose a past or current class date within the semester.");
        await run(
          "INSERT INTO attendance VALUES(?,?,?) ON DUPLICATE KEY UPDATE present=VALUES(present)",
          b.reg,
          b.day,
          ["Present", "Late"].includes(b.present),
        );
        await execute(
          "INSERT INTO attendance_status VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),actor=VALUES(actor)",
          b.reg,
          b.day,
          b.present,
          u.id,
        );
        break;
      }
      case "marks":
        if (d.extra.assessments.some((a) => a.offering === reg.offering))
          reject(
            "This section uses weighted assessments. Enter each mark and calculate the draft.",
          );
        await run(
          "INSERT INTO results(reg,assessment,exam) VALUES(?,?,?) ON DUPLICATE KEY UPDATE assessment=VALUES(assessment),exam=VALUES(exam)",
          b.reg,
          b.assessment,
          b.exam,
        );
        break;
      case "publish":
        validPublication(d, reg);
        await publishGrade(db, u, d, reg);
        await run("UPDATE results SET published=1 WHERE reg=?", b.reg);
        break;
      case "fee_type":
        await run(
          "INSERT INTO fee_types(label,amount) VALUES(?,?)",
          b.label,
          b.amount,
        );
        break;
      case "standard_invoice": {
        const f = d.feeTypes.find((f) => f.id === b.fee),
          term = d.catalog.semesters.find((t) => t.id === b.term);
        if (
          !f.active ||
          (f.term && f.term !== b.term) ||
          (f.program &&
            f.program !== d.people.find((s) => s.id === b.student).program_id)
        )
          reject(
            "This fee does not apply to the selected student and semester.",
          );
        await run(
          "INSERT INTO invoices(student,label,amount,due) VALUES(?,?,?,?)",
          b.student,
          (term.code + " · " + f.label).slice(0, 120),
          f.amount,
          b.due,
        );
        break;
      }
      case "weight":
        if (
          b.weight > 99 ||
          d.regs.some((r) => r.offering === b.offering && r.assessment != null)
        )
          reject("Set a weight from 1 to 99 before entering marks.");
        await run(
          "INSERT INTO marking_policy VALUES(?,?) ON DUPLICATE KEY UPDATE coursework_weight=VALUES(coursework_weight)",
          b.offering,
          b.weight,
        );
        break;
      case "material":
        await run(
          "INSERT INTO materials(offering,title,url) VALUES(?,?,?)",
          b.offering,
          b.title,
          b.url,
        );
        break;
      case "invoice":
        await run(
          "INSERT INTO invoices(student,label,amount,due) VALUES(?,?,?,?)",
          b.student,
          b.label,
          b.amount,
          b.due,
        );
        break;
      case "payment":
        if (b.amount > Number(d.bills.find((i) => i.id === b.invoice).balance))
          reject("Amount exceeds the outstanding balance.");
        await run(
          "INSERT INTO receipts(invoice,amount,kind,reference) VALUES(?,?,?,?)",
          b.invoice,
          b.amount,
          b.kind,
          b.reference,
        );
        break;
      case "notice": {
        const prefix = {
          Department: "departments",
          Program: "programs",
          User: "users",
          Semester: "semesters",
          Offering: "offerings",
        }[b.audience];
        if (
          prefix ? !String(b.target).startsWith(prefix + "-") : b.target !== "0"
        )
          reject("Choose the matching audience target.");
        await run(
          "INSERT INTO notices(title,body,audience,target,author) VALUES(?,?,?,?,?)",
          b.title,
          b.body,
          b.audience,
          Number(String(b.target).split("-").pop()),
          u.id,
        );
        break;
      }
      case "read":
        await run(
          "INSERT IGNORE INTO notice_reads VALUES(?,?)",
          b.notice,
          u.id,
        );
        break;
      case "book":
        await run(
          "INSERT INTO books(code,title,author,copies) VALUES(?,?,?,?)",
          b.code,
          b.title,
          b.author,
          b.copies,
        );
        break;
      case "return": {
        const l = d.loans.find((l) => l.id === b.loan),
          p = d.people.find((s) => s.id === l.student),
          rate =
            d.extra.rules.find((r) => r.program === p.program_id)?.fine_rate ??
            5;
        await run(
          "UPDATE loans SET returned=?,fine=GREATEST(DATEDIFF(CAST(? AS DATE),due),0)*? WHERE id=?",
          today(),
          today(),
          rate,
          b.loan,
        );
        break;
      }
      case "room":
        await run(
          "INSERT INTO rooms(name,kind,capacity) VALUES(?,?,?)",
          b.name,
          b.kind,
          b.capacity,
        );
        break;
      case "block":
        if (d.routine.some((r) => r.slot === b.slot))
          reject("This slot has a published class.");
        await run("INSERT IGNORE INTO unavailable VALUES(?,?)", u.id, b.slot);
        break;
      case "unblock":
        await run(
          "DELETE FROM unavailable WHERE teacher=? AND slot=?",
          u.id,
          b.slot,
        );
        break;
      case "move": {
        const entry = d.routine.find((r) => r.offering === b.offering);
        entry.slot = b.slot;
        entry.room = b.room;
        await schedule(db, entry.term, "validate", d);
        await execute(
          "UPDATE timetable SET slot=?,room=? WHERE offering=?",
          b.slot,
          b.room,
          b.offering,
        );
        await execute(
          "INSERT INTO routine_reviews(term,state,actor) VALUES(?,'Generated',?)",
          entry.term,
          u.id,
        );
        break;
      }
      case "review_routine":
      case "generate":
      case "release":
        if (
          key === "release" &&
          d.extra.reviews.find((r) => r.term === b.term)?.state !== "Reviewed"
        )
          reject("Validate and review the draft before publishing.");
        await schedule(
          db,
          b.term,
          key === "review_routine" ? "validate" : key,
          d,
        );
        await execute(
          "INSERT INTO routine_reviews(term,state,actor) VALUES(?,?,?)",
          b.term,
          key === "release"
            ? "Published"
            : key === "generate"
              ? "Generated"
              : "Reviewed",
          u.id,
        );
        break;
      case "allocate":
        if (
          !d.theses.find((t) => t.id === b.thesis)?.supervisor &&
          d.theses.find((t) => t.id === b.thesis)?.status !== "Submitted"
        )
          reject("Submit the proposal before approval.");
        await run(
          "UPDATE theses SET supervisor=?,status=CASE WHEN status='Submitted' THEN 'Approved' ELSE status END WHERE id=?",
          b.supervisor,
          b.thesis,
        );
        break;
      case "progress":
        await run(
          "INSERT INTO thesis_updates(thesis,actor,note,filename,document) VALUES(?,?,?,?,?)",
          b.thesis,
          u.id,
          b.note,
          b.document?.name ?? null,
          b.document ? Buffer.from(b.document.data, "base64") : null,
        );
        break;
      case "milestone": {
        const stages = [
            "Approved",
            "In progress",
            "Draft reviewed",
            "Defense scheduled",
            "Defended",
          ],
          t = d.theses.find((t) => t.id === b.thesis);
        if (stages.indexOf(b.status) !== stages.indexOf(t.status) + 1)
          reject("Choose the next milestone after " + t.status + ".");
        await run("UPDATE theses SET status=? WHERE id=?", b.status, b.thesis);
        await run(
          "INSERT INTO thesis_updates(thesis,actor,note) VALUES(?,?,?)",
          b.thesis,
          u.id,
          b.status + " — " + b.note,
        );
        break;
      }
    }
  if (
    [
      "invoice",
      "standard_invoice",
      "payment",
      "book",
      "topic",
      "allocate",
      "advise",
    ].includes(key)
  ) {
    if (key === "invoice" || key === "standard_invoice") {
      const i = (
        await execute(
          "SELECT * FROM invoices WHERE student=? ORDER BY id DESC LIMIT 1",
          b.student,
        )
      )[0];
      entity = i.id;
      await execute(
        "INSERT INTO invoice_items(invoice,label,amount) VALUES(?,?,?)",
        i.id,
        i.label,
        i.amount,
      );
    }
    if (key === "payment") {
      if (b.kind === "Waiver" && !b.reason)
        reject("A waiver requires a reason.");
      const [r] = await execute(
        "SELECT id FROM receipts WHERE reference=?",
        b.reference,
      );
      entity = r.id;
      await execute(
        "INSERT INTO receipt_details(receipt,state,method,reason,actor) VALUES(?,?,?,?,?)",
        r.id,
        b.kind === "Waiver" ? "Pending" : "Valid",
        b.method || "Recorded",
        b.reason || null,
        u.id,
      );
    }
    if (key === "book") {
      const [r] = await execute("SELECT id FROM books WHERE code=?", b.code);
      entity = r.id;
      for (let i = 1; i <= b.copies; i++)
        await execute(
          "INSERT INTO book_copies(book,accession) VALUES(?,?)",
          r.id,
          "BK-" + r.id + "-" + i,
        );
    }
    if (key === "advise")
      await execute(
        "INSERT INTO advisor_history(student,advisor,effective,actor) VALUES(?,?,?,?)",
        b.student,
        b.advisor,
        today(),
        u.id,
      );
    if (key === "allocate")
      await execute(
        "INSERT INTO thesis_assignments(thesis,supervisor,actor) VALUES(?,?,?)",
        b.thesis,
        b.supervisor,
        u.id,
      );
  }
  if (key === "invoice" || key === "standard_invoice")
    await execute(
      "INSERT INTO invoice_details VALUES(?,?,?)",
      entity,
      b.term ?? null,
      today(),
    );
  if (key === "book") {
    for (const name of b.author
      .split(/,| and /)
      .map((v) => v.trim())
      .filter(Boolean)) {
      await execute("INSERT IGNORE INTO authors(name) VALUES(?)", name);
      await execute(
        "INSERT IGNORE INTO book_authors SELECT ?,id FROM authors WHERE name=?",
        entity,
        name,
      );
    }
  }
  if (["register", "review", "drop"].includes(key)) {
    const record =
      reg ??
      (
        await execute(
          "SELECT * FROM registrations WHERE student=? AND offering=?",
          u.id,
          b.offering,
        )
      )[0];
    entity = record.id;
    await execute(
      "INSERT INTO registration_events(reg,actor,state,comment_text) VALUES(?,?,?,?)",
      entity,
      u.id,
      key === "drop" ? "Dropped" : key === "register" ? "Pending" : b.status,
      b.reason || null,
    );
  }
  if (
    [
      "thesis_draft",
      "topic",
      "allocate",
      "revision",
      "milestone",
      "final_submit",
      "viva",
      "outcome",
    ].includes(key)
  ) {
    const t = (
      await execute(
        "SELECT id,status FROM theses WHERE " +
          (b.thesis ? "id=?" : "student=?"),
        b.thesis ?? u.id,
      )
    )[0];
    entity = t.id;
    await execute(
      "INSERT INTO thesis_events(thesis,actor,state,note) VALUES(?,?,?,?)",
      t.id,
      u.id,
      t.status,
      (b.note || "").slice(0, 140),
    );
  }
  const recipient =
    reg?.student ??
    d.theses.find((t) => t.id === b.thesis)?.student ??
    d.bills.find((i) => i.id === b.invoice)?.student ??
    b.student;
  if (recipient && recipient !== u.id)
    await execute(
      "INSERT INTO notifications(recipient,message) VALUES(?,?)",
      recipient,
      spec.title +
        " · " +
        (b.status ?? b.note ?? b.label ?? "record updated")
          .toString()
          .slice(0, 130),
    );
  if (key === "register") {
    const [a] = await execute(
      "SELECT advisor FROM advising WHERE student=?",
      u.id,
    );
    if (a)
      await execute(
        "INSERT INTO notifications(recipient,message) VALUES(?,'Registration request awaits your review')",
        a.advisor,
      );
  }
  const audit = await execute(
    "INSERT INTO audit_logs(actor_id,action,resource,record_id) VALUES(?,?,?,?)",
    u.id,
    key,
    spec.section,
    entity,
  );
  await execute(
    "INSERT INTO event_details(audit_id,request_id,reason,change_data) VALUES(?,?,?,?)",
    audit.insertId,
    requestId,
    b.reason || null,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(b).filter(
          ([k]) =>
            !["password", "document", "proposal", "body", "note"].includes(k),
        ),
      ),
    ),
  );
}
async function schedule(db, term, key, d) {
  const sections = d.offerings
    .filter((o) => o.term === term)
    .sort((a, b) => b.capacity - a.capacity || a.id - b.id);
  if (!sections.length) reject("Add at least one offering to this semester.");
  const overlapping = await rows(
    db,
    "SELECT t.id FROM semesters t JOIN semesters s ON s.id=? WHERE t.ends_on>=s.starts_on AND t.starts_on<=s.ends_on",
    [term],
  );
  const terms = new Set(overlapping.map((t) => t.id));
  const used = d.routine
    .filter((r) => r.term !== term && terms.has(r.term))
    .map((r) => ({
      ...d.offerings.find((o) => o.id === r.offering),
      room: r.room,
      slot: r.slot,
    }));
  const plan = [];
  for (const o of sections) {
    const rooms = d.rooms
      .filter((r) => r.active && r.kind === o.kind && r.capacity >= o.capacity)
      .sort((a, b) => a.capacity - b.capacity || a.id - b.id);
    const current = d.routine.find((r) => r.offering === o.id);
    let match;
    for (const { id: slot } of slots) {
      if (d.blocked.some((b) => b.teacher === o.teacher && b.slot === slot))
        continue;
      for (const room of rooms) {
        if (d.extra.blocks.some((x) => x.room === room.id && x.slot === slot))
          continue;
        if (
          key !== "generate" &&
          (!current || current.slot !== slot || current.room !== room.id)
        )
          continue;
        if (
          !used.some(
            (v) =>
              v.slot === slot &&
              (v.room === room.id ||
                v.teacher === o.teacher ||
                (v.program === o.program && v.batch === o.batch)),
          )
        ) {
          match = { ...o, room: room.id, slot };
          break;
        }
      }
      if (match) break;
    }
    if (!match)
      reject(
        "No valid slot for " +
          o.code +
          ". Review rooms, availability and existing routines.",
      );
    used.push(match);
    plan.push(match);
  }
  if (key === "validate") return;
  for (const o of plan)
    await db.execute(
      "INSERT INTO timetable(offering,room,slot,published) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE room=VALUES(room),slot=VALUES(slot),published=VALUES(published)",
      [o.id, o.room, o.slot, key === "release"],
    );
}
