# Role permissions

| Role | Authorized workspace |
|---|---|
| Admin | Academic catalog, account activation, student/faculty profiles, advisor assignment, offerings/prerequisites, approval and result publication, finance, library, notices, term scheduling, thesis allocation and institutional analytics |
| Student | Own profile, registration requests/drop, attendance, published results, fee ledger, borrowing, routine, recommendations, thesis proposal and versioned submissions |
| Teacher | Assigned section registers, attendance, marks and result publication, material links, schedule and availability |
| Advisor | Assigned students, registration review, academic standing and risk indicators |
| Accounts officer | Student billing directory, fee items, invoices, payments, waivers and collection totals |
| Librarian | Book catalogue, student borrower selection, issue/return and overdue fines |
| Thesis supervisor | Assigned projects, PDF/feedback history and ordered milestone transitions |

Each account has one role. Every signed-in role can access its own account security, targeted notices, book catalogue and the scoped assistant. Public institutional timetable views contain published course schedules. Students see their enrolled classes. Role and object checks run on the server. Every write is checked again inside a transaction.

The versioned permission map gates operational writes. Staff and Admin can record payments. Admin approves waivers and reopens published marks. Changes to grading, payments, attendance and registration are audited. Role changes revoke prior sessions.
