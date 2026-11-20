# Architecture

One Express API and one PostgreSQL database serve all roles. React with TypeScript renders the client. Vite proxies `/api` during development. Express serves the compiled `dist` directory for a single-origin deployment. The backend uses native JavaScript modules, the `pg` driver, parameterized queries, and versioned SQL migrations. The database adapter converts the existing positional bind markers to PostgreSQL parameters and exposes transaction and result helpers used by the application.

## Request lifecycle

A successful sign-in creates a random 256-bit token and stores its SHA-256 digest in PostgreSQL. The browser receives an HttpOnly, SameSite=Strict cookie. Production cookies require HTTPS. Every protected request resolves the current active account and role. Changing the password revokes all sessions. The profile query takes the student identity from the resolved session. Scrypt hashes use individual salts, N=32768, r=8 and p=3.

The API includes a request ID on every response. Security headers come from Helmet. Sign-in attempts are rate limited, mutations check the configured origin, and private document downloads verify thesis ownership or supervision.

## API v1

Success responses contain `data`. Catalog lists include `meta.page`, `meta.pageSize`, and `meta.total`. Errors contain `error.code`, `error.message`, and `error.requestId`. Routes below are relative to `/api/v1`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Database readiness |
| POST | `/auth/login` | Submit email and password |
| GET | `/auth/me` | Session identity |
| POST | `/auth/logout` | Invalidate current session |
| POST | `/auth/password` | Verify current password and set a new one |
| GET | `/profile` | Own account and linked student profile |
| GET | `/overview` | Current semester and authorized dashboard data |
| GET | `/catalog/{collection}` | Search and page through a catalog |
| POST | `/catalog/{collection}` | Create an allowed catalog record |
| PUT | `/catalog/{collection}/{id}` | Update or archive a catalog record |

Catalog collections are departments, programs, academic years, semesters, and courses. Validation and identifiers are allowlisted on the server. Foreign keys enforce relationships. Each academic write and its audit entry commit together. Academic dates use calendar dates; the overview uses the `Asia/Dhaka` timezone.

## Campus services

`GET /operations` returns authorization-filtered tables, forms, and metrics for the current account. `POST /operations/action/{action}` validates the role, field choices, object ownership, and business rules inside a transaction. A shared database row serializes operational changes such as seat allocation and book issue. `POST /operations/ask` is disabled unless `ENABLE_PHASE4=true`. Thesis document routes check ownership or supervision before streaming a PDF attachment.

Student endpoints such as `/students/me`, `/students/me/attendance`, `/students/me/results`, `/students/me/fees`, and `/notifications/me` resolve identity from the authenticated session. Notice downloads enforce the intended audience and publication window. Workspace lists are paged and allow only server-defined sort columns.

## PostgreSQL setup

PostgreSQL is installed and run as a normal local Windows service. On its first run, the Windows launcher asks for an administrator connection, creates a uniquely named database and restricted application login, and saves only the app connection settings in `.env`. Subsequent runs reuse that database. The app uses the `DB_*` settings and UTC database sessions. The demo seed is intended for local development, not production.
