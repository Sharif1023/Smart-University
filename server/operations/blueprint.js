import { fail } from "../security.js";
import { today, score } from "./records.js";
import { bands } from "./grade-bands.js";
const bad = (m) => fail(422, "WORKFLOW_RULE", m);
export const extraForms = [
  [
    "coauthor",
    "Library",
    "Add book author",
    "ADMIN LIBRARIAN",
    "book:allBooks name",
  ],
  [
    "settings",
    "Administration",
    "Set display preferences",
    "ADMIN",
    "timezone_name currency_code date_locale",
  ],
  [
    "book_metadata",
    "Library",
    "Edit book edition",
    "ADMIN LIBRARIAN",
    "book:allBooks isbn:optional category edition publisher published_year:integer",
  ],
  [
    "copy_condition",
    "Library",
    "Update copy condition",
    "ADMIN LIBRARIAN",
    "copy:anyCopies condition:conditions",
  ],
  [
    "room_metadata",
    "Routine",
    "Edit room details",
    "ADMIN",
    "room:rooms code building department:departments status:sectionStates",
  ],
  [
    "fee_rule",
    "Finance",
    "Scope a standard fee",
    "ADMIN ACCOUNTS_OFFICER",
    "fee:feeTypes program:programs term:semesters category status:sectionStates",
  ],
  [
    "course_summary",
    "Registration",
    "Edit course description",
    "ADMIN",
    "course:courses description:long",
  ],
  [
    "min_grade",
    "Registration",
    "Set prerequisite grade",
    "ADMIN",
    "course:courses required_course:courses minimum:mark",
  ],
  [
    "policy",
    "Administration",
    "Update program policy",
    "ADMIN",
    "program:programs credit_limit:integer loan_limit:integer fine_rate:mark overdue:yesNo degree duration:integer",
  ],
  [
    "grade_band",
    "Administration",
    "Set grading boundary",
    "ADMIN",
    "program:programs minimum:mark letter points:mark",
  ],
  [
    "change_role",
    "Administration",
    "Change staff role",
    "ADMIN",
    "account:staffAccounts role:staffRoles reason",
  ],
  [
    "admission",
    "People",
    "Record admission semester",
    "ADMIN",
    "student:students term:semesters",
  ],
  [
    "employee",
    "People",
    "Assign employee number",
    "ADMIN",
    "teacher:facultyUsers employee_no",
  ],
  [
    "section_state",
    "Registration",
    "Change section availability",
    "ADMIN",
    "offering:ownedSections status:sectionStates",
  ],
  [
    "class_session",
    "Teaching",
    "Open or cancel class session",
    "ADMIN TEACHER",
    "offering:ownedSections day:date status:sessionStates reason",
  ],
  [
    "assessment",
    "Teaching",
    "Create weighted assessment",
    "TEACHER",
    "offering:ownedSections title category:categories maximum:money weight:mark due:date",
  ],
  [
    "assessment_mark",
    "Teaching",
    "Enter assessment mark",
    "TEACHER",
    "assessment:tests reg:unlocked mark:moneyOrZero",
  ],
  [
    "calculate",
    "Teaching",
    "Calculate draft from assessments",
    "TEACHER",
    "reg:unlocked",
  ],
  [
    "lock_result",
    "Teaching",
    "Lock published result",
    "ADMIN TEACHER",
    "reg:publishedRegs",
  ],
  [
    "reopen",
    "Teaching",
    "Reopen a result",
    "ADMIN",
    "reg:publishedRegs reason",
  ],
  [
    "add_item",
    "Finance",
    "Add invoice item",
    "ADMIN ACCOUNTS_OFFICER",
    "invoice:invoices label amount:money",
  ],
  [
    "waiver_review",
    "Finance",
    "Review waiver",
    "ADMIN",
    "receipt:pendingWaivers decision:waiverDecisions reason",
  ],
  [
    "void_receipt",
    "Finance",
    "Void recorded transaction",
    "ADMIN ACCOUNTS_OFFICER",
    "receipt:validReceipts reason",
  ],
  [
    "notice_state",
    "Notices",
    "Set notice publication window",
    "ADMIN",
    "notice:allNotices state:noticeStates starts:date ends:date document:pdf",
  ],
  [
    "acknowledge",
    "Notifications",
    "Mark notification read",
    "*",
    "notification:unseen",
  ],
  [
    "copy",
    "Library",
    "Add physical copy",
    "ADMIN LIBRARIAN",
    "book:allBooks accession",
  ],
  [
    "issue_copy",
    "Library",
    "Issue a specific copy",
    "ADMIN LIBRARIAN",
    "copy:freeCopies student:students due:date",
  ],
  [
    "fine",
    "Library",
    "Settle or adjust fine",
    "ADMIN LIBRARIAN",
    "loan:fineLoans state:fineStates amount:moneyOrZero reason",
  ],
  [
    "room_block",
    "Routine",
    "Change room availability",
    "ADMIN",
    "room:rooms slot:slots status:roomStates reason",
  ],
  [
    "move",
    "Routine",
    "Move a draft class",
    "ADMIN",
    "offering:draftClasses room:rooms slot:slots",
  ],
  [
    "review_routine",
    "Routine",
    "Validate and review routine",
    "ADMIN",
    "term:semesters",
  ],
  [
    "thesis_draft",
    "Thesis",
    "Save proposal draft",
    "STUDENT",
    "title proposal:long",
  ],
  [
    "revision",
    "Thesis",
    "Request proposal revision",
    "ADMIN THESIS_SUPERVISOR",
    "thesis:reviewable note:long",
  ],
  [
    "feedback",
    "Thesis",
    "Review a submitted version",
    "THESIS_SUPERVISOR",
    "submission:submissions note:long",
  ],
  [
    "final_submit",
    "Thesis",
    "Submit final thesis PDF",
    "STUDENT",
    "thesis:activeTheses note:long document:pdf",
  ],
  [
    "viva",
    "Thesis",
    "Schedule viva",
    "THESIS_SUPERVISOR",
    "thesis:finalTheses day:date room_name",
  ],
  [
    "outcome",
    "Thesis",
    "Record viva outcome",
    "THESIS_SUPERVISOR",
    "thesis:scheduledTheses outcome:outcomes note:long",
  ],
];
export async function supplement(db, d, u) {
  const read = async (sql, args = []) => (await db.execute(sql, args))[0],
    admin = u.role === "ADMIN",
    finance = admin || u.role === "ACCOUNTS_OFFICER";
  const by = async (sql, col, ids) =>
    ids.length
      ? read(
          sql + " WHERE " + col + " IN (" + ids.map(() => "?").join(",") + ")",
          ids,
        )
      : [];
  const own = d.offerings
    .filter((o) => admin || o.teacher === u.id)
    .map((o) => o.id);
  const regids = d.regs.map((r) => r.id),
    tids = d.theses.map((t) => t.id),
    billids = d.bills.map((b) => b.id);
  const extra = {
    regHistory: await by("SELECT * FROM registration_events", "reg", regids),
    thesisHistory: await by("SELECT * FROM thesis_events", "thesis", tids),
    supervision: await by("SELECT * FROM thesis_assignments", "thesis", tids),
    conflicts: admin
      ? await read("SELECT * FROM routine_conflicts ORDER BY id DESC")
      : [],
    settings: (
      await read(
        "SELECT timezone_name,currency_code,date_locale FROM campus_settings WHERE id=1",
      )
    )[0],
    permissions: await read(
      "SELECT permission_name FROM role_permissions WHERE role_name=?",
      [u.role],
    ),
    rules: await read(
      "SELECT p.*,g.code FROM program_rules p JOIN programs g ON g.id=p.program",
    ),
    bands: await read("SELECT * FROM grade_bands ORDER BY minimum DESC"),
    notifications: await read(
      "SELECT * FROM notifications WHERE recipient=? ORDER BY id DESC",
      [u.id],
    ),
    copies: await read(
      "SELECT c.*,b.title,ed.isbn,ed.category,ed.edition,ed.publisher,ed.published_year,(c.condition_label NOT IN ('Lost','Repair') AND NOT EXISTS(SELECT 1 FROM loan_copies lc JOIN loans l ON l.id=lc.loan WHERE lc.copy_id=c.id AND l.returned IS NULL)) available FROM book_copies c JOIN books b ON b.id=c.book LEFT JOIN book_editions ed ON ed.book=b.id",
    ),
    assessments: await by(
      "SELECT a.*,c.code FROM assessments a JOIN offerings o ON o.id=a.offering JOIN courses c ON c.id=o.course",
      "a.offering",
      own,
    ),
    sessions: await by(
      "SELECT s.*,c.code FROM class_sessions s JOIN offerings o ON o.id=s.offering JOIN courses c ON c.id=o.course",
      "s.offering",
      admin || u.role === "TEACHER"
        ? own
        : d.regs.filter((r) => r.status === "Approved").map((r) => r.offering),
    ),
    publications: await by("SELECT * FROM grade_publications", "reg", regids),
    marks: await by(
      "SELECT m.*,a.title FROM assessment_marks m JOIN assessments a ON a.id=m.assessment_id",
      "m.reg",
      u.role === "STUDENT"
        ? d.regs.filter((r) => r.published).map((r) => r.id)
        : regids,
    ),
    items: await by("SELECT * FROM invoice_items", "invoice", billids),
    feedback: await by(
      "SELECT f.*,e.thesis,e.filename FROM thesis_feedback f JOIN thesis_updates e ON e.id=f.submission",
      "e.thesis",
      tids,
    ),
    vivas: await by("SELECT * FROM thesis_vivas", "thesis", tids),
    blocks: admin
      ? await read(
          "SELECT b.*,r.name FROM room_blocks b JOIN rooms r ON r.id=b.room",
        )
      : [],
    reviews: admin
      ? await read("SELECT * FROM routine_reviews ORDER BY id DESC")
      : [],
    audits: admin
      ? await read(
          "SELECT a.*,e.reason,e.request_id,e.change_data FROM audit_logs a LEFT JOIN event_details e ON e.audit_id=a.id ORDER BY a.id DESC",
        )
      : [],
    notes: await by("SELECT n.* FROM attendance_notes n", "reg", regids),
    history: await by(
      "SELECT * FROM advisor_history",
      "student",
      admin || u.role === "ADVISOR" || u.role === "STUDENT"
        ? d.people.map((s) => s.id)
        : [],
    ),
    fineEvents: await by(
      "SELECT * FROM fine_events",
      "loan",
      d.loans.map((l) => l.id),
    ),
  };
  for (const r of d.regs) {
    const pub = extra.publications.find((p) => p.reg === r.id);
    if (pub && r.published) {
      r.grade_points = Number(pub.points);
      r.letter = pub.letter;
      r.result_state = pub.state;
    }
  }
  return extra;
}
export function extraOptions(d, u) {
  const e = d.extra,
    opts = (arr, fn) => arr.map((r) => ({ id: r.id, label: fn(r) })),
    choices = (vs) => vs.map((id) => ({ id, label: id })),
    reg = (r) => r.student_name + " · " + r.code,
    th = (t) => t.student_name + " · " + t.title;
  return {
    anyCopies: opts(e.copies, (r) => r.accession),
    conditions: choices(["Good", "Worn", "Repair", "Lost"]),
    yesNo: choices(["Yes", "No"]),
    staffAccounts: opts(
      d.staff.filter((x) => x.id !== u.id),
      (r) => r.name,
    ),
    staffRoles: choices([
      "ADMIN",
      "TEACHER",
      "ADVISOR",
      "LIBRARIAN",
      "ACCOUNTS_OFFICER",
      "THESIS_SUPERVISOR",
    ]),
    sectionStates: choices(["Active", "Closed"]),
    sessionStates: choices(["Held", "Cancelled"]),
    categories: choices(["Midterm", "Final", "Quiz", "Assignment", "Lab"]),
    tests: opts(e.assessments, (a) => a.code + " · " + a.title),
    publishedRegs: opts(
      d.regs.filter((r) => r.published),
      reg,
    ),
    invoices: opts(d.bills, (r) => r.student_name + " · " + r.label),
    validReceipts: opts(
      d.payments.filter((r) => r.state === "Valid"),
      (r) => r.reference,
    ),
    pendingWaivers: opts(
      d.payments.filter((r) => r.state === "Pending"),
      (r) => r.reference,
    ),
    waiverDecisions: choices(["Approved", "Rejected"]),
    allNotices: opts(d.notices, (r) => r.title),
    noticeStates: choices(["Draft", "Published", "Archived"]),
    unseen: opts(
      e.notifications.filter((n) => !n.seen),
      (r) => r.message,
    ),
    allBooks: opts(d.books, (r) => r.title),
    freeCopies: opts(
      e.copies.filter((c) => c.available),
      (c) => c.accession + " · " + c.title,
    ),
    fineLoans: opts(
      d.loans.filter((l) => l.returned),
      (l) => l.borrower + " · " + l.title,
    ),
    fineStates: choices(["Adjusted", "Paid", "Waived"]),
    rooms: opts(d.rooms, (r) => r.name),
    roomStates: choices(["Unavailable", "Available"]),
    draftClasses: d.routine
      .filter((r) => !r.published)
      .map((r) => ({ id: r.offering, label: r.code + " · " + r.section })),
    reviewable: opts(
      d.theses.filter((t) => ["Submitted", "Approved"].includes(t.status)),
      th,
    ),
    submissions: opts(
      d.updates.filter((x) => x.filename),
      (r) => r.filename + " · #" + r.id,
    ),
    finalTheses: opts(
      d.theses.filter((t) => t.status === "Final submitted"),
      th,
    ),
    scheduledTheses: opts(
      d.theses.filter((t) => t.status === "Defense scheduled"),
      th,
    ),
    outcomes: choices(["Passed", "Revision required"]),
  };
}
export function addTables(groups, table, d, u) {
  const e = d.extra,
    add = (group, name, cols, items) => {
      if (groups[group]) groups[group].tables.push(table(name, cols, items));
    };
  groups.Notifications = {
    tables: [
      table("My notifications", "message seen created", e.notifications),
    ],
    forms: [],
  };
  if (u.role === "ADMIN")
    groups.Administration = {
      tables: [
        table(
          "Program policy",
          "code credit_limit loan_limit fine_rate block_overdue degree duration",
          e.rules,
        ),
        table("Grading boundaries", "program minimum letter points", e.bands),
        table(
          "Audit log",
          "actor_id action resource record_id reason change_data request_id created_at",
          e.audits,
        ),
      ],
      forms: [],
    };
  add(
    "Registration",
    "Registration history",
    "reg state comment_text created",
    e.regHistory,
  );
  add(
    "Thesis",
    "Project history",
    "thesis state note created",
    e.thesisHistory,
  );
  add(
    "Thesis",
    "Supervisor assignments",
    "thesis supervisor created",
    e.supervision,
  );
  if (u.role === "ADMIN")
    add("Routine", "Scheduling conflicts", "term reason created", e.conflicts);
  add("Teaching", "Class sessions", "code day status", e.sessions);
  add(
    "Teaching",
    "Attendance corrections",
    "reg previous_status new_status reason created",
    e.notes,
  );
  add(
    "Teaching",
    "Assessments",
    "code title category maximum weight due",
    e.assessments,
  );
  add("Teaching", "Assessment marks", "title reg mark", e.marks);
  add("People", "Advisor assignments", "student advisor effective", e.history);
  add("Finance", "Invoice items", "invoice label amount", e.items);
  add(
    "Library",
    "Physical copies",
    "title isbn category edition publisher published_year accession condition_label available",
    e.copies,
  );
  add(
    "Library",
    "Fine history",
    "loan status amount reason created",
    e.fineEvents,
  );
  add("Routine", "Room availability exceptions", "name slot reason", e.blocks);
  add("Routine", "Review history", "term state actor created", e.reviews);
  add(
    "Thesis",
    "Feedback by submission version",
    "submission filename note created",
    e.feedback,
  );
  add(
    "Thesis",
    "Viva schedule and outcome",
    "thesis day room outcome",
    e.vivas,
  );
}
export async function runExtra(db, u, d, key, b) {
  const q = async (sql, ...args) => (await db.execute(sql, args))[0],
    e = d.extra;
  switch (key) {
    case "coauthor":
      await q("INSERT IGNORE INTO authors(name) VALUES(?)", b.name);
      await q(
        "INSERT IGNORE INTO book_authors SELECT ?,id FROM authors WHERE name=?",
        b.book,
        b.name,
      );
      break;
    case "settings": {
      try {
        if (b.timezone_name.length > 80 || b.date_locale.length > 30)
          bad("Invalid display settings.");
        new Intl.DateTimeFormat(b.date_locale, {
          timeZone: b.timezone_name,
        }).format(new Date());
        new Intl.NumberFormat(b.date_locale, {
          style: "currency",
          currency: b.currency_code,
        }).format(1);
      } catch {
        bad("Use a valid timezone, locale and currency code.");
      }
      if (!/^[A-Z]{3}$/.test(b.currency_code))
        bad("Use a three-letter currency code.");
      await q(
        "UPDATE campus_settings SET timezone_name=?,date_locale=?,currency_code=? WHERE id=1",
        b.timezone_name,
        b.date_locale,
        b.currency_code,
      );
      break;
    }
    case "book_metadata":
      if (
        (b.isbn && !/^[0-9X-]{10,17}$/.test(b.isbn)) ||
        b.published_year < 1000 ||
        b.published_year > 9999 ||
        b.category.length > 80 ||
        b.edition.length > 40 ||
        b.publisher.length > 120
      )
        bad("Check ISBN, year and edition details.");
      if (
        b.isbn &&
        (
          await q(
            "SELECT book FROM book_editions WHERE isbn=? AND book<>?",
            b.isbn,
            b.book,
          )
        ).length
      )
        bad("ISBN is already assigned.");
      await q(
        "INSERT INTO book_editions VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE isbn=VALUES(isbn),category=VALUES(category),edition=VALUES(edition),publisher=VALUES(publisher),published_year=VALUES(published_year)",
        b.book,
        b.isbn || null,
        b.category,
        b.edition,
        b.publisher,
        b.published_year,
      );
      break;
    case "copy_condition":
      await q(
        "UPDATE book_copies SET condition_label=? WHERE id=?",
        b.condition,
        b.copy,
      );
      break;
    case "room_metadata":
      if (b.building.length > 80) bad("Building name is too long.");
      if (
        (
          await q(
            "SELECT room FROM room_details WHERE code=? AND room<>?",
            b.code,
            b.room,
          )
        ).length
      )
        bad("Room code is already in use.");
      if (
        b.status === "Closed" &&
        d.routine.some((r) => r.room === b.room && r.published)
      )
        bad("Move published classes first.");
      await q(
        "INSERT INTO room_details VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE code=VALUES(code),building=VALUES(building),department=VALUES(department),active=VALUES(active)",
        b.room,
        b.code,
        b.building,
        b.department,
        b.status === "Active",
      );
      break;
    case "fee_rule":
      if (b.category.length > 60) bad("Fee category is too long.");
      await q(
        "INSERT INTO fee_rules VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE program=VALUES(program),term=VALUES(term),category=VALUES(category),active=VALUES(active)",
        b.fee,
        b.program,
        b.term,
        b.category,
        b.status === "Active",
      );
      break;
    case "course_summary":
      await q(
        "INSERT INTO course_descriptions VALUES(?,?) ON DUPLICATE KEY UPDATE description=VALUES(description)",
        b.course,
        b.description,
      );
      break;
    case "min_grade":
      if (
        b.minimum > 4 ||
        !d.requirements.some(
          (r) =>
            r.course === b.course && r.required_course === b.required_course,
        )
      )
        bad(
          "Select an existing prerequisite pair and grade points from 0 to 4.",
        );
      await q(
        "INSERT INTO prerequisite_grades VALUES(?,?,?) ON DUPLICATE KEY UPDATE minimum=VALUES(minimum)",
        b.course,
        b.required_course,
        b.minimum,
      );
      break;
    case "policy":
      if (b.degree.length > 60 || b.duration > 20)
        bad("Check the duration in years.");
      await q(
        "INSERT INTO program_rules(program,credit_limit,loan_limit,fine_rate,block_overdue,degree,duration) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE credit_limit=VALUES(credit_limit),loan_limit=VALUES(loan_limit),fine_rate=VALUES(fine_rate),block_overdue=VALUES(block_overdue),degree=VALUES(degree),duration=VALUES(duration)",
        b.program,
        b.credit_limit,
        b.loan_limit,
        b.fine_rate,
        b.overdue === "Yes",
        b.degree,
        b.duration,
      );
      break;
    case "grade_band":
      if (b.points > 4 || b.letter.length > 12)
        bad(
          "Grade points must be within 0–4 and the label within 12 characters.",
        );
      await q(
        "INSERT INTO grade_bands(program,minimum,letter,points) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE letter=VALUES(letter),points=VALUES(points)",
        b.program,
        b.minimum,
        b.letter,
        b.points,
      );
      break;
    case "change_role": {
      const current = d.staff.find((s) => s.id === b.account);
      if (current.role !== b.role) {
        const deps = await q(
          "SELECT 1 FROM offerings WHERE teacher=? UNION SELECT 1 FROM advising WHERE advisor=? UNION SELECT 1 FROM theses WHERE supervisor=?",
          b.account,
          b.account,
          b.account,
        );
        if (deps.length)
          bad(
            "Reassign current teaching, advisory or supervision responsibilities first.",
          );
        await q("UPDATE users SET role=? WHERE id=?", b.role, b.account);
        await q("DELETE FROM sessions WHERE user_id=?", b.account);
      }
      break;
    }
    case "admission":
      await q(
        "INSERT INTO student_details(student,admission) VALUES(?,?) ON DUPLICATE KEY UPDATE admission=VALUES(admission)",
        b.student,
        b.term,
      );
      break;
    case "employee":
      if (b.employee_no.length > 32)
        bad("Employee number exceeds 32 characters.");
      if (
        (
          await q(
            "SELECT id FROM faculty_details WHERE employee_no=? AND teacher<>?",
            b.employee_no,
            b.teacher,
          )
        ).length
      )
        bad("Employee number already assigned.");
      await q(
        "INSERT INTO faculty_details(teacher,employee_no) VALUES(?,?) ON DUPLICATE KEY UPDATE employee_no=VALUES(employee_no)",
        b.teacher,
        b.employee_no,
      );
      break;
    case "section_state":
      await q(
        "INSERT INTO section_details(offering,status) VALUES(?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)",
        b.offering,
        b.status,
      );
      break;
    case "class_session": {
      const o = d.offerings.find((o) => o.id === b.offering);
      if (b.day < o.starts_on || b.day > o.ends_on || b.day > today())
        bad("Choose a valid past or current teaching date.");
      await q(
        "INSERT INTO class_sessions(offering,day,status,actor) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),actor=VALUES(actor)",
        o.id,
        b.day,
        b.status,
        u.id,
      );
      break;
    }
    case "assessment": {
      if (
        b.weight <= 0 ||
        e.assessments
          .filter((a) => a.offering === b.offering)
          .reduce((n, a) => n + Number(a.weight), b.weight) > 100 ||
        d.regs.some((r) => r.offering === b.offering && r.published)
      )
        bad("Weights must fit within 100% before publication.");
      await q(
        "INSERT INTO assessments(offering,title,category,maximum,weight,due) VALUES(?,?,?,?,?,?)",
        b.offering,
        b.title,
        b.category,
        b.maximum,
        b.weight,
        b.due,
      );
      break;
    }
    case "assessment_mark": {
      const a = e.assessments.find((a) => a.id === b.assessment),
        r = d.regs.find((r) => r.id === b.reg);
      if (a.offering !== r.offering || b.mark > Number(a.maximum))
        bad("Check section ownership and maximum marks.");
      await q(
        "INSERT INTO assessment_marks(assessment_id,reg,mark,actor) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE mark=VALUES(mark),actor=VALUES(actor)",
        a.id,
        r.id,
        b.mark,
        u.id,
      );
      await q("DELETE FROM results WHERE reg=? AND published=0", b.reg);
      break;
    }
    case "calculate": {
      const r = d.regs.find((r) => r.id === b.reg),
        as = e.assessments.filter((a) => a.offering === r.offering);
      if (
        Math.round(as.reduce((n, a) => n + Number(a.weight), 0) * 100) !== 10000
      )
        bad("Assessment weights must total 100%.");
      let total = 0;
      for (const a of as) {
        const m = e.marks.find(
          (m) => m.reg === r.id && m.assessment_id === a.id,
        );
        if (!m) bad("Enter all assessment marks first.");
        total += (m.mark / a.maximum) * a.weight;
      }
      total = Math.round(total * 100) / 100;
      await q(
        "INSERT INTO results VALUES(?,?,?,0) ON DUPLICATE KEY UPDATE assessment=VALUES(assessment),exam=VALUES(exam)",
        r.id,
        total,
        total,
      );
      break;
    }
    case "lock_result":
      await q(
        "UPDATE grade_publications SET state='Locked',actor=? WHERE reg=?",
        u.id,
        b.reg,
      );
      break;
    case "reopen":
      await q("UPDATE results SET published=0 WHERE reg=?", b.reg);
      await q(
        "UPDATE grade_publications SET state='Draft',actor=? WHERE reg=?",
        u.id,
        b.reg,
      );
      break;
    case "add_item":
      await q(
        "INSERT INTO invoice_items(invoice,label,amount) VALUES(?,?,?)",
        b.invoice,
        b.label,
        b.amount,
      );
      await q(
        "UPDATE invoices SET amount=amount+? WHERE id=?",
        b.amount,
        b.invoice,
      );
      break;
    case "waiver_review": {
      const r = d.payments.find((p) => p.id === b.receipt),
        inv = d.bills.find((i) => i.id === r.invoice);
      if (b.decision === "Approved" && Number(r.amount) > Number(inv.balance))
        bad("Waiver exceeds current balance.");
      await q(
        "UPDATE receipt_details SET state=?,reason=?,reviewer=? WHERE receipt=?",
        b.decision === "Approved" ? "Valid" : "Rejected",
        b.reason,
        u.id,
        b.receipt,
      );
      break;
    }
    case "void_receipt":
      await q(
        "UPDATE receipt_details SET state='Void',reviewer=?,reason=? WHERE receipt=?",
        u.id,
        b.reason,
        b.receipt,
      );
      break;
    case "notice_state":
      if (b.ends < b.starts) bad("End date precedes start.");
      await q(
        "INSERT INTO notice_details(notice,state,starts,ends,filename,document) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE state=VALUES(state),starts=VALUES(starts),ends=VALUES(ends),filename=COALESCE(VALUES(filename),filename),document=COALESCE(VALUES(document),document)",
        b.notice,
        b.state,
        b.starts,
        b.ends,
        b.document?.name ?? null,
        b.document ? Buffer.from(b.document.data, "base64") : null,
      );
      break;
    case "acknowledge":
      await q(
        "UPDATE notifications SET seen=1 WHERE id=? AND recipient=?",
        b.notification,
        u.id,
      );
      break;
    case "copy":
      if (b.accession.length > 70) bad("Accession number too long.");
      await q(
        "INSERT INTO book_copies(book,accession) VALUES(?,?)",
        b.book,
        b.accession,
      );
      await q("UPDATE books SET copies=copies+1 WHERE id=?", b.book);
      break;
    case "issue_copy":
    case "issue": {
      const copy =
          key === "issue_copy"
            ? e.copies.find((c) => c.id === b.copy && c.available)
            : e.copies.find((c) => c.book === b.book && c.available),
        p = d.people.find((s) => s.id === b.student),
        policy = e.rules.find((x) => x.program === p.program_id),
        open = d.loans.filter((l) => l.student === b.student && !l.returned);
      if (
        !copy ||
        p.status !== "ACTIVE" ||
        b.due < today() ||
        open.length >= (policy?.loan_limit ?? 3) ||
        ((policy?.block_overdue ?? 1) && open.some((l) => l.due < today()))
      )
        bad(
          "Check copy availability, student status, due date and borrowing policy.",
        );
      const l = await q(
        "INSERT INTO loans(book,student,issued,due) VALUES(?,?,?,?)",
        copy.book,
        b.student,
        today(),
        b.due,
      );
      await q(
        "INSERT INTO loan_copies(loan,copy_id) VALUES(?,?)",
        l.insertId,
        copy.id,
      );
      break;
    }
    case "fine":
      if (
        b.state !== "Adjusted" &&
        Number(d.loans.find((l) => l.id === b.loan).fine) !== b.amount
      )
        bad("Settlement must match the outstanding fine.");
      await q(
        "INSERT INTO fine_events(loan,actor,status,amount,reason) VALUES(?,?,?,?,?)",
        b.loan,
        u.id,
        b.state,
        b.amount,
        b.reason,
      );
      await q(
        "UPDATE loans SET fine=? WHERE id=?",
        b.state === "Adjusted" ? b.amount : 0,
        b.loan,
      );
      break;
    case "room_block":
      if (b.status === "Available")
        await q(
          "DELETE FROM room_blocks WHERE room=? AND slot=?",
          b.room,
          b.slot,
        );
      else {
        if (
          d.routine.some(
            (r) => r.published && r.room === b.room && r.slot === b.slot,
          )
        )
          bad("Room has a published class in this slot.");
        await q(
          "INSERT INTO room_blocks(room,slot,reason) VALUES(?,?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason)",
          b.room,
          b.slot,
          b.reason,
        );
      }
      break;
    case "thesis_draft":
    case "topic": {
      const t = d.theses.find((t) => t.student === u.id);
      if (t && !["Draft", "Revision requested"].includes(t.status))
        bad("Your proposal is already under review.");
      await q(
        "INSERT INTO theses(student,title,proposal,status) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),proposal=VALUES(proposal),status=VALUES(status)",
        u.id,
        b.title,
        b.proposal,
        key === "topic" ? "Submitted" : "Draft",
      );
      break;
    }
    case "revision":
      await q(
        "UPDATE theses SET status='Revision requested' WHERE id=?",
        b.thesis,
      );
      await q(
        "INSERT INTO thesis_updates(thesis,actor,note) VALUES(?,?,?)",
        b.thesis,
        u.id,
        b.note,
      );
      break;
    case "feedback":
      await q(
        "INSERT INTO thesis_feedback(submission,actor,note) VALUES(?,?,?)",
        b.submission,
        u.id,
        b.note,
      );
      break;
    case "final_submit": {
      const t = d.theses.find((t) => t.id === b.thesis);
      if (
        !b.document ||
        !["In progress", "Draft reviewed", "Revision requested"].includes(
          t.status,
        )
      )
        bad("Final submission requires an in-progress project and a PDF.");
      await q(
        "INSERT INTO thesis_updates(thesis,actor,note,filename,document) VALUES(?,?,?,?,?)",
        t.id,
        u.id,
        b.note,
        b.document.name,
        Buffer.from(b.document.data, "base64"),
      );
      await q("UPDATE theses SET status='Final submitted' WHERE id=?", t.id);
      break;
    }
    case "viva":
      if (b.day < today() || b.room_name.length > 80)
        bad("Choose a current or future date and a room.");
      await q(
        "INSERT INTO thesis_vivas(thesis,day,room,outcome) VALUES(?,?,?,'Scheduled') ON DUPLICATE KEY UPDATE day=VALUES(day),room=VALUES(room),outcome='Scheduled'",
        b.thesis,
        b.day,
        b.room_name,
      );
      await q(
        "UPDATE theses SET status='Defense scheduled' WHERE id=?",
        b.thesis,
      );
      break;
    case "outcome": {
      const viva = e.vivas.find((v) => v.thesis === b.thesis);
      if (!viva || viva.day > today())
        bad("The scheduled viva must take place first.");
      await q(
        "UPDATE thesis_vivas SET outcome=? WHERE thesis=?",
        b.outcome,
        b.thesis,
      );
      await q(
        "UPDATE theses SET status=? WHERE id=?",
        b.outcome === "Passed" ? "Defended" : "In progress",
        b.thesis,
      );
      await q(
        "INSERT INTO thesis_updates(thesis,actor,note) VALUES(?,?,?)",
        b.thesis,
        u.id,
        b.note,
      );
      break;
    }
    default:
      return false;
  }
  return true;
}
export async function publishGrade(db, u, d, r) {
  let scale = d.extra.bands.filter(
    (g) => g.program === d.offerings.find((o) => o.id === r.offering).program,
  );
  if (!scale.length)
    scale = bands.map(([minimum, letter, points]) => ({
      minimum,
      letter,
      points,
    }));
  const mark = score(r),
    band = scale.find((g) => g.minimum <= mark);
  if (!band) bad("The grading policy needs a band covering this mark.");
  await db.execute(
    "INSERT INTO grade_publications(reg,letter,points,mark,state,actor) VALUES(?,?,?,?,'Published',?) ON DUPLICATE KEY UPDATE letter=VALUES(letter),points=VALUES(points),mark=VALUES(mark),state='Published',actor=VALUES(actor)",
    [r.id, band.letter, band.points, mark, u.id],
  );
}
export function validPublication(d, r) {
  const planned = d.extra.assessments.filter((a) => a.offering === r.offering);
  if (!planned.length) return;
  if (
    Math.round(planned.reduce((n, a) => n + Number(a.weight), 0) * 100) !==
    10000
  )
    bad("Complete the assessment plan before publication.");
  const total = planned.reduce((n, a) => {
    const m = d.extra.marks.find(
      (m) => m.reg === r.id && m.assessment_id === a.id,
    );
    if (!m) bad("The student has missing assessment marks.");
    return n + (m.mark / a.maximum) * a.weight;
  }, 0);
  if (Math.round(total * 100) !== Math.round(score(r) * 100))
    bad("Recalculate the current draft before publication.");
}
