import { supplement } from "./blueprint.js";
export const slots = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  label:
    ["Sun", "Mon", "Tue", "Wed", "Thu"][i < 25 ? Math.floor(i / 5) : i - 25] +
    " " +
    ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"][i < 25 ? i % 5 : 5],
}));
export const score = (r) =>
  Math.round(
    Number(r.assessment) * (r.weight ?? 40) +
      Number(r.exam) * (100 - (r.weight ?? 40)),
  ) / 100;
export function points(mark) {
  return [
    [80, 4],
    [75, 3.75],
    [70, 3.5],
    [65, 3.25],
    [60, 3],
    [55, 2.75],
    [50, 2.5],
    [45, 2.25],
    [40, 2],
    [0, 0],
  ].find(([cut]) => mark >= cut)[1];
}
export async function rows(db, sql, args = []) {
  return (await db.execute(sql, args))[0];
}
export const today = () =>
  new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
const facultyRoles = ["TEACHER", "ADVISOR", "THESIS_SUPERVISOR"];
export const roles = [
  "ADMIN",
  "STUDENT",
  ...facultyRoles,
  "ACCOUNTS_OFFICER",
  "LIBRARIAN",
];
export async function records(db, user) {
  const { role, id } = user,
    admin = role === "ADMIN",
    student = role === "STUDENT",
    advisor = role === "ADVISOR",
    teacher = role === "TEACHER";
  const finance = admin || role === "ACCOUNTS_OFFICER",
    library = admin || role === "LIBRARIAN",
    supervisor = role === "THESIS_SUPERVISOR";
  const read = (sql, args) => rows(db, sql, args);
  const directory = admin || finance || library;
  const people = await read(
    `SELECT s.user_id id, (SELECT admission FROM student_details sd WHERE sd.student=s.user_id) admission,u.name,s.student_no,s.program_id,s.batch,s.status,p.credits required_credits,p.department_id,a.advisor,v.name advisor_name FROM students s JOIN users u ON u.id=s.user_id JOIN programs p ON p.id=s.program_id LEFT JOIN advising a ON a.student=s.user_id LEFT JOIN users v ON v.id=a.advisor WHERE ${directory ? "1=1" : advisor ? "a.advisor=?" : "s.user_id=?"} ORDER BY u.name`,
    directory ? [] : [id],
  );
  const staff = admin
    ? await read(
        "SELECT u.id,u.name,u.email,u.role,u.active,(SELECT employee_no FROM faculty_details fd WHERE fd.teacher=u.id) employee_no,f.designation,f.department_id FROM users u LEFT JOIN faculty f ON f.user_id=u.id WHERE u.role<>'STUDENT'",
      )
    : await read(
        "SELECT u.id,u.name,u.role,f.designation,f.department_id FROM users u LEFT JOIN faculty f ON f.user_id=u.id WHERE u.id=?",
        [id],
      );
  const offerings = await read(
    "SELECT o.*,(SELECT description FROM course_descriptions cd WHERE cd.course=o.course) description,COALESCE(sd.status,'Active') section_status,c.code,c.name course_name,c.credits,t.code semester,t.starts_on,t.ends_on,t.opens_on,t.closes_on,t.drop_on,t.active term_active,c.active course_active,u.name instructor, (SELECT COUNT(*) FROM registrations r WHERE r.offering=o.id AND r.status='Approved') enrolled FROM offerings o LEFT JOIN section_details sd ON sd.offering=o.id JOIN courses c ON c.id=o.course JOIN semesters t ON t.id=o.term JOIN users u ON u.id=o.teacher ORDER BY t.starts_on DESC,c.code",
  );
  const regs =
    admin || student || teacher || advisor
      ? await read(
          `SELECT r.*,u.name student_name,c.code,c.name course_name,c.credits,o.course,o.term,o.teacher,o.section,COALESCE(mp.coursework_weight,40) weight,t.starts_on term_start,t.code semester,g.assessment,g.exam,g.published, (SELECT ROUND(AVG(COALESCE(atn.present,0))*100,1) FROM class_sessions cs LEFT JOIN attendance atn ON atn.reg=r.id AND atn.day=cs.day LEFT JOIN attendance_status ast ON ast.reg=atn.reg AND ast.day=cs.day WHERE cs.offering=r.offering AND cs.status='Held' AND COALESCE(ast.status,'Absent')<>'Excused') attendance FROM registrations r JOIN users u ON u.id=r.student JOIN offerings o ON o.id=r.offering JOIN semesters t ON t.id=o.term JOIN courses c ON c.id=o.course LEFT JOIN marking_policy mp ON mp.offering=o.id LEFT JOIN results g ON g.reg=r.id ${student ? "AND g.published=1" : ""} WHERE ${admin ? "1=1" : student ? "r.student=?" : teacher ? "o.teacher=?" : "EXISTS (SELECT 1 FROM advising a WHERE a.student=r.student AND a.advisor=?)"} ORDER BY t.starts_on DESC,r.id`,
          admin ? [] : [id],
        )
      : [];
  const bills =
    finance || student
      ? await read(
          `SELECT i.*,(SELECT issued FROM invoice_details di WHERE di.invoice=i.id) issued,(SELECT term FROM invoice_details di WHERE di.invoice=i.id) term,u.name student_name,i.amount-COALESCE(SUM(CASE WHEN COALESCE(rd.state,'Valid')='Valid' THEN p.amount ELSE 0 END),0) balance FROM invoices i JOIN users u ON u.id=i.student LEFT JOIN receipts p ON p.invoice=i.id LEFT JOIN receipt_details rd ON rd.receipt=p.id ${student ? "WHERE i.student=?" : ""} GROUP BY i.id,u.name`,
          student ? [id] : [],
        )
      : [];
  const payments =
    finance || student
      ? await read(
          `SELECT p.*,COALESCE(rd.state,'Valid') state,rd.method,i.label,u.name student_name FROM receipts p LEFT JOIN receipt_details rd ON rd.receipt=p.id JOIN invoices i ON i.id=p.invoice JOIN users u ON u.id=i.student ${student ? "WHERE i.student=?" : ""} ORDER BY p.id DESC`,
          student ? [id] : [],
        )
      : [];
  const books = await read(
    "SELECT b.*,(SELECT string_agg(a.name, ', ' ORDER BY a.name) FROM book_authors ba JOIN authors a ON a.id=ba.author WHERE ba.book=b.id) authors,b.copies-(SELECT COUNT(*) FROM loans l WHERE l.book=b.id AND l.returned IS NULL) available FROM books b ORDER BY b.title",
  );
  const loans =
    library || student
      ? await read(
          `SELECT l.*,b.title,u.name borrower,lc.copy_id,bc.accession,COALESCE(l.returned,'On loan') loan_status,CASE WHEN l.returned IS NULL THEN GREATEST(?::date-l.due,0)*COALESCE((SELECT pr.fine_rate FROM students st JOIN program_rules pr ON pr.program=st.program_id WHERE st.user_id=l.student),5) ELSE l.fine END fine_bdt FROM loans l LEFT JOIN loan_copies lc ON lc.loan=l.id LEFT JOIN book_copies bc ON bc.id=lc.copy_id JOIN books b ON b.id=l.book JOIN users u ON u.id=l.student ${student ? "WHERE l.student=?" : ""} ORDER BY l.id DESC`,
          student ? [today(), id] : [today()],
        )
      : [];
  const notices = await read(
    `SELECT n.*,nd.filename,COALESCE(nd.state,'Published') state,nd.starts,nd.ends,CASE WHEN nr.reader IS NULL THEN 'Unread' ELSE 'Read' END read_status FROM notices n LEFT JOIN notice_details nd ON nd.notice=n.id LEFT JOIN notice_reads nr ON nr.notice=n.id AND nr.reader=? WHERE ?='ADMIN' OR n.author=? OR ((COALESCE(nd.state,'Published')='Published' AND (nd.starts IS NULL OR nd.starts<=?) AND (nd.ends IS NULL OR nd.ends>=?)) AND ((n.audience='User' AND n.target=?) OR (n.audience='Program' AND n.target IN (SELECT program_id FROM students WHERE user_id=?)) OR n.audience IN ('All',?) OR (n.audience='Department' AND n.target IN (SELECT p.department_id FROM students s JOIN programs p ON p.id=s.program_id WHERE s.user_id=? UNION SELECT department_id FROM faculty WHERE user_id=?)) OR EXISTS(SELECT 1 FROM offerings o LEFT JOIN registrations r ON r.offering=o.id AND r.status='Approved' WHERE (o.teacher=? OR r.student=?) AND ((n.audience='Semester' AND n.target=o.term) OR (n.audience='Offering' AND n.target=o.id))))) ORDER BY n.id DESC`,
    [id, role, id, today(), today(), id, id, role, id, id, id, id],
  );
  const theses =
    admin || student || supervisor
      ? await read(
          `SELECT t.*,u.name student_name,v.name supervisor_name FROM theses t JOIN users u ON u.id=t.student LEFT JOIN users v ON v.id=t.supervisor WHERE ${admin ? "1=1" : student ? "t.student=?" : "t.supervisor=?"}`,
          admin ? [] : [id],
        )
      : [];
  const updates =
    admin || student || supervisor
      ? await read(
          `SELECT e.id,e.thesis,e.note,e.filename,e.created,u.name author FROM thesis_updates e JOIN theses t ON t.id=e.thesis JOIN users u ON u.id=e.actor WHERE ${admin ? "1=1" : student ? "t.student=?" : "t.supervisor=?"} ORDER BY e.id DESC`,
          admin ? [] : [id],
        )
      : [];
  const routine = await read(
    `SELECT tt.*,o.term,c.code,o.section,u.name instructor,rm.name room_name FROM timetable tt JOIN offerings o ON o.id=tt.offering JOIN courses c ON c.id=o.course JOIN users u ON u.id=o.teacher JOIN rooms rm ON rm.id=tt.room WHERE ${admin ? "1=1" : student ? "tt.published=1 AND EXISTS (SELECT 1 FROM registrations r WHERE r.offering=o.id AND r.student=? AND r.status='Approved')" : teacher ? "tt.published=1 AND o.teacher=?" : "tt.published=1"} ORDER BY tt.slot`,
    student || teacher ? [id] : [],
  );
  const requirements = await read(
    "SELECT pr.*,pg.minimum,c.code required_code FROM prerequisites pr LEFT JOIN prerequisite_grades pg ON pg.course=pr.course AND pg.required_course=pr.required_course JOIN courses c ON c.id=pr.required_course",
  );
  const catalog = {};
  for (const table of ["departments", "programs", "courses", "semesters"])
    catalog[table] = await read(
      "SELECT id,code,name,active FROM " + table + " ORDER BY code",
    );
  const rooms = admin
    ? await read(
        "SELECT r.*,rd.code,rd.building,rd.department,COALESCE(rd.active,1) active FROM rooms r LEFT JOIN room_details rd ON rd.room=r.id",
      )
    : [];
  const blocked =
    admin || teacher
      ? await read(
          "SELECT * FROM unavailable" + (teacher ? " WHERE teacher=?" : ""),
          teacher ? [id] : [],
        )
      : [];
  const attendance =
    admin || student || teacher || advisor
      ? await read(
          `SELECT a.reg,a.day,a.present,COALESCE(ast.status,CASE WHEN a.present=1 THEN 'Present' ELSE 'Absent' END) mark_status,cs.status session_status,c.code,u.name student_name FROM attendance a LEFT JOIN attendance_status ast ON ast.reg=a.reg AND ast.day=a.day JOIN registrations r ON r.id=a.reg JOIN class_sessions cs ON cs.offering=r.offering AND cs.day=a.day JOIN users u ON u.id=r.student JOIN offerings o ON o.id=r.offering JOIN courses c ON c.id=o.course WHERE ${admin ? "1=1" : teacher ? "o.teacher=?" : student ? "r.student=?" : "EXISTS(SELECT 1 FROM advising v WHERE v.student=r.student AND v.advisor=?)"} ORDER BY a.day DESC`,
          admin ? [] : [id],
        )
      : [];
  const feeTypes = finance
    ? await read(
        "SELECT f.*,r.program,r.term,r.category,COALESCE(r.active,1) active FROM fee_types f LEFT JOIN fee_rules r ON r.fee=f.id ORDER BY label",
      )
    : [];
  const materials =
    admin || student || teacher
      ? await read(
          `SELECT m.*,c.code FROM materials m JOIN offerings o ON o.id=m.offering JOIN courses c ON c.id=o.course WHERE ${admin ? "1=1" : teacher ? "o.teacher=?" : "EXISTS(SELECT 1 FROM registrations r WHERE r.offering=o.id AND r.student=? AND r.status='Approved')"}`,
          admin ? [] : [id],
        )
      : [];
  const data = {
    feeTypes,
    materials,
    people,
    staff,
    offerings,
    regs,
    bills,
    payments,
    books,
    loans,
    notices,
    theses,
    updates,
    routine,
    requirements,
    catalog,
    rooms,
    blocked,
    attendance,
  };
  data.extra = await supplement(db, data, user);
  for (const book of books)
    book.available = data.extra.copies.filter(
      (c) => c.book === book.id && c.available,
    ).length;
  return data;
}
export function eligible(person, offer, regs, requirements) {
  const own = regs.filter((r) => r.student === person.id);
  const passed = new Set(
    own
      .filter((r) => r.published && (r.grade_points ?? points(score(r))) > 0)
      .map((r) => r.course),
  );
  return (
    person.status === "ACTIVE" &&
    offer.program === person.program_id &&
    offer.batch === person.batch &&
    offer.section_status !== "Closed" &&
    offer.term_active &&
    offer.course_active &&
    !passed.has(offer.course) &&
    !own.some(
      (r) =>
        r.term === offer.term &&
        r.course === offer.course &&
        ["Pending", "Approved"].includes(r.status),
    ) &&
    requirements
      .filter((r) => r.course === offer.course)
      .every(
        (r) =>
          passed.has(r.required_course) &&
          own.some(
            (x) =>
              x.course === r.required_course &&
              x.published &&
              (x.grade_points ?? points(score(x))) >= Number(r.minimum ?? 0),
          ),
      )
  );
}
export function performance(records, training) {
  const results = records.filter((r) => r.published);
  const credits = results.reduce((n, r) => n + Number(r.credits), 0);
  const passed = new Map(
    results
      .filter((r) => (r.grade_points ?? points(score(r))) > 0)
      .map((r) => [r.course, Number(r.credits)]),
  );
  const cgpa = credits
    ? Number(
        (
          results.reduce(
            (n, r) => n + (r.grade_points ?? points(score(r))) * r.credits,
            0,
          ) / credits
        ).toFixed(2),
      )
    : null;
  const forecasts = records
    .filter((r) => r.status === "Approved" && !r.published)
    .map((r) => {
      const hasAttendance = r.attendance != null,
        hasAssessment = r.assessment != null;
      const neighbors = training
        .filter(
          (t) =>
            t.id !== r.id &&
            t.student !== r.student &&
            t.attendance != null &&
            t.assessment != null &&
            t.term_end < r.term_start,
        )
        .map((t) => ({
          target: score(t),
          distance: Math.hypot(
            hasAttendance ? t.attendance - r.attendance : 0,
            hasAssessment ? t.assessment - r.assessment : 0,
          ),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
      const prediction =
        neighbors.length >= 3 && (hasAttendance || hasAssessment)
          ? Math.round(
              neighbors.reduce((s, t) => s + t.target / (1 + t.distance), 0) /
                neighbors.reduce((s, t) => s + 1 / (1 + t.distance), 0),
            )
          : null;
      const reasons = [];
      if (hasAttendance && Number(r.attendance) < 75)
        reasons.push("Attendance below 75%");
      if (hasAssessment && Number(r.assessment) < 40)
        reasons.push("Assessment below 40");
      if (prediction !== null && prediction < 50)
        reasons.push("Estimated mark below 50");
      return {
        course: r.code,
        attendance: r.attendance,
        prediction,
        neighbors: neighbors.length,
        warning: reasons.join(" · ") || "—",
      };
    });
  return {
    cgpa,
    earned: [...passed.values()].reduce((a, b) => a + b, 0),
    forecasts,
  };
}
