# Implementation and team handoff

| Owner | Modules | Main source |
|---|---|---|
| Member 1 | Authentication, catalog, profiles, faculty/advisor mapping, eligibility, registration and results | server/app.js, server/catalog.js, server/operations/records.js, db/ |
| Member 2 | Workflow validation, finance, notices, library, scheduling and thesis | server/operations/forms.js, server/operations/mutate.js |
| Member 3 | Role-aware workspace, academic summaries, notifications, frontend, QA and Windows release | server/operations/workspace.js, web/, tests/, scripts/windows.js |

All modules use the same database and session. Keep the complete MySQL schema in `db/schema.sql` and repeatable demo fixtures in `db/seed.sql`. A workflow exposes its form through forms.js, implements its transaction in mutate.js, and returns scoped display data from workspace.js. The React client uses the choices and permissions returned by the API. The server independently validates each submission against current records.

## Milestone status

The Windows package provides the React/Express shell, login, catalog and operational workflows. See BLUEPRINT_CHECKLIST.md for milestones 0–12, acceptance paths and implementation decisions. The optional services remain available behind ENABLE_PHASE4=true. The default is false.
