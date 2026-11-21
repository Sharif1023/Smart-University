import { pool } from "../server/db.js";

const expectedRoles = [
  "ADMIN",
  "STUDENT",
  "TEACHER",
  "ADVISOR",
  "THESIS_SUPERVISOR",
  "ACCOUNTS_OFFICER",
  "LIBRARIAN",
];

try {
  const [tables] = await pool.query(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' ORDER BY table_name",
  );
  const counts = {};
  for (const { name } of tables) {
    const [[row]] = await pool.query(
      "SELECT COUNT(*) AS n FROM `" + name.replaceAll("`", "``") + "`",
    );
    counts[name] = Number(row.n);
  }

  const [demoUsers] = await pool.query(
    "SELECT role,COUNT(*) AS total FROM users WHERE email LIKE '%@demo.campus.test' GROUP BY role",
  );
  const roleCounts = Object.fromEntries(
    demoUsers.map(({ role, total }) => [role, Number(total)]),
  );
  const missingRoles = expectedRoles.filter((role) => roleCounts[role] !== 30);
  const [[coreUsers]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE email IN ('admin@campus.test','student@campus.test','teacher@campus.test','advisor@campus.test','accounts_officer@campus.test','librarian@campus.test','thesis_supervisor@campus.test')",
  );

  const [[portalSeed]] = await pool.query(
    "SELECT (SELECT COUNT(*) FROM students s LEFT JOIN student_profiles p ON p.student=s.user_id WHERE p.student IS NULL) missing_profiles,(SELECT COUNT(*) FROM users u LEFT JOIN notification_preferences p ON p.user_id=u.id WHERE p.user_id IS NULL) missing_preferences,(SELECT COUNT(*) FROM career_opportunities WHERE title='Campus software engineering internship' AND organization='Campus Innovation Lab') opportunities,(SELECT COUNT(*) FROM student_document_requests r JOIN users u ON u.id=r.student WHERE u.email='student@campus.test' AND r.purpose='Demo request for the current semester.' AND r.semester_id IS NOT NULL) document_requests,(SELECT COUNT(*) FROM support_tickets t JOIN users u ON u.id=t.student WHERE u.email='student@campus.test' AND t.subject='Demo portal support request' AND t.semester_id IS NOT NULL) support_tickets,(SELECT COUNT(*) FROM exam_schedules x JOIN offerings o ON o.id=x.offering JOIN courses c ON c.id=o.course JOIN semesters s ON s.id=o.term WHERE c.code='CSE201' AND s.code='LAB-2') exam_schedules,(SELECT COUNT(*) FROM student_payment_requests p JOIN users u ON u.id=p.student WHERE u.email='student@campus.test' AND p.status='Pending') payment_requests,(SELECT COUNT(*) FROM grade_review_requests r JOIN users u ON u.id=r.student WHERE u.email='student@campus.test') grade_review_requests,(SELECT COUNT(*) FROM attendance_correction_requests r JOIN users u ON u.id=r.student WHERE u.email='student@campus.test') attendance_requests,(SELECT COUNT(*) FROM support_replies r JOIN support_tickets t ON t.id=r.ticket JOIN users u ON u.id=t.student WHERE u.email='student@campus.test') support_replies,(SELECT COUNT(*) FROM career_applications a JOIN users u ON u.id=a.student WHERE u.email='student@campus.test' AND a.semester_id IS NOT NULL) career_applications,(SELECT COUNT(*) FROM library_reservations r JOIN users u ON u.id=r.student WHERE u.email='student@campus.test' AND r.semester_id IS NOT NULL) library_reservations,(SELECT COUNT(*) FROM loan_renewal_requests r JOIN users u ON u.id=r.student WHERE u.email='student@campus.test' AND r.semester_id IS NOT NULL) loan_renewals,(SELECT COUNT(*) FROM theses t JOIN users u ON u.id=t.student WHERE u.email='student@campus.test' AND t.semester_id IS NOT NULL) term_theses",
  );

  const missingPortalSeed =
    Number(portalSeed.missing_profiles) !== 0 ||
    Number(portalSeed.missing_preferences) !== 0 ||
    Number(portalSeed.opportunities) < 1 ||
    Number(portalSeed.document_requests) < 1 ||
    Number(portalSeed.support_tickets) < 1 ||
    Number(portalSeed.exam_schedules) < 1 ||
    Number(portalSeed.payment_requests) < 1 ||
    Number(portalSeed.grade_review_requests) < 1 ||
    Number(portalSeed.attendance_requests) < 1 ||
    Number(portalSeed.support_replies) < 1 ||
    Number(portalSeed.career_applications) < 1 ||
    Number(portalSeed.library_reservations) < 1 ||
    Number(portalSeed.loan_renewals) < 1 ||
    Number(portalSeed.term_theses) < 1;
  if (missingRoles.length || Number(coreUsers.total) !== 7 || missingPortalSeed)
    throw Error(
      "Seed check failed. Missing or incomplete demo roles: " +
        (missingRoles.join(", ") ||
          (missingPortalSeed ? "student portal fixtures" : "core accounts")),
    );

  console.log(
    JSON.stringify({ tables: counts, demoAccountsByRole: roleCounts }, null, 2),
  );
} finally {
  await pool.end();
}
