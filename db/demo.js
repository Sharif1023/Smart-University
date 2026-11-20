import { today } from "../server/operations/records.js";
// Called in the seed transaction. A one-time marker makes subsequent starts read-only.
export async function setupDemo(db, hash) {
  const [marker] = await db.execute(
    "SELECT id FROM audit_logs WHERE action='DEMO_WORKSPACE_SEED' LIMIT 1",
  );
  if (marker.length) return;
  const run = async (sql, ...a) => (await db.execute(sql, a))[0];
  const get = async (sql, ...a) => (await run(sql, ...a))[0].id;
  const roleId = (r) =>
    get("SELECT id FROM users WHERE email=?", r + "@campus.test");
  const admin = await roleId("admin"),
    student = await roleId("student"),
    teacher = await roleId("teacher"),
    advisor = await roleId("advisor");
  const dept = await get("SELECT id FROM departments WHERE code='CSE'"),
    program = await get("SELECT id FROM programs WHERE code='BCSE'");
  const date = (offset) =>
    new Date(Date.parse(today()) + offset * 86400000)
      .toISOString()
      .slice(0, 10);
  const year = (
    await run(
      "INSERT INTO academic_years(code,name,starts_on,ends_on) VALUES('LAB-YR','Demonstration academic year',?,?)",
      date(-250),
      date(100),
    )
  ).insertId;
  async function term(code, name, start, end, open, close) {
    return (
      await run(
        "INSERT INTO semesters(code,name,year_id,starts_on,ends_on,opens_on,closes_on,drop_on) VALUES(?,?,?,?,?,?,?,?)",
        code,
        name,
        year,
        date(start),
        date(end),
        date(open),
        date(close),
        date(close + 3),
      )
    ).insertId;
  }
  const old = await term(
      "LAB-1",
      "Previous demonstration term",
      -200,
      -80,
      -220,
      -198,
    ),
    current = await term(
      "LAB-2",
      "Current demonstration term",
      -7,
      90,
      -15,
      30,
    );
  const intro = await get("SELECT id FROM courses WHERE code='CSE101'");
  const algorithms = (
    await run(
      "INSERT INTO courses(code,name,department_id,credits) VALUES('CSE201','Algorithms',?,3)",
      dept,
    )
  ).insertId;
  const lab = (
    await run(
      "INSERT INTO courses(code,name,department_id,credits) VALUES('CSE202','Database systems lab',?,1.5)",
      dept,
    )
  ).insertId;
  await run("INSERT INTO prerequisites VALUES(?,?)", algorithms, intro);
  await run("INSERT INTO advising VALUES(?,?) ON CONFLICT DO NOTHING", student, advisor);
  for (const r of ["teacher", "advisor", "thesis_supervisor"])
    await run(
      "INSERT INTO faculty VALUES(?,?,'Lecturer') ON CONFLICT DO NOTHING",
      await roleId(r),
      dept,
    );
  async function offering(course, term, kind) {
    return (
      await run(
        "INSERT INTO offerings(course,term,teacher,program,batch,section,capacity,kind) VALUES(?,?,?,?,'2026','A',30,?)",
        course,
        term,
        teacher,
        program,
        kind,
      )
    ).insertId;
  }
  const historical = await offering(intro, old, "Classroom"),
    ongoing = await offering(algorithms, current, "Classroom");
  await offering(lab, current, "Lab");
  async function enroll(s, o) {
    return (
      await run(
        "INSERT INTO registrations(student,offering,status) VALUES(?,?,'Approved')",
        s,
        o,
      )
    ).insertId;
  }
  for (let n = 0; n < 6; n++) {
    let s = student;
    if (n) {
      s = (
        await run(
          "INSERT INTO users(email,name,password_hash,role,active) VALUES(?,?,?,'STUDENT',0)",
          "history" + n + "@campus.test",
          "Demo graduate " + n,
          hash,
        )
      ).insertId;
      await run(
        "INSERT INTO students VALUES(?,?,?,'2025','GRADUATED')",
        s,
        "LAB-H" + n,
        program,
      );
    }
    const reg = await enroll(s, historical);
    await run(
      "INSERT INTO results VALUES(?,?,?,1)",
      reg,
      n === 0 ? 82 : 30 + n * 10,
      n === 0 ? 78 : 31 + n * 11,
    );
    for (let j = 0; j < 5; j++)
      await run(
        "INSERT INTO attendance VALUES(?,?,?)",
        reg,
        date(-95 - j),
        n === 0 || j < n,
      );
  }
  const reg = await enroll(student, ongoing);
  for (let n = 0; n < 3; n++)
    await run("INSERT INTO attendance VALUES(?,?,?)", reg, date(-n), n !== 1);
  await run("INSERT INTO results VALUES(?,62,0,0)", reg);
  const bill = (
    await run(
      "INSERT INTO invoices(student,label,amount,due) VALUES(?,'Semester tuition · demo',12000,?)",
      student,
      date(20),
    )
  ).insertId;
  await run(
    "INSERT INTO receipts(invoice,amount,kind,reference) VALUES(?,3000,'Payment','DEMO-001')",
    bill,
  );
  await run(
    "INSERT INTO books(code,title,author,copies) VALUES('LIB-001','Database System Concepts','Silberschatz, Korth and Sudarshan',3)",
  );
  await run(
    "INSERT INTO rooms(name,capacity,kind) VALUES('Lecture Hall A',50,'Classroom'),('Computing Lab',32,'Lab')",
  );
  await run(
    "INSERT INTO notices(title,body,audience,author) VALUES('Registration is open','Request an eligible section in Campus services → Registration. Your advisor can review it.','All',?)",
    admin,
  );
  await run(
    "INSERT INTO audit_logs(actor_id,action,resource,record_id) VALUES(?,'DEMO_WORKSPACE_SEED','demo',?)",
    admin,
    student,
  );
}
