import { actions } from "../server/operations/forms.js";
import { roles } from "../server/operations/records.js";
export async function syncPermissions(db) {
  for (const [name, spec] of Object.entries(actions))
    for (const role of roles.filter(
      (r) => spec.roles.includes("*") || spec.roles.includes(r),
    ))
      await db.execute("INSERT INTO role_permissions VALUES(?,?) ON CONFLICT DO NOTHING", [
        role,
        name,
      ]);
}
export async function enrichSeed(db) {
  const q = async (sql, ...a) => (await db.execute(sql, a))[0];
  if (
    (
      await q(
        "SELECT version FROM release_seeds WHERE version='catalog-details-1'",
      )
    ).length
  )
    return;
  const catalog = await q(
    "SELECT o.*,d.code dep_code,c.name course_name,s.starts_on,s.ends_on FROM offerings o JOIN courses c ON c.id=o.course JOIN departments d ON d.id=c.department_id JOIN semesters s ON s.id=o.term WHERE c.code LIKE 'U__101'",
  );
  for (const o of catalog) {
    const n = o.dep_code.slice(1);
    const [book] = await q(
      "SELECT id,title FROM books WHERE code=?",
      "REF-" + n,
    );
    const [room] = await q("SELECT id FROM rooms WHERE name=?", "Hall " + n);
    const [fee] = await q(
      "SELECT id FROM fee_types WHERE label=(SELECT CONCAT(name,' laboratory fee') FROM departments WHERE code=?)",
      o.dep_code,
    );
    const [pr] = await q(
      "SELECT course FROM prerequisites WHERE required_course=?",
      o.course,
    );
    await q(
      "INSERT INTO book_editions VALUES(?,?,?,?,?,?)",
      book.id,
      null,
      o.course_name,
      "1st",
      "Campus Press",
      Number(o.starts_on.slice(0, 4)),
    );
    await q(
      "INSERT INTO room_details VALUES(?,?,?,(SELECT id FROM departments WHERE code=?),1)",
      room.id,
      "H-" + n,
      "Academic building " + Math.ceil(Number(n) / 5),
      o.dep_code,
    );
    await q(
      "INSERT INTO fee_rules VALUES(?,?,?,'Laboratory',1)",
      fee.id,
      o.program,
      o.term,
    );
    await q(
      "INSERT INTO course_descriptions VALUES(?,?)",
      o.course,
      o.course_name + " introduces core methods and practical applications.",
    );
    await q(
      "INSERT INTO prerequisite_grades VALUES(?,?,2)",
      pr.course,
      o.course,
    );
  }
  await q(
    "INSERT INTO attendance_status SELECT a.reg,a.day,CASE WHEN a.present=1 THEN 'Present' ELSE 'Absent' END,o.teacher FROM attendance a JOIN registrations r ON r.id=a.reg JOIN offerings o ON o.id=r.offering WHERE TRUE ON CONFLICT DO NOTHING",
  );
  await q("INSERT INTO release_seeds(version) VALUES('catalog-details-1')");
}
export async function normalizeResources(db) {
  const q = async (sql, ...a) => (await db.execute(sql, a))[0];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu"];
  for (let i = 0; i < 30; i++) {
    const index = i < 25 ? i % 5 : 5,
      day = days[i < 25 ? Math.floor(i / 5) : i - 25],
      starts = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"],
      ends = ["10:30", "12:00", "13:30", "15:30", "17:00", "18:30"];
    await q(
      "INSERT INTO time_slots VALUES(?,?,?,?) ON CONFLICT DO NOTHING",
      i + 1,
      day,
      starts[index],
      ends[index],
    );
  }
  for (const b of await q(
    "SELECT b.* FROM books b WHERE NOT EXISTS(SELECT 1 FROM book_authors ba WHERE ba.book=b.id)",
  )) {
    for (const name of b.author
      .split(/,| and /)
      .map((v) => v.trim())
      .filter(Boolean)) {
      await q("INSERT INTO authors(name) VALUES(?) ON CONFLICT DO NOTHING", name);
      await q(
        "INSERT INTO book_authors SELECT ?,id FROM authors WHERE name=? ON CONFLICT DO NOTHING",
        b.id,
        name,
      );
    }
  }
  await q(
    "INSERT INTO invoice_details(invoice,issued) SELECT id,due FROM invoices ON CONFLICT DO NOTHING",
  );
}
export async function seedHistories(db) {
  const q = async (sql, ...a) => (await db.execute(sql, a))[0];
  if (
    (await q("SELECT version FROM release_seeds WHERE version='histories-1'"))
      .length
  )
    return;
  await normalizeResources(db);
  // Include distinct coauthors with each department's reference text.
  const books = await q(
    "SELECT b.id,b.title,d.name FROM books b JOIN departments d ON d.code=CONCAT('U',RIGHT(b.code,2)) WHERE b.code LIKE 'REF-%'",
  );
  for (const b of books) {
    const name = b.name + " Editorial Board";
    await q("INSERT INTO authors(name) VALUES(?) ON CONFLICT DO NOTHING", name);
    await q(
      "INSERT INTO book_authors SELECT ?,id FROM authors WHERE name=? ON CONFLICT DO NOTHING",
      b.id,
      name,
    );
  }
  await q(
    "INSERT INTO registration_events(reg,actor,state,comment_text) SELECT r.id,a.advisor,r.status,'Advising completed' FROM registrations r JOIN advising a ON a.student=r.student JOIN users u ON u.id=r.student WHERE u.email LIKE '%@demo.campus.test'",
  );
  await q(
    "INSERT INTO thesis_events(thesis,actor,state,note) SELECT t.id,t.supervisor,t.status,'Defense recorded' FROM theses t JOIN users u ON u.id=t.student WHERE u.email LIKE '%@demo.campus.test'",
  );
  await q(
    "INSERT INTO routine_conflicts(term,actor,reason) SELECT rv.term,rv.actor,'Historical demo: room maintenance required a different slot before publication.' FROM routine_reviews rv JOIN semesters s ON s.id=rv.term WHERE s.code LIKE 'HIST%'",
  );
  await q(
    "UPDATE invoice_details d SET term=o.term,issued=s.starts_on FROM invoices i JOIN registrations r ON r.student=i.student JOIN offerings o ON o.id=r.offering JOIN users u ON u.id=i.student JOIN semesters s ON s.id=o.term WHERE i.id=d.invoice AND u.email LIKE '%@demo.campus.test'",
  );
  await q("INSERT INTO release_seeds(version) VALUES('histories-1')");
}
