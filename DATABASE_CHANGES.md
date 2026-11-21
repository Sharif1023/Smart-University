# Database changes

Date: 2026-11-21 · Engine: MySQL 8.0.16+ or MariaDB 10.11+

The project keeps a single consolidated MySQL schema at `db/schema.sql` and a single complete development seed at `db/seed.sql`. There is no ORM/migration framework; the project-standard setup runner applies the schema and seed in order.

## Additive tables

| Table | Purpose and relationships |
|---|---|
| `student_profiles` | One row per `students.user_id`; personal contact/address, guardian/emergency contact, date of birth and private photo BLOB/MIME. Cascades with its student account. |
| `exam_schedules` | Per-offering exam date/time/type/room and Draft/Published/Cancelled state. Links to `offerings`, `rooms` and creator `users`; unique offering/type, exam date/state index and start/end check. |
| `attendance_correction_requests` | Student request for a held attendance date, requested status, reviewer and decision. Links to registration/student/reviewer; indexed by student/status/day. |
| `grade_review_requests` | Student request to review a published result, with assigned-teacher/admin response and status tracking; indexed by student/status/time. It does not silently change the official grade. |
| `student_document_requests` | Student-owned request, purpose, staff response and status; indexed for student/status/time. |
| `support_tickets` | Student-owned request with category, description, status and optional assignee; indexed by student/status/update time. |
| `support_replies` | Ticket messages linked to the author and ticket; replies cascade when a ticket is removed. |
| `library_reservations` | Student reservation for a book, review status and reviewer. |
| `loan_renewal_requests` | Student request to extend a loan with bounded requested due date and review history. |
| `notification_preferences` | One row per user with academic, finance, library, thesis and notice toggles; defaults to enabled. |
| `career_opportunities` | Admin-published fictional or real campus opportunity, deadline and optional HTTPS application URL. Title/organization are unique. |
| `career_applications` | Student-owned application/status linked to an opportunity; unique opportunity/student pair. |

The new entities use foreign keys and the relevant unique constraints, status checks and indexes for their lookup and workflow rules. Currency and grade storage in existing entities are unchanged.

## Safety and migration behavior

- New entities use `CREATE TABLE IF NOT EXISTS`; existing student, academic, finance, library, authentication and thesis rows are preserved.
- No existing table is dropped or renamed. Existing views are maintained by the existing `CREATE OR REPLACE VIEW` statements.
- Seed additions use insert-ignore or explicit existence checks. The new portal release fixtures are applied before the legacy seed marker check, so an already-seeded local database receives the missing role permissions and portal examples.
- The seed still uses a temporary stored procedure and drops only that procedure after it runs; it does not drop application tables or student data.
- Do not point database test suites at a live or production database. Use a separately prepared database whose name ends with `_test`.
- The consolidated schema and seed were applied and verified against the local MariaDB 10.11.19 development database. The changes are additive; no tables were dropped. Keep a separate backup before applying to any database containing real university records. The Windows launcher can save prior PostgreSQL settings as `.env.previous` and provision a MySQL-compatible database, but it does not copy PostgreSQL data.

## Apply

```powershell
# After creating/configuring a MySQL database and setting .env:
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:verify-seed
```

Or run schema and seed together:

```powershell
npm.cmd run db:setup
```

Workbench import order is `db/schema.sql`, then `db/seed.sql`. Use Workbench script execution for the seed because it defines a delimiter-styled stored procedure. `db/setup.js` handles the delimiter automatically.
