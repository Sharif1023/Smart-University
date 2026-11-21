import { addTables } from "./blueprint.js";
const phase4 = () => process.env.ENABLE_PHASE4 === "true";
import { Router } from "express";
import { pool, transaction } from "../db.js";
import { fail } from "../security.js";
import { actions, options } from "./forms.js";
import {
  rows,
  records,
  score,
  points,
  performance,
  slots,
  today,
  eligible,
} from "./records.js";
import { mutate } from "./mutate.js";
const table = (title, columns, items) => ({
  title,
  columns: columns.split(" "),
  items: items.map((x) =>
    Object.fromEntries(columns.split(" ").map((k) => [k, x[k] ?? null])),
  ),
});
const staffList = (db, u) =>
  u.role === "ADMIN"
    ? rows(db, "SELECT id,name,email,active FROM users WHERE role='STUDENT'")
    : Promise.resolve([]);
async function insights(db, u, d) {
  const training =
    phase4() && ["STUDENT", "ADMIN", "ADVISOR"].includes(u.role)
      ? await rows(
          db,
          "SELECT r.id,r.student,t.ends_on term_end,COALESCE(mp.coursework_weight,40) weight,g.assessment,g.exam,AVG(a.present)*100 attendance FROM results g JOIN registrations r ON r.id=g.reg JOIN offerings o ON o.id=r.offering JOIN semesters t ON t.id=o.term LEFT JOIN marking_policy mp ON mp.offering=o.id JOIN attendance a ON a.reg=r.id WHERE g.published=1 AND r.status='Approved' GROUP BY r.id,r.student,t.ends_on,mp.coursework_weight,g.assessment,g.exam",
        )
      : [];
  const summaries = [],
    forecasts = [],
    recommendations = [],
    terms = [];
  if (["STUDENT", "ADMIN", "ADVISOR"].includes(u.role))
    for (const s of d.people) {
      const own = d.regs.filter((r) => r.student === s.id),
        p = performance(own, training);
      summaries.push({
        student: s.name,
        cgpa: p.cgpa,
        earned: p.earned,
        remaining: Math.max(0, s.required_credits - p.earned),
        advisor: s.advisor_name,
      });
      for (const semester of new Set(own.map((r) => r.semester)))
        terms.push({
          student: s.name,
          semester,
          gpa: performance(
            own.filter((r) => r.semester === semester),
            [],
          ).cgpa,
        });
      if (!phase4()) continue;
      const failed = own.filter((r) => r.published && score(r) < 40);
      const repeated = failed.find(
        (r) => failed.filter((t) => t.course === r.course).length > 1,
      );
      const termGpas = terms.filter(
        (t) => t.student === s.name && t.gpa != null,
      );
      if (
        repeated ||
        (termGpas.length > 1 && termGpas[0].gpa < termGpas[1].gpa)
      )
        forecasts.push({
          student: s.name,
          course: repeated?.code ?? "All courses",
          warning: repeated
            ? "Repeated course failure"
            : "Semester GPA declined",
        });
      forecasts.push(...p.forecasts.map((f) => ({ ...f, student: s.name })));
      const suitable = d.offerings
        .filter(
          (o) =>
            eligible(s, o, own, d.requirements) &&
            o.closes_on >= today() &&
            o.enrolled < o.capacity,
        )
        .sort((a, b) =>
          p.cgpa != null && p.cgpa < 2.5
            ? a.credits - b.credits
            : a.opens_on.localeCompare(b.opens_on),
        );
      recommendations.push(
        ...suitable.map((o) => ({
          student: s.name,
          course: o.code,
          section: o.section,
          semester: o.semester,
          credits: o.credits,
          seats: o.capacity - o.enrolled,
          reason:
            p.cgpa != null && p.cgpa < 2.5
              ? "Eligible · lower credit load first"
              : "Program and batch match · prerequisites satisfied",
        })),
      );
    }
  return { summaries, forecasts, recommendations, terms };
}
function view(u, d, i, list) {
  const groups = {},
    sec = (name, ...tables) => {
      groups[name] = { tables, forms: [] };
    };
  const role = u.role,
    admin = role === "ADMIN",
    student = role === "STUDENT",
    advisor = role === "ADVISOR",
    teacher = role === "TEACHER",
    finance = admin || role === "ACCOUNTS_OFFICER",
    lib = admin || role === "LIBRARIAN";
  const regs = d.regs.map((r) => ({
    ...r,
    mark: r.assessment == null ? null : score(r),
    grade_points:
      r.assessment == null ? null : (r.grade_points ?? points(score(r))),
    publication: r.published
      ? "Published"
      : r.assessment != null
        ? "Draft"
        : "—",
  }));
  const routine = d.routine.map((r) => ({
    ...r,
    time: slots[r.slot - 1].label,
    status: r.published
      ? "Published"
      : (d.extra.reviews.find((v) => v.term === r.term)?.state ?? "Draft"),
  }));
  if (admin || advisor || teacher || student)
    sec(
      "People",
      table(
        "Student profiles",
        "student_no name batch admission status advisor_name",
        d.people,
      ),
      table(
        "Faculty directory",
        "name role employee_no designation department_id",
        d.staff,
      ),
    );
  if (admin || advisor || teacher || student) {
    sec(
      "Registration",
      table("Registrations", "student_name code semester section status", regs),
      table(
        "Section directory",
        "code course_name description semester section section_status instructor batch capacity enrolled opens_on closes_on",
        d.offerings,
      ),
      table("Prerequisites", "course required_code minimum", d.requirements),
    );
    sec(
      "Teaching",
      table(
        "Assessment and results",
        "student_name code semester assessment exam weight mark letter grade_points result_state publication attendance",
        regs.filter((r) => r.status === "Approved"),
      ),
      table("Course materials", "code title url", d.materials),
      table(
        "Attendance register",
        "student_name code day status session_status",
        d.attendance.map((a) => ({
          ...a,
          status: a.mark_status,
        })),
      ),
    );
  }
  if (finance || student)
    sec(
      "Finance",
      ...(finance
        ? [
            table(
              "Fee structure · BDT",
              "label category program term active amount",
              d.feeTypes,
            ),
          ]
        : []),
      table(
        "Invoices · BDT",
        "student_name label term issued amount balance due status",
        d.bills.map((b) => ({
          ...b,
          status:
            Number(b.balance) === 0
              ? "Paid"
              : Number(b.balance) < Number(b.amount)
                ? "Partially paid"
                : "Unpaid",
        })),
      ),
      table(
        "Payments and waivers · BDT",
        "student_name label kind amount reference method state recorded",
        d.payments,
      ),
    );
  sec(
    "Notices",
    table(
      "Noticeboard",
      "id title body audience state read_status filename starts ends created",
      d.notices,
    ),
  );
  sec(
    "Library",
    table(
      "Search catalogue",
      "code title authors author copies available",
      d.books,
    ),
    ...(lib || student
      ? [
          table(
            "Borrowing history",
            "borrower title accession issued due loan_status fine_bdt",
            d.loans,
          ),
        ]
      : []),
  );
  sec(
    "Routine",
    table(
      "Weekly timetable",
      "code section instructor room_name time status",
      routine,
    ),
    ...(admin
      ? [table("Rooms", "code name building kind capacity active", d.rooms)]
      : []),
    ...(teacher || admin
      ? [
          table(
            "Teaching availability exceptions",
            "teacher time",
            d.blocked.map((x) => ({ ...x, time: slots[x.slot - 1].label })),
          ),
        ]
      : []),
  );
  if (admin || student || role === "THESIS_SUPERVISOR")
    sec(
      "Thesis",
      table(
        "Thesis projects",
        "student_name title proposal supervisor_name status",
        d.theses,
      ),
      table(
        "Submissions and feedback",
        "id thesis author note filename created",
        d.updates,
      ),
    );
  sec(
    "Analytics",
    ...(i.summaries.length
      ? [
          table(
            "Academic standing",
            "student cgpa earned remaining advisor",
            i.summaries,
          ),
          table("GPA by semester", "student semester gpa", i.terms),
        ]
      : []),
    ...(phase4() && (admin || advisor || student)
      ? [
          table(
            "Performance estimates and early warnings",
            "student course attendance prediction neighbors warning",
            i.forecasts,
          ),
          table(
            "Recommended sections",
            "student course semester section credits seats reason",
            i.recommendations,
          ),
        ]
      : []),
  );
  if (admin)
    groups.People.tables.unshift(
      table("Accounts", "id name email role active", [
        ...d.staff,
        ...list.map((x) => ({ ...x, role: "STUDENT" })),
      ]),
    );
  if (teacher)
    groups.Teaching.tables.unshift(
      table(
        "My sections",
        "code course_name semester section enrolled",
        d.offerings.filter((o) => o.teacher === u.id),
      ),
    );
  const metrics = [];
  const metric = (label, value) => metrics.push({ label, value });
  if (admin || advisor || teacher || student) {
    metric(
      "Approved registrations",
      regs.filter((r) => r.status === "Approved").length,
    );
    metric("Published results", regs.filter((r) => r.published).length);
    if (d.attendance.length)
      metric(
        "Attendance",
        Math.round(
          (d.attendance.filter((r) => r.present).length * 100) /
            d.attendance.length,
        ) + "%",
      );
  }
  if (admin || advisor) metric("Student profiles", d.people.length);
  if (teacher)
    metric(
      "Assigned sections",
      d.offerings.filter((o) => o.teacher === u.id).length,
    );
  if (finance || student) {
    metric(
      "Outstanding BDT",
      d.bills.reduce((s, b) => s + Number(b.balance), 0).toFixed(2),
    );
    metric(
      "Payments BDT",
      d.payments
        .filter((p) => p.kind === "Payment" && p.state === "Valid")
        .reduce((s, p) => s + Number(p.amount), 0)
        .toFixed(2),
    );
  }
  if (lib || student)
    metric("Open loans", d.loans.filter((l) => !l.returned).length);
  if (admin || role === "THESIS_SUPERVISOR")
    metric("Thesis projects", d.theses.length);
  metric(
    "Unread notices",
    d.notices.filter((n) => n.read_status === "Unread").length,
  );
  addTables(groups, table, d, u);
  const lists = options(d, list, u);
  for (const [key, s] of Object.entries(actions))
    if (
      groups[s.section] &&
      d.extra.permissions.some((p) => p.permission_name === key) &&
      s.roles.some((r) => r === "*" || r === role)
    )
      groups[s.section].forms.push({
        key,
        title: s.title,
        fields: s.fields.map((f) => ({ ...f, choices: lists[f.type] })),
      });
  return { groups, metrics, settings: d.extra.settings, phase4: phase4() };
}
export const operations = Router();
operations.get("/", async (req, res) => {
  const d = await records(pool, req.user);
  res.json({
    data: view(
      req.user,
      d,
      await insights(pool, req.user, d),
      await staffList(pool, req.user),
    ),
  });
});
operations.get("/list/:section/:table", async (req, res) => {
  const page = Number(req.query.page ?? 1),
    pageSize = Number(req.query.pageSize ?? 20);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  )
    fail(
      422,
      "INVALID_PAGE",
      "Use a positive page number and page size from 1 to 100.",
    );
  const d = await records(pool, req.user),
    w = view(
      req.user,
      d,
      await insights(pool, req.user, d),
      await staffList(pool, req.user),
    );
  const g = w.groups[req.params.section]?.tables?.find(
    (t) => t.title === req.params.table,
  );
  if (!g) fail(404, "NOT_FOUND", "Table unavailable.");
  const search = String(req.query.search ?? "")
      .slice(0, 160)
      .toLowerCase(),
    state = String(req.query.status ?? "");
  let items = g.items.filter(
    (row) =>
      (!search ||
        Object.values(row).join(" ").toLowerCase().includes(search)) &&
      (!state || [row.status, row.state, row.publication].includes(state)),
  );
  const order = String(req.query.sort ?? "");
  if (order) {
    const desc = order.startsWith("-"),
      k = desc ? order.slice(1) : order;
    if (!g.columns.includes(k))
      fail(422, "INVALID_SORT", "Choose a visible column.");
    items = items.sort(
      (a, b) =>
        (desc ? -1 : 1) *
        String(a[k] ?? "").localeCompare(String(b[k] ?? ""), undefined, {
          numeric: true,
        }),
    );
  }
  res.json({
    data: items.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total: items.length },
  });
});
operations.post("/action/:key", async (req, res) => {
  try {
    await transaction(async (db) => {
      await db.query("SELECT id FROM workflow_lock WHERE id=1 FOR UPDATE");
      const d = await records(db, req.user);
      await mutate(
        db,
        req.user,
        d,
        await staffList(db, req.user),
        req.params.key,
        req.body,
        req.requestId,
      );
    });
  } catch (error) {
    if (
      req.user.role === "ADMIN" &&
      ["generate", "review_routine", "release"].includes(req.params.key) &&
      error.status === 422 &&
      /^No valid slot/.test(error.message)
    )
      await pool.execute(
        "INSERT INTO routine_conflicts(term,actor,reason) VALUES(?,?,?)",
        [req.body.term, req.user.id, error.message.slice(0, 250)],
      );
    throw error;
  }
  res.json({ data: true });
});
operations.get("/notice-file/:id", async (req, res) => {
  const d = await records(pool, req.user);
  if (!d.notices.some((n) => String(n.id) === req.params.id && n.filename))
    fail(404, "NOT_FOUND", "Attachment unavailable.");
  const [f] = await rows(
    pool,
    "SELECT filename,document FROM notice_details WHERE notice=?",
    [req.params.id],
  );
  res
    .attachment(f.filename.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .type("application/pdf")
    .send(f.document);
});
operations.get("/file/:id", async (req, res) => {
  const [file] = await rows(
    pool,
    "SELECT e.document,e.filename FROM thesis_updates e JOIN theses t ON t.id=e.thesis WHERE e.id=? AND e.document IS NOT NULL AND (CAST(? AS CHAR)='ADMIN' OR t.student=? OR t.supervisor=?)",
    [req.params.id, req.user.role, req.user.id, req.user.id],
  );
  if (!file) fail(404, "NOT_FOUND", "Document unavailable.");
  res
    .attachment(file.filename.replace(/[^a-zA-Z0-9._-]/g, "_"))
    .type("application/pdf")
    .send(file.document);
});
operations.post("/ask", async (req, res) => {
  if (!phase4()) fail(404, "DEFERRED", "This service is outside Phase 1–3.");
  const q = String(req.body.question ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 400),
    d = await records(pool, req.user),
    i = await insights(pool, req.user, d),
    ui = view(req.user, d, i, []),
    summary = i.summaries[0],
    personal = req.user.role === "STUDENT";
  const lines = (items, fn) =>
    items.slice(0, 15).map(fn).join("\n") || "No matching records yet.";
  let answer;
  if (/attendance|উপস্থিতি/.test(q)) {
    const code = q.toUpperCase().replace(/\s/g, "");
    const match = d.regs.filter((r) =>
      code.includes(r.code.toUpperCase().replace(/\s/g, "")),
    );
    const specific = /[a-z]{2,}\s*\d{2,}/i.test(q);
    answer = lines(
      (specific ? match : d.regs).filter((r) => r.status === "Approved"),
      (r) =>
        r.student_name +
        " · " +
        r.code +
        ": " +
        (r.attendance == null ? "No classes recorded" : r.attendance + "%"),
    );
  } else if (/routine|tomorrow|class|রুটিন/.test(q)) {
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
      new Date(Date.parse(today()) + 86400000).getUTCDay()
    ];
    answer = lines(
      d.routine.filter(
        (r) =>
          r.published &&
          (!/tomorrow|আগামীকাল/.test(q) ||
            (slots[r.slot - 1].label.startsWith(day) &&
              d.offerings.some(
                (o) =>
                  o.id === r.offering &&
                  o.starts_on <=
                    new Date(Date.parse(today()) + 86400000)
                      .toISOString()
                      .slice(0, 10) &&
                  o.ends_on >=
                    new Date(Date.parse(today()) + 86400000)
                      .toISOString()
                      .slice(0, 10),
              ))),
      ),
      (r) => r.code + " · " + slots[r.slot - 1].label + " · " + r.room_name,
    );
  } else if (/fee|due|balance|বকেয়া/.test(q) && ui.groups.Finance)
    answer =
      "Outstanding fees: BDT " +
      d.bills.reduce((s, b) => s + Number(b.balance), 0).toFixed(2);
  else if (/supervisor|thesis|থিসিস/.test(q) && ui.groups.Thesis)
    answer = lines(
      d.theses,
      (t) =>
        t.title +
        " · " +
        t.status +
        " · " +
        (t.supervisor_name || "Awaiting supervisor"),
    );
  else if (/credit|cgpa|gpa|advisor|ক্রেডিট/.test(q) && personal && summary)
    answer =
      "CGPA: " +
      (summary.cgpa ?? "Awaiting publication") +
      " · Credits earned: " +
      summary.earned +
      " · Remaining: " +
      summary.remaining +
      " · Advisor: " +
      (summary.advisor || "Unassigned");
  else if (/recommend|course selection/.test(q))
    answer = lines(
      i.recommendations,
      (r) => r.course + " · " + r.semester + " · " + r.reason,
    );
  else if (/risk|warning|predict/.test(q))
    answer = lines(
      i.forecasts,
      (r) =>
        r.course +
        " · Estimate: " +
        (r.prediction ?? "insufficient history") +
        " · Warning: " +
        r.warning,
    );
  else if (/notice|announcement/.test(q))
    answer = lines(d.notices, (n) => n.title + " — " + n.body);
  else if (/book|library/.test(q))
    answer = lines(
      d.books,
      (b) => b.title + " · " + b.available + " available",
    );
  else if (/result|grade/.test(q))
    answer = lines(
      d.regs.filter((r) => r.published),
      (r) => r.code + " · " + score(r) + "/100",
    );
  else
    answer =
      "I can look up your available ERP records. Try attendance, results, class routine, notices, library books or outstanding fees.";
  res.json({ data: answer });
});
