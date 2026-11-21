# Database relationships
```mermaid
erDiagram
    users ||--o{ sessions : authenticates
    users ||--o| students : identifies
    programs ||--o{ students : enrolls
    departments ||--o{ programs : owns
    departments ||--o{ courses : offers
    academic_years ||--o{ semesters : contains
    users ||--o{ audit_logs : changes
```
`db/schema.sql` contains all field definitions, keys, checks and views. Academic codes, email addresses and student numbers are unique. Audit records carry resource type and record ID. The repeatable demo records are consolidated in `db/seed.sql`. Archiving keeps academic identifiers stable for future enrollment records.

## Academic operations

A program and batch identify a student cohort. An offering links a course, term, teacher and program. Registrations link students to offerings. Attendance, marks and grade publication refer to the registration. Invoices link to students and receipts link to invoices. Library loans link students and books. Timetable rows link offerings to a room and slot. Each thesis belongs to a student and has an assigned supervisor and a private submission/feedback history. All keys and constraints are in `db/schema.sql`.

The unified schema also includes grade snapshots and thresholds, sessions and assessments, invoice/receipt details, physical copies, fines, notice publication, feedback/vivas, notifications, availability, policies, permissions and histories. `BLUEPRINT_CHECKLIST.md` describes the historical-data design decisions.
