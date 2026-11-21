# Development seed guide

## Setup and rerun

Configure `.env` to point at a local MySQL 8.0.16+ or MariaDB 10.11+ database, then run:

```powershell
npm.cmd run db:setup
npm.cmd run db:verify-seed
```

`db:setup` applies the full consolidated schema and seed. To run them separately use `npm.cmd run db:migrate` and `npm.cmd run db:seed`. The seed is repeatable: it reuses the legacy seed marker, `INSERT IGNORE`, unique keys and `NOT EXISTS` checks. New role permissions and portal sample records are also checked before the legacy early-exit, so an existing demo database gets the additive fixtures on rerun.

Set `DEMO_PASSWORD` in `.env` before seeding to choose a 12–256 character password. The runner hashes it using the application's scrypt password scheme; the password itself is never stored in SQL. If SQL is run directly in Workbench, it uses the static development hash for **CampusDemo2026!**. Do not use demo credentials on a shared/production environment.

## Core demo accounts

All accounts below use `CampusDemo2026!` unless overridden by `DEMO_PASSWORD` when seeded.

| Role | Email | Main workspace |
|---|---|---|
| Admin | `admin@campus.test` | Accounts, people, routine, exam schedule, document review, support, career posts and audit |
| Student | `student@campus.test` | Academic progress, courses, attendance requests, exams, fees, library, documents, support, applications and thesis |
| Teacher | `teacher@campus.test` | Assigned sections, attendance corrections, marks and assessments |
| Advisor | `advisor@campus.test` | Assigned advisees and registration/academic records |
| Accounts officer | `accounts_officer@campus.test` | Fees, invoices, receipts and waivers |
| Librarian | `librarian@campus.test` | Catalogue, circulation, reservations, renewal requests and fines |
| Thesis supervisor | `thesis_supervisor@campus.test` | Assigned theses, feedback and milestones |

The seed also creates 30 fictional demo accounts for each role using `@demo.campus.test`, plus historical records used by existing reporting and prediction examples.

## Portal scenarios included

- The core student has a student profile row, contact fields ready to fill, notification defaults, published exam data, one enrollment-certificate request and one support ticket.
- A fictional career internship is open for student application.
- Existing registrations, held sessions, published results, fee balance, library catalogue, notices, routine and thesis records continue to supply the other portal pages.
- The published historical course result can be used to submit and review a grade recheck request; the review workflow records a decision and never changes the official mark by itself.
- To test a correction request, select a past held session where the student has an approved registration; the assigned teacher or admin then reviews it.
- Exam schedules are visible to the student only after publication and only for courses with an approved registration.
- Student tickets, applications, loans and request histories are scoped to the signed-in student.

The fictional document request can be approved/rejected and tracked; this version does not create a downloadable official document file. Online payments are not simulated.

## Isolated database tests

Database-backed suites reject any database name that does not end with `_test`. Create and seed a separate test database before running `npm.cmd run test:blueprint`, `npm.cmd run test:operations`, `npm.cmd run test:integration` or `npm.cmd run test:e2e`. The configured database in this checkout is not a test database, so do not run these suites against it.
