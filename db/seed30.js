import { mapLegacy } from "./blueprint-data.js";
import { roles, today } from "../server/operations/records.js";
const subjects = [
  "Computing",
  "Electrical Engineering",
  "Business",
  "Mathematics",
  "Physics",
  "Chemistry",
  "English",
  "Economics",
  "Architecture",
  "Civil Engineering",
  "Statistics",
  "Mechanical Engineering",
  "Sociology",
  "Geography",
  "Pharmacy",
  "Biotechnology",
  "History",
  "Environmental Science",
  "Public Administration",
  "Finance",
  "Accounting",
  "Marketing",
  "Law",
  "Education",
  "Journalism",
  "Fine Arts",
  "Anthropology",
  "Oceanography",
  "Geology",
  "Urban Planning",
];
const names = [
  "Amina",
  "Rafi",
  "Nabila",
  "Sami",
  "Tasnim",
  "Arif",
  "Ishrat",
  "Farhan",
  "Nadia",
  "Fahim",
];
const surnames = ["Rahman", "Hasan", "Karim"];
function samplePdf(heading) {
  const stream = "BT /F1 14 Tf 40 760 Td (" + heading + ") Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
  ];
  let text = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((v, i) => {
    offsets.push(text.length);
    text += i + 1 + " 0 obj\n" + v + "\nendobj\n";
  });
  const x = text.length;
  text +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" +
    x +
    "\n%%EOF";
  return Buffer.from(text);
}
export async function seedThirty(db, hash) {
  const q = async (sql, ...a) => (await db.execute(sql, a))[0],
    ins = async (sql, ...a) => (await q(sql, ...a)).insertId;
  if (
    (await q("SELECT id FROM audit_logs WHERE action='SEED_THIRTY_V1' LIMIT 1"))
      .length
  )
    return;
  const day = (offset) =>
    new Date(Date.parse(today()) + offset * 86400000)
      .toISOString()
      .slice(0, 10);
  const [admin] = await q(
    "SELECT id FROM users WHERE email='admin@campus.test'",
  );
  for (let i = 0; i < 30; i++) {
    const n = String(i + 1).padStart(2, "0"),
      subject = subjects[i],
      code = "U" + n,
      year = 1995 + i,
      ids = {};
    for (const role of roles) {
      ids[role] = await ins(
        "INSERT INTO users(email,name,role,password_hash) VALUES(?,?,?,?)",
        role.toLowerCase() + n + "@demo.campus.test",
        names[i % 10] +
          " " +
          surnames[Math.floor(i / 10)] +
          " · " +
          role.toLowerCase().replaceAll("_", " "),
        role,
        hash,
      );
    }
    const student = ids.STUDENT,
      teacher = ids.TEACHER;
    const dept = await ins(
      "INSERT INTO departments(code,name) VALUES(?,?)",
      code,
      subject,
    );
    const prog = await ins(
      "INSERT INTO programs(code,name,department_id,credits) VALUES(?,?,?,?)",
      "P" + n,
      "Bachelor of " + subject,
      dept,
      120 + (i % 5) * 6,
    );
    const yr = await ins(
      "INSERT INTO academic_years(code,name,starts_on,ends_on) VALUES(?,?,?,?)",
      "H" + year,
      "Academic year " + year,
      year + "-01-01",
      year + "-12-31",
    );
    const date = (s) => year + "-" + s;
    const term = await ins(
      "INSERT INTO semesters(code,name,year_id,starts_on,ends_on,opens_on,closes_on,drop_on) VALUES(?,?,?,?,?,?,?,?)",
      "HIST" + n,
      subject + " historical spring " + year,
      yr,
      date("01-15"),
      date("06-10"),
      date("01-01"),
      date("01-20"),
      date("01-31"),
    );
    const base = await ins(
      "INSERT INTO courses(code,name,department_id,credits) VALUES(?,?,?,3)",
      code + "101",
      "Foundations of " + subject,
      dept,
    );
    const advanced = await ins(
      "INSERT INTO courses(code,name,department_id,credits) VALUES(?,?,?,3)",
      code + "201",
      "Applied " + subject,
      dept,
    );
    await q("INSERT INTO prerequisites VALUES(?,?)", advanced, base);
    await q(
      "INSERT INTO students VALUES(?,?,?,?,'ACTIVE')",
      student,
      "DEMO-" + n,
      prog,
      String(year),
    );
    await q(
      "INSERT INTO student_details(student,admission) VALUES(?,?)",
      student,
      term,
    );
    for (const role of ["TEACHER", "ADVISOR", "THESIS_SUPERVISOR"]) {
      await q("INSERT INTO faculty VALUES(?,?,?)", ids[role], dept, "Lecturer");
      await q(
        "INSERT INTO faculty_details(teacher,employee_no) VALUES(?,?)",
        ids[role],
        "EMP-" + role + "-" + n,
      );
    }
    await q("INSERT INTO advising VALUES(?,?)", student, ids.ADVISOR);
    await q(
      "INSERT INTO advisor_history(student,advisor,effective,actor) VALUES(?,?,?,?)",
      student,
      ids.ADVISOR,
      date("01-02"),
      admin.id,
    );
    const o = await ins(
      "INSERT INTO offerings(course,term,teacher,program,batch,section,capacity,kind) VALUES(?,?,?,?,?,'A',24,'Classroom')",
      base,
      term,
      teacher,
      prog,
      String(year),
    );
    const reg = await ins(
      "INSERT INTO registrations(student,offering,status) VALUES(?,?,'Approved')",
      student,
      o,
    );
    const session = await ins(
      "INSERT INTO class_sessions(offering,day,status,actor) VALUES(?,?,'Held',?)",
      o,
      date("02-01"),
      teacher,
    );
    await q("INSERT INTO attendance VALUES(?,?,1)", reg, date("02-01"));
    await q(
      "INSERT INTO attendance_notes(session_id,reg,actor,reason,previous_status,new_status) VALUES(?,?,?,'Signed register verified','Absent','Present')",
      session,
      reg,
      teacher,
    );
    for (const [title, w] of [
      ["Seminar", 40],
      ["Final examination", 60],
    ]) {
      const assess = await ins(
        "INSERT INTO assessments(offering,title,category,maximum,weight,due) VALUES(?,?,?,100,?,?)",
        o,
        title,
        title,
        w,
        date("05-20"),
      );
      await q(
        "INSERT INTO assessment_marks(assessment_id,reg,mark,actor) VALUES(?,?,?,?)",
        assess,
        reg,
        65 + (i % 25),
        teacher,
      );
    }
    await q(
      "INSERT INTO results VALUES(?,?,?,1)",
      reg,
      65 + (i % 25),
      65 + (i % 25),
    );
    await q("INSERT INTO marking_policy VALUES(?,40)", o);
    await q(
      "INSERT INTO materials(offering,title,url) VALUES(?,?,?)",
      o,
      subject + " reading list",
      "https://example.org/course/" + code,
    );
    await q(
      "INSERT INTO fee_types(label,amount) VALUES(?,?)",
      subject + " laboratory fee",
      500 + i * 10,
    );
    const invoice = await ins(
      "INSERT INTO invoices(student,label,amount,due) VALUES(?,?,?,?)",
      student,
      subject + " semester tuition",
      10000 + i * 100,
      date("03-01"),
    );
    for (const [kind, amt] of [
      ["Payment", 3500],
      ["Waiver", 500],
    ]) {
      const r = await ins(
        "INSERT INTO receipts(invoice,amount,kind,reference) VALUES(?,?,?,?)",
        invoice,
        amt,
        kind,
        "UNI-" + kind + "-" + n,
      );
      await q(
        "INSERT INTO receipt_details(receipt,state,method,reason,actor,reviewer) VALUES(?,'Valid','Office','Recorded at finance desk',?,?)",
        r,
        ids.ACCOUNTS_OFFICER,
        admin.id,
      );
    }
    const notice = await ins(
      "INSERT INTO notices(title,body,audience,target,author) VALUES(?,?,'Program',?,?)",
      subject + " orientation",
      "Programme induction and registration briefing.",
      prog,
      admin.id,
    );
    await q(
      "INSERT INTO notice_details(notice,state,starts,filename,document) VALUES(?,'Published',?,?,?)",
      notice,
      day(-1),
      "orientation.pdf",
      samplePdf(subject + " orientation"),
    );
    await q("INSERT INTO notice_reads VALUES(?,?)", notice, student);
    const book = await ins(
      "INSERT INTO books(code,title,author,copies) VALUES(?,?,?,2)",
      "REF-" + n,
      "Introduction to " + subject,
      names[i % 10] + " Ahmed",
    );
    const loan = await ins(
      "INSERT INTO loans(book,student,issued,due,returned,fine) VALUES(?,?,?,?,?,10)",
      book,
      student,
      date("02-01"),
      date("02-15"),
      date("02-17"),
    );
    await q(
      "INSERT INTO fine_events(loan,actor,status,amount,reason) VALUES(?,?,'Paid',10,'Collected at return desk')",
      loan,
      ids.LIBRARIAN,
    );
    const room = await ins(
      "INSERT INTO rooms(name,capacity,kind) VALUES(?,35,'Classroom')",
      "Hall " + n,
    );
    await q(
      "INSERT INTO room_blocks(room,slot,reason) VALUES(?,25,'Room maintenance')",
      room,
    );
    await q("INSERT INTO unavailable VALUES(?,24)", teacher);
    await q("INSERT INTO timetable VALUES(?,?,?,1)", o, room, 1 + (i % 20));
    await q(
      "INSERT INTO routine_reviews(term,state,actor) VALUES(?,'Published',?)",
      term,
      admin.id,
    );
    const th = await ins(
      "INSERT INTO theses(student,title,proposal,supervisor,status) VALUES(?,?,?,?,'Defended')",
      student,
      "Field study in " + subject,
      "A supervised study of local applications of " + subject + ".",
      ids.THESIS_SUPERVISOR,
    );
    await q(
      "INSERT INTO thesis_assignments(thesis,supervisor,actor) VALUES(?,?,?)",
      th,
      ids.THESIS_SUPERVISOR,
      admin.id,
    );
    const sub = await ins(
      "INSERT INTO thesis_updates(thesis,actor,note,filename,document) VALUES(?,?,?,?,?)",
      th,
      student,
      "Final revised submission",
      "final-" + n + ".pdf",
      samplePdf(subject + " capstone"),
    );
    await q(
      "INSERT INTO thesis_feedback(submission,actor,note) VALUES(?,?,?)",
      sub,
      ids.THESIS_SUPERVISOR,
      "Methods and revisions approved.",
    );
    await q(
      "INSERT INTO thesis_vivas(thesis,day,room,outcome) VALUES(?,?,?,'Passed')",
      th,
      date("06-05"),
      "Hall " + n,
    );
    await q(
      "INSERT INTO notifications(recipient,message) VALUES(?,?)",
      student,
      subject + " result published.",
    );
    const audit = await ins(
      "INSERT INTO audit_logs(actor_id,action,resource,record_id) VALUES(?,'RESULT_PUBLISHED','results',?)",
      teacher,
      reg,
    );
    await q(
      "INSERT INTO event_details(audit_id,reason,change_data) VALUES(?,'Demo publication','Published')",
      audit,
    );
  }
  await mapLegacy(db);
  await q(
    "INSERT INTO audit_logs(actor_id,action,resource,record_id) VALUES(?,'SEED_THIRTY_V1','demo',?)",
    admin.id,
    admin.id,
  );
}
