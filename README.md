# Smart University ERP · Campus Desk

Campus Desk is a role-based university ERP with a React and TypeScript frontend, an Express API, and PostgreSQL. It includes academic records, registration, attendance, finance, library circulation, class routines, notices, notifications, and thesis supervision.

## Run on Windows

Install **Node.js 24 LTS** and **Docker Desktop**, then start Docker Desktop. Extract the project and open `START-WINDOWS.cmd`. The launcher creates `.env` from the local defaults when needed, starts PostgreSQL, applies the schema, adds demo data, and opens the app at **http://localhost:4000**. Keep the launcher window open while using the app. Press **Ctrl+C** to stop the API; PostgreSQL and its data stay in Docker.

For a source checkout, install the Node dependencies once first:

```powershell
npm ci
```

The launcher will then start the database and app. The first Docker startup can take a minute while PostgreSQL downloads its image.

## Run from a terminal

In PowerShell, from the project folder:

```powershell
Copy-Item .env.example .env
npm ci
npm run db:up
npm run db:migrate
npm run db:seed
npm start
```

Open **http://localhost:4000**. The sample `.env` uses a local PostgreSQL container on port `5433`; the API connects as the restricted `campus` database role. Keep the default credentials on your machine only.

To stop the API, press **Ctrl+C**. To stop PostgreSQL while preserving its data:

```powershell
npm run db:down
```

Do not use `docker compose down -v` unless you intend to delete the local PostgreSQL database volume.

## Development

The `.env.example` defaults to `APP_ORIGIN=http://localhost:5173` for Vite development:

```powershell
npm run dev
```

Open **http://localhost:5173**. The dev command starts the API and Vite together. For the production-style local server, set `APP_ORIGIN=http://localhost:4000`, then run:

```powershell
npm run build
npm start
```

Useful project checks:

```powershell
npm run lint
npm test
npm run build
```

The integration, operations, blueprint, and browser suites use a database. Set `.env` to a separate PostgreSQL database whose name ends in `_test`, migrate and seed it, and then run the relevant `test:*` script. Avoid running those suites against a database with data you need to keep.

## Demo accounts

The default demo password is **CampusDemo2026!**. It can be changed with `DEMO_PASSWORD` before seeding.

| Role | Email | Main workspace |
|---|---|---|
| Admin | `admin@campus.test` | People, registration, routine, notices, settings |
| Student | `student@campus.test` | Academic standing, registration, teaching, finance |
| Teacher | `teacher@campus.test` | Teaching, assessments, routine |
| Advisor | `advisor@campus.test` | Registration review, advisees, academic records |
| Accounts | `accounts_officer@campus.test` | Fees, invoices, payments, waivers |
| Librarian | `librarian@campus.test` | Catalogue, issues, returns, fines |
| Thesis supervisor | `thesis_supervisor@campus.test` | Assigned theses, feedback, milestones |

There are also 30 demo accounts for each role, such as `student01@demo.campus.test` through `student30@demo.campus.test`. All use the configured demo password.

## Database configuration

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `.env` to connect to another PostgreSQL instance. `POSTGRES_ADMIN_USER` and `POSTGRES_ADMIN_PASSWORD` are only used by Docker to initialize its local database and create the restricted application role.

The PostgreSQL schema lives in `db/001_foundation.sql` through `db/006_resource_history.sql`. Apply new versioned schema changes with `npm run db:migrate`; seed local demo records with `npm run db:seed`. The seed command is designed for development and creates demo accounts and records.

This release switches the application to PostgreSQL. It does not copy records from an existing MySQL/MariaDB database. Keep a backup of the old database; the old database is not modified by this project. Existing records need a separate, reviewed data migration before using them here.

## Project map

- `web/` — React/TypeScript interface and responsive styles
- `server/` — Express API, authentication, role checks, and workflows
- `db/` — PostgreSQL schema, migration and seed scripts
- `docs/` — architecture, role permissions, seed inventory, and workflow notes
