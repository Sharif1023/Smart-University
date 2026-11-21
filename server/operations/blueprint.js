import { fail } from "../security.js";
import { today, score } from "./records.js";
import { bands } from "./grade-bands.js";
import { isIsoDate } from "../validation.js";
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
  ["exam_schedule", "Routine", "Add exam schedule", "ADMIN", "offering:allOfferings title exam_type:examTypes exam_date:date starts_at:time ends_at:time room:rooms"],
  ["exam_state", "Routine", "Publish or cancel an exam", "ADMIN", "schedule:examDrafts state:examStates"],
  ["attendance_request", "Student services", "Request attendance correction", "STUDENT", "session:correctionSessions requested_status:attendanceStatuses reason:long"],
  ["attendance_review", "Teaching", "Review attendance correction", "ADMIN TEACHER", "correction:reviewableCorrections decision:decisions review_reason:optional"],
  ["grade_review_request", "Teaching", "Request a published grade review", "STUDENT", "reg:publishedRegs reason:long"],
  ["grade_review", "Teaching", "Review a grade request", "ADMIN TEACHER", "request:pendingGradeReviews state:gradeReviewStates response:optional"],
  ["document_request", "Student documents", "Request a student document", "STUDENT", "document_type:documentTypes purpose:long"],
  ["document_review", "Student documents", "Review document request", "ADMIN", "document_request:pendingDocuments decision:documentDecisions response:optional"],
  ["support_ticket", "Student support", "Open a support ticket", "STUDENT", "category:supportCategories subject description:long"],
  ["ticket_reply", "Student support", "Reply to a support ticket", "ADMIN STUDENT", "ticket:replyableTickets message:long"],
  ["ticket_status", "Student support", "Update ticket status", "ADMIN", "ticket:openTickets state:ticketStates"],
  ["reserve_book", "Library", "Reserve an unavailable book", "STUDENT", "book:unavailableBooks"],
  ["cancel_reservation", "Library", "Cancel a pending reservation", "STUDENT", "reservation:ownReservations"],
  ["reservation_review", "Library", "Review book reservation", "ADMIN LIBRARIAN", "reservation:pendingReservations state:reservationStates"],
  ["renewal_request", "Library", "Request a loan renewal", "STUDENT", "loan:renewableLoans requested_due:date"],
  ["renewal_review", "Library", "Review loan renewal", "ADMIN LIBRARIAN", "renewal:pendingRenewals decision:decisions review_reason:optional"],
  ["notification_preferences", "Account settings", "Save notification preferences", "*", "academic:toggle finance:toggle library:toggle thesis:toggle notices:toggle"],
  ["career_opportunity", "Career & internship", "Add a career opportunity", "ADMIN", "title organization opportunity_type:opportunityTypes description:long location:optional deadline:optional application_url:optional"],
  ["career_apply", "Career & internship", "Apply for an opportunity", "STUDENT", "opportunity:availableOpportunities cover_note:optional"],
  ["career_review", "Career & internship", "Review a student application", "ADMIN", "application:submittedApplications state:applicationStates"],
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
      "SELECT a.*,c.code,o.term term_id FROM assessments a JOIN offerings o ON o.id=a.offering JOIN courses c ON c.id=o.course",
      "a.offering",
      u.role === "STUDENT"
        ? d.regs.filter((r) => r.status === "Approved").map((r) => r.offering)
        : own,
    ),
    sessions: await by(
      "SELECT s.*,c.code,o.term term_id FROM class_sessions s JOIN offerings o ON o.id=s.offering JOIN courses c ON c.id=o.course",
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
    examSchedules: await read(
      `SELECT x.*,o.section,o.term term_id,c.code,c.name course_name,t.code semester,rm.name room_name FROM exam_schedules x JOIN offerings o ON o.id=x.offering JOIN courses c ON c.id=o.course JOIN semesters t ON t.id=o.term JOIN rooms rm ON rm.id=x.room WHERE ${admin ? "1=1" : u.role === "STUDENT" ? "x.state='Published' AND EXISTS(SELECT 1 FROM registrations r WHERE r.offering=x.offering AND r.student=? AND r.status='Approved')" : u.role === "TEACHER" ? "o.teacher=?" : "x.state='Published'"} ORDER BY x.exam_date,x.starts_at`,
      ["STUDENT", "TEACHER"].includes(u.role) ? [u.id] : [],
    ),
    corrections: await read(
      `SELECT a.*,c.code,o.term term_id,o.teacher,o.section,u.name student_name FROM attendance_correction_requests a JOIN registrations r ON r.id=a.reg JOIN offerings o ON o.id=r.offering JOIN courses c ON c.id=o.course JOIN students s ON s.user_id=a.student JOIN users u ON u.id=a.student WHERE ${admin ? "1=1" : u.role === "STUDENT" ? "a.student=?" : u.role === "TEACHER" ? "o.teacher=?" : "1=0"} ORDER BY a.created_at DESC`,
      ["STUDENT", "TEACHER"].includes(u.role) ? [u.id] : [],
    ),
    gradeReviews: await read(
      `SELECT g.*,c.code,o.term term_id,o.teacher,u.name student_name FROM grade_review_requests g JOIN registrations r ON r.id=g.reg JOIN offerings o ON o.id=r.offering JOIN courses c ON c.id=o.course JOIN users u ON u.id=g.student WHERE ${admin ? "1=1" : u.role === "STUDENT" ? "g.student=?" : u.role === "TEACHER" ? "o.teacher=?" : "1=0"} ORDER BY g.created_at DESC`,
      ["STUDENT", "TEACHER"].includes(u.role) ? [u.id] : [],
    ),
    documentRequests: await read(
      `SELECT a.*,sem.code semester,u.name student_name FROM student_document_requests a JOIN users u ON u.id=a.student LEFT JOIN semesters sem ON sem.id=a.semester_id WHERE ${admin ? "1=1" : "a.student=?"} ORDER BY a.requested_at DESC`,
      admin ? [] : [u.id],
    ),
    tickets: await read(
      `SELECT a.*,sem.code semester,u.name student_name,(SELECT COUNT(*) FROM support_replies r WHERE r.ticket=a.id) reply_count FROM support_tickets a JOIN users u ON u.id=a.student LEFT JOIN semesters sem ON sem.id=a.semester_id WHERE ${admin ? "1=1" : "a.student=?"} ORDER BY a.updated_at DESC`,
      admin ? [] : [u.id],
    ),
    reservations: await read(
      `SELECT r.*,sem.code semester,b.title,u.name student_name FROM library_reservations r JOIN books b ON b.id=r.book JOIN users u ON u.id=r.student LEFT JOIN semesters sem ON sem.id=r.semester_id WHERE ${admin || u.role === "LIBRARIAN" ? "1=1" : "r.student=?"} ORDER BY r.created_at DESC`,
      admin || u.role === "LIBRARIAN" ? [] : [u.id],
    ),
    renewals: await read(
      `SELECT r.*,sem.code semester,l.due current_due,b.title,u.name student_name FROM loan_renewal_requests r JOIN loans l ON l.id=r.loan JOIN books b ON b.id=l.book JOIN users u ON u.id=r.student LEFT JOIN semesters sem ON sem.id=r.semester_id WHERE ${admin || u.role === "LIBRARIAN" ? "1=1" : "r.student=?"} ORDER BY r.created_at DESC`,
      admin || u.role === "LIBRARIAN" ? [] : [u.id],
    ),
    preferences: (await read("SELECT * FROM notification_preferences WHERE user_id=?", [u.id]))[0] ?? { user_id: u.id, academic: 1, finance: 1, library: 1, thesis: 1, notices: 1 },
    opportunities: await read(
      `SELECT * FROM career_opportunities WHERE ${admin ? "1=1" : "status='Published' AND (deadline IS NULL OR deadline>=?)"} ORDER BY deadline IS NULL,deadline,id DESC`,
      admin ? [] : [today()],
    ),
    applications: await read(
      `SELECT a.*,sem.code semester,o.title opportunity_title,o.organization,u.name student_name FROM career_applications a JOIN career_opportunities o ON o.id=a.opportunity JOIN users u ON u.id=a.student LEFT JOIN semesters sem ON sem.id=a.semester_id WHERE ${admin ? "1=1" : "a.student=?"} ORDER BY a.submitted_at DESC`,
      admin ? [] : [u.id],
    ),
    paymentRequests: finance
      ? await read(
          `SELECT p.*,s.code semester,i.label invoice_label,u.name student_name FROM student_payment_requests p JOIN semesters s ON s.id=p.semester_id JOIN invoices i ON i.id=p.invoice JOIN users u ON u.id=p.student WHERE ${admin || u.role === "ACCOUNTS_OFFICER" ? "1=1" : "p.student=?"} ORDER BY p.created_at DESC`,
          admin || u.role === "ACCOUNTS_OFFICER" ? [] : [u.id],
        )
      : await read(
          "SELECT p.*,s.code semester,i.label invoice_label,u.name student_name FROM student_payment_requests p JOIN semesters s ON s.id=p.semester_id JOIN invoices i ON i.id=p.invoice JOIN users u ON u.id=p.student WHERE p.student=? ORDER BY p.created_at DESC",
          [u.id],
        ),
  };
  const ticketIds = extra.tickets.map((t) => t.id);
  extra.replies = await read(
    `SELECT r.*,t.semester_id,u.name author FROM support_replies r JOIN support_tickets t ON t.id=r.ticket JOIN users u ON u.id=r.author WHERE r.ticket IN (${ticketIds.length ? ticketIds.map(() => "?").join(",") : "NULL"}) ORDER BY r.created_at`,
    ticketIds,
  );
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
export function extraOptions(d, u, semesterId = null) {
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
    tests: opts(e.assessments.filter((a) => !semesterId || Number(a.term_id) === Number(semesterId)), (a) => a.code + " · " + a.title),
    publishedRegs: opts(
      d.regs.filter((r) => r.published && (!semesterId || Number(r.term) === Number(semesterId))),
      reg,
    ),
    invoices: opts(d.bills.filter((r) => !semesterId || Number(r.term) === Number(semesterId)), (r) => (r.semester ? r.semester + " · " : "") + r.student_name + " · " + r.label),
    payableInvoices: opts(d.bills.filter((r) => Number(r.balance) > 0 && (!semesterId || Number(r.term) === Number(semesterId))), (r) => r.semester + " · " + r.label + " · due BDT " + Number(r.balance).toFixed(2)),
    paymentMethods: choices(["bKash", "Nagad", "Bank transfer", "Office"]),
    pendingPaymentRequests: opts(e.paymentRequests.filter((r) => r.status === "Pending" && (!semesterId || Number(r.semester_id) === Number(semesterId))), (r) => r.student_name + " · " + r.semester + " · " + r.reference + " · BDT " + Number(r.amount).toFixed(2)),
    validReceipts: opts(
      d.payments.filter((r) => r.state === "Valid" && (!semesterId || Number(r.term_id) === Number(semesterId))),
      (r) => r.reference,
    ),
    pendingWaivers: opts(
      d.payments.filter((r) => r.state === "Pending" && (!semesterId || Number(r.term_id) === Number(semesterId))),
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
      d.loans.filter((l) => l.returned && (!semesterId || Number(l.semester_id) === Number(semesterId))),
      (l) => l.borrower + " · " + l.title,
    ),
    fineStates: choices(["Adjusted", "Paid", "Waived"]),
    rooms: opts(d.rooms, (r) => r.name),
    roomStates: choices(["Unavailable", "Available"]),
    draftClasses: d.routine
      .filter((r) => !r.published && (!semesterId || Number(d.offerings.find((o) => o.id === r.offering)?.term) === Number(semesterId)))
      .map((r) => ({ id: r.offering, label: r.code + " · " + r.section })),
    reviewable: opts(
      d.theses.filter((t) => ["Submitted", "Approved"].includes(t.status) && (!semesterId || Number(t.semester_id) === Number(semesterId))),
      th,
    ),
    submissions: opts(
      d.updates.filter((x) => x.filename && (!semesterId || Number(d.theses.find((t) => t.id === x.thesis)?.semester_id) === Number(semesterId))),
      (r) => r.filename + " · #" + r.id,
    ),
    finalTheses: opts(
      d.theses.filter((t) => t.status === "Final submitted" && (!semesterId || Number(t.semester_id) === Number(semesterId))),
      th,
    ),
    scheduledTheses: opts(
      d.theses.filter((t) => t.status === "Defense scheduled" && (!semesterId || Number(t.semester_id) === Number(semesterId))),
      th,
    ),
    outcomes: choices(["Passed", "Revision required"]),
    allOfferings: opts(d.offerings.filter((r) => !semesterId || Number(r.term) === Number(semesterId)), (r) => r.code + " · " + r.semester + " / " + r.section),
    examTypes: choices(["Midterm", "Final", "Quiz", "Practical", "Viva"]),
    examDrafts: opts(e.examSchedules.filter((x) => x.state !== "Cancelled" && (!semesterId || Number(x.term_id) === Number(semesterId))), (x) => x.code + " · " + x.title + " · " + x.exam_date + " · " + x.state),
    examStates: choices(["Published", "Cancelled"]),
    correctionSessions: e.sessions
      .filter((s) => s.status === "Held" && (!semesterId || Number(s.term_id) === Number(semesterId)))
      .flatMap((s) => d.regs.filter((r) => r.offering === s.offering && r.status === "Approved" && (!semesterId || Number(r.term) === Number(semesterId)) && (u.role !== "STUDENT" || r.student === u.id)).map((r) => ({ id: `${r.id}|${s.day}`, label: `${r.code} · ${s.day}` }))),
    attendanceStatuses: choices(["Present", "Absent", "Late", "Excused"]),
    reviewableCorrections: opts(e.corrections.filter((x) => x.status === "Pending" && (!semesterId || Number(x.term_id) === Number(semesterId)) && (u.role === "ADMIN" || x.teacher === u.id)), (x) => x.student_name + " · " + x.code + " · " + x.day),
    pendingGradeReviews: opts(e.gradeReviews.filter((x) => ["Pending", "Under review"].includes(x.status) && (!semesterId || Number(x.term_id) === Number(semesterId)) && (u.role === "ADMIN" || x.teacher === u.id)), (x) => x.student_name + " · " + x.code + " · " + x.status),
    gradeReviewStates: choices(["Under review", "Resolved", "Rejected"]),
    documentTypes: choices(["Enrollment certificate", "Transcript", "Student ID card", "Bonafide certificate", "Other"]),
    pendingDocuments: opts(e.documentRequests.filter((x) => x.status === "Pending" && (!semesterId || Number(x.semester_id) === Number(semesterId))), (x) => x.student_name + " · " + x.document_type),
    documentDecisions: choices(["Approved", "Rejected", "Ready"]),
    supportCategories: choices(["Academic", "Registration", "Finance", "Technical", "Other"]),
    replyableTickets: opts(e.tickets.filter((x) => !["Resolved", "Closed"].includes(x.status) && (!semesterId || Number(x.semester_id) === Number(semesterId))), (x) => "#" + x.id + " · " + x.subject),
    openTickets: opts(e.tickets.filter((x) => !["Resolved", "Closed"].includes(x.status) && (!semesterId || Number(x.semester_id) === Number(semesterId))), (x) => "#" + x.id + " · " + x.subject),
    ticketStates: choices(["Open", "In progress", "Resolved", "Closed"]),
    unavailableBooks: opts(d.books.filter((x) => Number(x.available) === 0), (x) => x.code + " · " + x.title),
    ownReservations: opts(e.reservations.filter((x) => x.student === u.id && x.status === "Pending" && (!semesterId || Number(x.semester_id) === Number(semesterId))), (x) => x.title),
    pendingReservations: opts(e.reservations.filter((x) => x.status === "Pending" && (!semesterId || Number(x.semester_id) === Number(semesterId))), (x) => x.student_name + " · " + x.title),
    reservationStates: choices(["Ready", "Rejected"]),
    renewableLoans: opts(d.loans.filter((x) => x.student === u.id && !x.returned && x.due >= today() && (!semesterId || Number(x.semester_id) === Number(semesterId)) && !e.renewals.some((r) => r.loan === x.id && ["Pending", "Approved"].includes(r.status))), (x) => x.title + " · due " + x.due),
    pendingRenewals: opts(e.renewals.filter((x) => x.status === "Pending" && (!semesterId || Number(x.semester_id) === Number(semesterId))), (x) => x.student_name + " · " + x.title),
    toggle: choices(["On", "Off"]),
    opportunityTypes: choices(["Internship", "Full-time", "Part-time", "Research", "Scholarship"]),
    availableOpportunities: opts(e.opportunities.filter((x) => x.status === "Published" && !e.applications.some((a) => a.opportunity === x.id && a.student === u.id)), (x) => x.title + " · " + x.organization),
    submittedApplications: opts(e.applications.filter((x) => ["Submitted", "Under review"].includes(x.status) && (!semesterId || Number(x.semester_id) === Number(semesterId))), (x) => x.student_name + " · " + x.opportunity_title + " · " + x.status),
    applicationStates: choices(["Under review", "Shortlisted", "Rejected"]),
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
  add("Finance", "Semester payment requests", "student_name semester invoice_label amount method reference status review_note created_at", e.paymentRequests);
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
  add("Routine", "Exam schedule", "code course_name semester title exam_type exam_date starts_at ends_at room_name state", e.examSchedules);
  add("Teaching", "Student attendance correction requests", "student_name code semester day requested_status reason status review_reason created_at", e.corrections);
  add("Teaching", "Grade review requests", "student_name code semester reason status response created_at updated_at", e.gradeReviews);
  add("Library", "Book reservations", "student_name title semester status created_at", e.reservations);
  add("Library", "Loan renewal requests", "student_name title semester current_due requested_due status review_reason", e.renewals);
  if (u.role === "STUDENT" || u.role === "ADMIN") {
    if (!groups["Student services"])
      groups["Student services"] = { tables: [], forms: [] };
    groups["Student services"].tables.push(
      table("My attendance correction requests", "code day requested_status status review_reason created_at", e.corrections),
    );
    if (!groups["Student documents"])
      groups["Student documents"] = { tables: [], forms: [] };
    groups["Student documents"].tables.push(
      table("Document requests", "semester document_type purpose status response requested_at updated_at", e.documentRequests),
    );
    if (!groups["Student support"])
      groups["Student support"] = { tables: [], forms: [] };
    groups["Student support"].tables.push(
      table("Support tickets", "id semester category subject description status reply_count created_at updated_at", e.tickets),
      table("Ticket replies", "ticket author message created_at", e.replies),
    );
    if (!groups["Career & internship"])
      groups["Career & internship"] = { tables: [], forms: [] };
    groups["Career & internship"].tables.push(
      table("Opportunities", "title organization opportunity_type description location deadline application_url status", e.opportunities),
      table("My applications", "semester opportunity_title organization cover_note status submitted_at", e.applications),
    );
  }
  groups["Account settings"] = {
    tables: [table("Notification preferences", "academic finance library thesis notices updated_at", [e.preferences])],
    forms: [],
  };
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
export async function runExtra(db, u, d, key, b, semesterId = null) {
  const q = async (sql, ...args) => (await db.execute(sql, args))[0],
    e = d.extra;
  const notify = async (recipient, message, category = "academic") => {
    const column = { academic: "academic", finance: "finance", library: "library", thesis: "thesis", notices: "notices" }[category] ?? "academic";
    const [preference] = await q(`SELECT ${column} enabled FROM notification_preferences WHERE user_id=?`, recipient);
    if (preference?.enabled !== 0) await q("INSERT INTO notifications(recipient,message) VALUES(?,?)", recipient, message);
  };
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
        "INSERT INTO loans(book,student,issued,due,semester_id) VALUES(?,?,?,?,?)",
        copy.book,
        b.student,
        today(),
        b.due,
        semesterId,
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
        "INSERT INTO theses(student,title,proposal,status,semester_id) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE title=VALUES(title),proposal=VALUES(proposal),status=VALUES(status),semester_id=VALUES(semester_id)",
        u.id,
        b.title,
        b.proposal,
        key === "topic" ? "Submitted" : "Draft",
        semesterId,
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
    case "exam_schedule": {
      const offering = d.offerings.find((o) => o.id === b.offering),
        room = d.rooms.find((r) => r.id === b.room);
      if (!offering || !room?.active || room.kind !== offering.kind)
        bad("Choose an active room that matches the course type.");
      const [term] = await q("SELECT starts_on,ends_on FROM semesters WHERE id=?", offering.term);
      if (b.exam_date < term.starts_on || b.exam_date > new Date(new Date(term.ends_on).getTime() + 60 * 86400000).toISOString().slice(0, 10))
        bad("Choose an exam date within the semester or the following 60 days.");
      if (b.ends_at <= b.starts_at || b.title.length > 140)
        bad("Check the exam title and time range.");
      if ((await q("SELECT id FROM exam_schedules WHERE room=? AND exam_date=? AND state<>'Cancelled' AND starts_at<? AND ends_at>?", b.room, b.exam_date, b.ends_at, b.starts_at)).length)
        bad("This room already has an exam during that time.");
      if ((await q("SELECT id FROM exam_schedules WHERE offering=? AND exam_type=?", b.offering, b.exam_type)).length)
        bad("An exam of this type is already scheduled for this course section.");
      await q("INSERT INTO exam_schedules(offering,title,exam_type,exam_date,starts_at,ends_at,room,created_by) VALUES(?,?,?,?,?,?,?,?)", b.offering, b.title, b.exam_type, b.exam_date, b.starts_at, b.ends_at, b.room, u.id);
      break;
    }
    case "exam_state": {
      const exam = e.examSchedules.find((x) => x.id === b.schedule);
      if (!exam || exam.state === "Cancelled") bad("This exam schedule is no longer available.");
      await q("UPDATE exam_schedules SET state=? WHERE id=?", b.state, b.schedule);
      if (b.state === "Published" && exam.state !== "Published") {
        const recipients = await q("SELECT DISTINCT student FROM registrations WHERE offering=? AND status='Approved'", exam.offering);
        for (const recipient of recipients) await notify(recipient.student, exam.title + " is scheduled for " + exam.exam_date, "academic");
      }
      break;
    }
    case "request_payment": {
      const invoice = d.bills.find(
        (item) =>
          Number(item.id) === Number(b.invoice) &&
          Number(item.term) === Number(semesterId),
      );
      if (!invoice || Number(invoice.balance) <= 0)
        bad("Choose an unpaid invoice from this semester.");
      if (Number(b.amount) > Number(invoice.balance))
        bad("Payment amount is higher than the remaining invoice balance.");
      if (
        (await q("SELECT id FROM receipts WHERE reference=? UNION SELECT id FROM student_payment_requests WHERE reference=?", b.reference, b.reference)).length
      )
        bad("This transaction reference has already been used.");
      await q(
        "INSERT INTO student_payment_requests(student,invoice,semester_id,amount,method,reference,student_note) VALUES(?,?,?,?,?,?,NULLIF(?,''))",
        u.id,
        invoice.id,
        semesterId,
        b.amount,
        b.method,
        b.reference,
        b.reason,
      );
      break;
    }
    case "payment_request_review": {
      const request = e.paymentRequests.find(
        (item) =>
          Number(item.id) === Number(b.request) && item.status === "Pending",
      );
      if (!request) bad("This payment request is no longer pending.");
      if (b.review_reason.length > 500) bad("Review note must be 500 characters or fewer.");
      let receiptId = null;
      if (b.decision === "Approved") {
        const invoice = d.bills.find((item) => Number(item.id) === Number(request.invoice));
        if (!invoice || Number(invoice.balance) < Number(request.amount))
          bad("The invoice balance changed; review the remaining amount first.");
        const result = await q(
          "INSERT INTO receipts(invoice,amount,kind,reference) VALUES(?,?,'Payment',?)",
          request.invoice,
          request.amount,
          request.reference,
        );
        receiptId = result.insertId;
        await q(
          "INSERT INTO receipt_details(receipt,state,method,reason,actor,reviewer) VALUES(?,'Valid',?,?,?,?)",
          receiptId,
          request.method,
          (b.review_reason || "Student payment verified").slice(0, 140),
          request.student,
          u.id,
        );
      }
      await q(
        "UPDATE student_payment_requests SET status=?,reviewer=?,review_note=NULLIF(?, ''),receipt_id=? WHERE id=? AND status='Pending'",
        b.decision,
        u.id,
        b.review_reason,
        receiptId,
        request.id,
      );
      await notify(
        request.student,
        "Your " + request.semester + " fee payment was " + b.decision.toLowerCase() + (b.review_reason ? ": " + b.review_reason.slice(0, 100) : ""),
        "finance",
      );
      break;
    }
    case "attendance_request": {
      const match = /^(\d+)\|(\d{4}-\d\d-\d\d)$/.exec(b.session);
      if (!match) bad("Choose a valid held class session.");
      const regId = Number(match[1]), day = match[2],
        reg = d.regs.find((r) => r.id === regId && r.student === u.id && r.status === "Approved"),
        session = e.sessions.find((s) => s.offering === reg?.offering && s.day === day && s.status === "Held");
      if (!reg || !session || day > today() || b.reason.length > 500)
        bad("Choose a past held class from your approved course and include a reason.");
      if ((await q("SELECT id FROM attendance_correction_requests WHERE reg=? AND day=? AND status='Pending'", regId, day)).length)
        bad("A correction request is already pending for this class.");
      const [current] = await q("SELECT COALESCE(ast.status,CASE WHEN a.present=1 THEN 'Present' ELSE 'Absent' END) status FROM class_sessions cs LEFT JOIN attendance a ON a.reg=? AND a.day=cs.day LEFT JOIN attendance_status ast ON ast.reg=a.reg AND ast.day=a.day WHERE cs.id=?", regId, session.id);
      if (current?.status === b.requested_status) bad("The official attendance already has this status.");
      await q("INSERT INTO attendance_correction_requests(reg,student,day,requested_status,reason) VALUES(?,?,?,?,?)", regId, u.id, day, b.requested_status, b.reason);
      break;
    }
    case "attendance_review": {
      const [request] = await q("SELECT a.*,o.teacher,cs.id session_id FROM attendance_correction_requests a JOIN registrations r ON r.id=a.reg JOIN offerings o ON o.id=r.offering JOIN class_sessions cs ON cs.offering=r.offering AND cs.day=a.day WHERE a.id=? FOR UPDATE", b.correction);
      if (!request || request.status !== "Pending" || (u.role !== "ADMIN" && request.teacher !== u.id))
        bad("This pending request is outside your teaching assignment.");
      if (b.review_reason.length > 500) bad("Review note is too long.");
      if (b.decision === "Approved") {
        const [previous] = await q("SELECT COALESCE(ast.status,CASE WHEN a.present=1 THEN 'Present' ELSE 'Absent' END) status FROM attendance a LEFT JOIN attendance_status ast ON ast.reg=a.reg AND ast.day=a.day WHERE a.reg=? AND a.day=?", request.reg, request.day);
        const oldStatus = previous?.status ?? "Absent";
        await q("INSERT INTO attendance(reg,day,present) VALUES(?,?,?) ON DUPLICATE KEY UPDATE present=VALUES(present)", request.reg, request.day, ["Present", "Late"].includes(request.requested_status));
        await q("INSERT INTO attendance_status(reg,day,status,actor) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),actor=VALUES(actor)", request.reg, request.day, request.requested_status, u.id);
        await q("INSERT INTO attendance_notes(session_id,reg,actor,reason,previous_status,new_status) VALUES(?,?,?,?,?,?)", request.session_id, request.reg, u.id, (b.review_reason || request.reason).slice(0, 140), oldStatus, request.requested_status);
      }
      await q("UPDATE attendance_correction_requests SET status=?,reviewer=?,review_reason=? WHERE id=?", b.decision, u.id, b.review_reason || null, b.correction);
      await notify(request.student, "Attendance correction request " + b.decision.toLowerCase() + " for " + request.day + (b.review_reason ? ": " + b.review_reason.slice(0, 100) : ""));
      break;
    }
    case "grade_review_request": {
      const reg = d.regs.find((r) => r.id === b.reg && r.student === u.id && r.published);
      if (!reg || b.reason.length > 1000) bad("Choose one of your published results and include a short reason.");
      if ((await q("SELECT id FROM grade_review_requests WHERE reg=? AND status IN ('Pending','Under review')", reg.id)).length)
        bad("A grade review is already open for this course.");
      await q("INSERT INTO grade_review_requests(reg,student,reason) VALUES(?,?,?)", reg.id, u.id, b.reason);
      break;
    }
    case "grade_review": {
      const [request] = await q("SELECT g.*,o.teacher FROM grade_review_requests g JOIN registrations r ON r.id=g.reg JOIN offerings o ON o.id=r.offering WHERE g.id=? FOR UPDATE", b.request);
      if (!request || !["Pending", "Under review"].includes(request.status) || (u.role !== "ADMIN" && request.teacher !== u.id))
        bad("This grade review request is outside your teaching assignment or already closed.");
      if (b.response.length > 500) bad("Response must be 500 characters or fewer.");
      await q("UPDATE grade_review_requests SET status=?,response=?,reviewer=? WHERE id=?", b.state, b.response || null, u.id, b.request);
      await notify(request.student, "Your grade review request is " + b.state.toLowerCase() + (b.response ? ": " + b.response.slice(0, 100) : ""));
      break;
    }
    case "document_request":
      if (b.purpose.length > 1000) bad("Purpose must be 1000 characters or fewer.");
      await q("INSERT INTO student_document_requests(student,document_type,purpose,semester_id) VALUES(?,?,?,?)", u.id, b.document_type, b.purpose, semesterId);
      break;
    case "document_review": {
      const [request] = await q("SELECT * FROM student_document_requests WHERE id=? FOR UPDATE", b.document_request);
      if (!request || request.status !== "Pending") bad("This document request has already been reviewed.");
      if (b.response.length > 500) bad("Response must be 500 characters or fewer.");
      await q("UPDATE student_document_requests SET status=?,response=?,reviewer=? WHERE id=?", b.decision, b.response || null, u.id, b.document_request);
      await notify(request.student, "Your " + request.document_type + " request was " + b.decision.toLowerCase() + (b.response ? ": " + b.response.slice(0, 100) : ""));
      break;
    }
    case "support_ticket":
      if (b.description.length > 5000) bad("Description must be 5000 characters or fewer.");
      await q("INSERT INTO support_tickets(student,category,subject,description,semester_id) VALUES(?,?,?,?,?)", u.id, b.category, b.subject, b.description, semesterId);
      break;
    case "ticket_reply": {
      const [ticket] = await q("SELECT * FROM support_tickets WHERE id=? FOR UPDATE", b.ticket);
      if (!ticket || (u.role === "STUDENT" && ticket.student !== u.id) || ["Resolved", "Closed"].includes(ticket.status))
        bad("This ticket is unavailable or closed.");
      if (b.message.length > 5000) bad("Reply must be 5000 characters or fewer.");
      await q("INSERT INTO support_replies(ticket,author,message) VALUES(?,?,?)", b.ticket, u.id, b.message);
      await q("UPDATE support_tickets SET updated_at=CURRENT_TIMESTAMP WHERE id=?", b.ticket);
      if (u.role !== "STUDENT") await notify(ticket.student, "A staff member replied to support ticket #" + ticket.id);
      break;
    }
    case "ticket_status": {
      const [ticket] = await q("SELECT * FROM support_tickets WHERE id=? FOR UPDATE", b.ticket);
      if (!ticket || ["Resolved", "Closed"].includes(ticket.status)) bad("This ticket is already closed.");
      await q("UPDATE support_tickets SET status=? WHERE id=?", b.state, b.ticket);
      await notify(ticket.student, "Support ticket #" + ticket.id + " is now " + b.state);
      break;
    }
    case "reserve_book": {
      const book = d.books.find((x) => x.id === b.book);
      if (!book || Number(book.available) > 0) bad("Reservations are for books with no available copies.");
      if ((await q("SELECT id FROM library_reservations WHERE student=? AND book=? AND status IN ('Pending','Ready')", u.id, b.book)).length)
        bad("You already have an active reservation for this book.");
      await q("INSERT INTO library_reservations(book,student,semester_id) VALUES(?,?,?)", b.book, u.id, semesterId);
      break;
    }
    case "cancel_reservation": {
      const [reservation] = await q("SELECT * FROM library_reservations WHERE id=? FOR UPDATE", b.reservation);
      if (!reservation || reservation.student !== u.id || reservation.status !== "Pending") bad("Only your pending reservations can be cancelled.");
      await q("UPDATE library_reservations SET status='Cancelled' WHERE id=?", b.reservation);
      break;
    }
    case "reservation_review": {
      const [reservation] = await q("SELECT * FROM library_reservations WHERE id=? FOR UPDATE", b.reservation);
      if (!reservation || reservation.status !== "Pending") bad("This reservation has already been reviewed.");
      if (b.state === "Ready") {
        const [stock] = await q("SELECT copies-(SELECT COUNT(*) FROM loans WHERE book=? AND returned IS NULL) available FROM books WHERE id=?", reservation.book, reservation.book);
        if (!stock || Number(stock.available) <= 0) bad("No copy is available yet; keep this reservation pending.");
      }
      await q("UPDATE library_reservations SET status=?,reviewed_by=? WHERE id=?", b.state, u.id, b.reservation);
      await notify(reservation.student, "Library reservation " + b.state.toLowerCase(), "library");
      break;
    }
    case "renewal_request": {
      const loan = d.loans.find((x) => x.id === b.loan && x.student === u.id && !x.returned);
      if (!loan || loan.due < today() || b.requested_due <= loan.due) bad("Renewals must be requested before the due date and extend it.");
      const maxDue = new Date(new Date(loan.due).getTime() + 14 * 86400000).toISOString().slice(0, 10);
      if (b.requested_due > maxDue) bad("A renewal can extend the due date by at most 14 days.");
      if (e.renewals.some((r) => r.loan === loan.id && ["Pending", "Approved"].includes(r.status))) bad("This loan already has a pending or approved renewal.");
      if ((await q("SELECT id FROM library_reservations WHERE book=? AND student<>? AND status IN ('Pending','Ready')", loan.book, u.id)).length) bad("Another student is waiting for this book.");
      await q("INSERT INTO loan_renewal_requests(loan,student,requested_due,semester_id) VALUES(?,?,?,?)", loan.id, u.id, b.requested_due, semesterId);
      break;
    }
    case "renewal_review": {
      const [request] = await q("SELECT r.*,l.due current_due,l.returned,l.book FROM loan_renewal_requests r JOIN loans l ON l.id=r.loan WHERE r.id=? FOR UPDATE", b.renewal);
      if (!request || request.status !== "Pending") bad("This renewal request has already been reviewed.");
      if (b.review_reason.length > 500) bad("Review note is too long.");
      if (b.decision === "Approved") {
        if (request.returned || request.current_due < today() || request.requested_due <= request.current_due || request.requested_due > new Date(new Date(request.current_due).getTime() + 14 * 86400000).toISOString().slice(0, 10)) bad("The loan no longer meets renewal policy.");
        if ((await q("SELECT id FROM library_reservations WHERE book=? AND student<>? AND status IN ('Pending','Ready')", request.book, request.student)).length) bad("Another student is waiting for this book.");
        await q("UPDATE loans SET due=? WHERE id=?", request.requested_due, request.loan);
      }
      await q("UPDATE loan_renewal_requests SET status=?,reviewed_by=?,review_reason=? WHERE id=?", b.decision, u.id, b.review_reason || null, b.renewal);
      await notify(request.student, "Library loan renewal " + b.decision.toLowerCase() + (b.review_reason ? ": " + b.review_reason.slice(0, 100) : ""), "library");
      break;
    }
    case "notification_preferences":
      await q("INSERT INTO notification_preferences(user_id,academic,finance,library,thesis,notices) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE academic=VALUES(academic),finance=VALUES(finance),library=VALUES(library),thesis=VALUES(thesis),notices=VALUES(notices)", u.id, b.academic === "On", b.finance === "On", b.library === "On", b.thesis === "On", b.notices === "On");
      break;
    case "career_opportunity": {
      if (b.description.length > 5000 || b.location.length > 120) bad("Opportunity details exceed the allowed length.");
      if (b.deadline && (!isIsoDate(b.deadline) || b.deadline < today())) bad("Choose a valid current or future application deadline.");
      if ((await q("SELECT id FROM career_opportunities WHERE title=? AND organization=?", b.title, b.organization)).length) bad("This opportunity already exists.");
      await q("INSERT INTO career_opportunities(title,organization,opportunity_type,description,location,deadline,application_url,status,created_by) VALUES(?,?,?,?,?,NULLIF(?,''),NULLIF(?,''),'Published',?)", b.title, b.organization, b.opportunity_type, b.description, b.location, b.deadline, b.application_url, u.id);
      break;
    }
    case "career_apply": {
      const opportunity = e.opportunities.find((x) => x.id === b.opportunity && x.status === "Published" && (!x.deadline || x.deadline >= today()));
      if (!opportunity || b.cover_note.length > 1000) bad("This opportunity is closed or the application note is too long.");
      await q("INSERT INTO career_applications(opportunity,student,cover_note,semester_id) VALUES(?,?,NULLIF(?,''),?)", b.opportunity, u.id, b.cover_note, semesterId);
      break;
    }
    case "career_review": {
      const [application] = await q("SELECT * FROM career_applications WHERE id=? FOR UPDATE", b.application);
      if (!application || !["Submitted", "Under review"].includes(application.status) || !["Under review", "Shortlisted", "Rejected"].includes(b.state)) bad("This application has already been reviewed.");
      await q("UPDATE career_applications SET status=? WHERE id=?", b.state, b.application);
      await notify(application.student, "Your career application is " + b.state.toLowerCase());
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
