# Student Portal implementation

Date: 2026-11-21

This extends the existing React + Express + MySQL application. It does not replace the framework, authentication, or existing operations workspace. The initial source inventory is in [STUDENT_PORTAL_AUDIT.md](STUDENT_PORTAL_AUDIT.md).

## Implemented in this change

| Feature | What now exists | Verification status |
|---|---|---|
| Student profile | Student can update contact/address, date of birth, guardian and emergency details. JPG/PNG/WebP profile photo upload is limited to 1 MiB and checked against the file signature. Academic identity remains staff-controlled. | Lint, build and validator unit tests pass; database route not exercised |
| Exam routine | Admin can draft, publish or cancel an exam schedule. Room/time overlap, room type, date range and per-section exam type are checked. Students see published exams only for approved registrations. | Lint/build pass; MySQL workflow not exercised |
| Attendance correction | Student requests a change for a held session; assigned teacher or admin reviews it. Approval updates official attendance/status and appends an audit note in the same transaction. | Integration scenario added; workflow not exercised end to end |
| Grade review and grade sheet | Student can request review of a published result; assigned teacher/admin tracks it without silently editing the grade. Student can download published results as a CSV grade sheet. | Integration scenario added; build pass; workflow not exercised end to end |
| Student documents | Student can request a certificate/transcript/ID card record; admin can approve or reject with a response. | Lint/build pass; MySQL workflow not exercised |
| Student support | Student-owned tickets and replies, staff replies/status changes, ticket history and ownership checks. | Integration scenario added; workflow not exercised end to end |
| Library requests | Student can request an unavailable book reservation, cancel a pending reservation and request a bounded loan renewal. Librarian/admin reviews requests; renewal rechecks overdue/hold policy before changing the due date. | Lint/build pass; MySQL workflow not exercised |
| Notification preferences | Per-user academic, finance, library, thesis and notice preferences are saved. Existing and new workflow notifications respect the selected category. | Lint/build pass; MySQL workflow not exercised |
| Career and internship | Admin publishes fictional/demo opportunities; students apply and see only their own applications; admin reviews submissions. | Integration scenario added; workflow not exercised end to end |
| Academic progress | Existing official CGPA/credit data remains the source; Analytics includes a local-only one-course what-if GPA calculator. | Build and existing unit checks pass |
| Assistant and estimates | The existing intent-based helper now supports exams, assessments and overdue loans. Rule-based estimates are explicitly labeled and show no estimate without enough historical examples. | Source, lint/build and unit checks; database workflow not exercised |
| Seed and verification | New workflows receive role permissions and repeatable fictional sample rows. Seed verification checks profile/preferences coverage and representative portal fixtures. | `db:setup` succeeded twice; seed verification passed on local MariaDB 10.11.19 |

## Main files

- `server/app.js`, `server/validation.js`: authenticated profile API, photo upload/read and input checks.
- `server/operations/blueprint.js`: self-service forms/options, scoped records, validators and transactional workflow handlers.
- `server/operations/records.js`, `server/operations/mutate.js`, `server/operations/workspace.js`: student scope, GPA data, permissions, audit/notification flow and assistant queries.
- `web/main.tsx`, `web/ServiceLinks.tsx`, `web/Operations.tsx`, `web/style.css`: profile UI, navigation, workflow forms/tables and what-if calculator.
- `db/schema.sql`, `db/seed.sql`, `db/verify-seed.js`: additive MySQL entities, demo data and verification.
- `tests/unit.test.js`, `tests/blueprint.test.js`: image/date/time unit checks and database workflow scenarios.

## Workflow and access rules

- All new actions use the existing `role_permissions` matrix and server-side form choice validation.
- Students see only their own requests, tickets, applications, registrations, published exams, loans and profile photo. Staff review options are scoped to their role and assigned courses where applicable.
- Profile photo MIME and signature must agree; only JPG, PNG and WebP up to 1 MiB are accepted. The image endpoint requires the same authenticated student session and sends private/no-store headers.
- Attendance official records change only after a teacher/admin approves a pending request. The correction and audit note are written in the same API transaction.
- Renewal decisions recheck the loan state and other students’ active reservations before updating the loan due date. Online payment confirmation is not simulated.
- What-if GPA is calculated in the browser and never writes to the database.
- The Academic Assistant uses fixed intent branches and parameterized ERP reads; it cannot execute model-generated SQL.

## Completion matrix

### Implemented and verified here

- ESLint, TypeScript check and production frontend build.
- Unit checks for SQL delimiter/comment parsing, catalog validation, date/time boundaries, file-signature validation and salted password hashing.
- MySQL-compatible schema and seed setup, repeat setup, and seed verification.
- Login, authenticated session lookup and logout for all seven core demo roles.
- Student what-if calculator uses only already-loaded published GPA data and keeps scenarios in browser state.

### Implemented but not live-verified

- New MySQL-backed profile, exam, attendance, grade-review, document, support, library, preferences and career workflows have source-level authorization and test scenarios, but were not each exercised end to end in this pass.

### Blocked by local environment

- Broader database integration and browser end-to-end tests remain unrun because the configured database is `smart_university`, not a separate `_test` database. Do not point those suites at this development database.

### Still incomplete

- Password reset/email delivery and 2FA; downloadable ID card/transcript/certificate PDF generation (published grades can be exported as CSV); curriculum-version degree audit and graduation eligibility; online payment gateway/installments/scholarships; email/SMS notifications; reservation-to-copy checkout automation; support staffing beyond the admin role; thesis topic catalogue/group members/deadlines; trained ML or LLM integrations; broader chatbot FAQ and prediction history.
- A document request can be approved/rejected and tracked, but this release does not generate or attach the requested official document.

## Run commands

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Set DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD for a local MySQL database.
npm.cmd run db:setup
npm.cmd run build
npm.cmd start
```

For the development server use `npm.cmd run dev` after setting `APP_ORIGIN=http://localhost:5173`. For a guided first Windows setup, run `START-WINDOWS.cmd`; it provisions a local MySQL app account, imports schema/seed and starts the site.
