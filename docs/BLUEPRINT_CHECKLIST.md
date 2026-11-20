# Phase 1–3 implementation review

The previous Windows release supplied migrations 001–003, the React/Express shell, login, catalog and initial operational workflows. This release adds migrations 004–006, approval and correction paths, program policies, resource and document history, 30-record datasets and cross-role browser verification.

| Milestone | Implemented path and acceptance |
|---|---|
| 0–1. Foundation and security | Seven roles, current-user routes, password hashing, session revocation, active state, action permissions, staff role changes, ownership checks, audit and role-specific navigation. Tests cover sign-in, wrong role and disabled accounts. |
| 2. Structure | Departments, programs, years, semesters and courses. Catalog create/edit/archive, parent dates, program degree/duration/credits, course descriptions, prerequisites with minimum points, sections and active state. Catalog tests cover persistence and invalid dates. |
| 3. People | Admission term, employee number, effective advisor assignments and history, directory, status and teaching assignments. Role dashboards show scoped records. |
| 4. Registration | Program, cohort, active section, deadlines, credits, prior results, seats and timetable checks. Requests, review comments and notifications persist. The browser journey creates a term and section, then registers and approves a student. |
| 5. Attendance | Held/cancelled classes, present/absent/late/excused marks, unique register and correction reasons. Held unmarked sessions count as absent, late counts as present and excused/cancelled sessions are excluded. Tests inspect the percentage and reject invalid corrections. |
| 6. Results | Named weighted assessments, max marks, editable grading bands, draft totals, explicit publication, lock and Admin-only reopen. Published records retain the grade awarded under the original policy. Browser tests check student visibility. |
| 7. Finance | Program/term fee categories, invoice line items and dates, partial payments, unique references, pending/approved/rejected waivers, voids, balance and history. Authorization and decimal balances have regression tests. |
| 8. Notices | Everyone, role, department, program, section, semester or individual; dated draft/published/archived notices, private PDF attachments, workflow notifications and per-recipient reads. Tests exercise targeted publication and isolation. |
| 9. Library | Author relationships, ISBN/edition/publisher, physical copies with accession and condition, copy-specific checkout, program borrowing limits, overdue policy, return, fine adjustment/settlement and history. Tests cover duplicate issue and borrowing policy. |
| 10. Routine | Room metadata, teacher and room availability, type/capacity, shared teacher/cohort/room constraints and overlapping terms. Generate, optionally move a draft entry, review and publish. Failed generation returns the blocking section and rolls back schedule changes. |
| 11. Thesis | Draft, submission, revision/resubmission, approval/allocation history, progress, versioned documents, feedback tied to submission, final submission, viva schedule and outcome. Private PDF downloads enforce ownership. |
| 12. Integration | Shared search/filter/sort/pagination, confirmation, validation, loading, empty and saved states. Browser tests follow linked workflows across all seven roles and verify that a second student and teacher cannot access private records. |

## Implementation decisions

- The Express/PostgreSQL stack and single active role per account are preserved. Stored action permissions supplement server-side ownership and validation.
- An offering is identified by course and term. Sections have independent IDs for capacity, teacher, availability and enrollment. SQL views expose offerings, sections, user roles, permissions, payments and waivers.
- Each section has one weekly meeting across 30 available 90-minute slots. The generator uses deterministic first-fit. An unsuccessful search identifies the section that could not be placed. Manual adjustments and publication run the same validation. The search does not prove every infeasible result mathematically.
- Published attempts contribute to GPA by credit. Earned credits count a passed course once. Grade thresholds and credit limits are configurable by program. Sections without a named assessment plan can use the original coursework/final workflow. Admin can reopen results with a reason.
- New invoices have an issue date. Historical invoices lacking an issue date use the date previously stored as due. Historical waivers keep their previously effective balance. New waivers need Admin approval.
- Academic cutoffs use the Bangladesh calendar. Timezone, locale and currency display preferences are configurable. Currency labels do not convert amounts.
- The interface groups related pages by workflow. The combined workspace loads the user's authorized records. Its table API supports page, pageSize, search, status and sort. This implementation targets a thesis/demo workload.
- Each private file has a numeric storage ID, separate display name, PDF-only format and a 1 MiB limit. Earlier submissions remain downloadable.
- The blueprint defers predictive services, risk scoring, recommendations, chatbot and advanced analytics. The prior code remains behind ENABLE_PHASE4, disabled by default. Live gateways, SSO, SMS and cloud storage were classified as optional.
- The 30-row check covers every business/configuration table and all seven account roles. Tokens, migration history, seed markers, the write lock and singleton institution settings retain their operational semantics.

## Verification

Use a separate database ending in _test. Run db:migrate, db:seed and db:verify-seed. Repeat the seed and compare counts. Run lint, test, build, test:integration, test:operations, test:blueprint and test:e2e. The browser suite creates uniquely named test fixtures in that database. Native Windows double-click and default browser launch require a Windows host.
