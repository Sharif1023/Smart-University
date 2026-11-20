# Smart University ERP · Campus Desk

Campus Desk হলো বিশ্ববিদ্যালয়ের role-based ERP। Frontend React ও TypeScript, API Express, আর database PostgreSQL। এতে academic records, course registration, attendance, finance, library circulation, class routine, notices, notifications ও thesis supervision আছে।

## Windows-এ চালানো

**Node.js 24 LTS** এবং **Docker Desktop** ইনস্টল করে Docker Desktop চালু রাখুন। Project extract করে **START-WINDOWS.cmd** চালান। `.env` না থাকলে launcher local default দিয়ে বানাবে, PostgreSQL চালু করবে, schema ও demo data বসাবে, তারপর **http://localhost:4000** খুলবে। App চালানোর সময় launcher window খোলা রাখুন। API বন্ধ করতে **Ctrl+C** চাপুন; PostgreSQL ও তার data Docker-এ থেকে যাবে।

Source checkout হলে প্রথমবার dependencies ইনস্টল করুন:

```powershell
npm ci
```

এরপর launcher চালালেই database ও app শুরু হবে। প্রথমবার Docker PostgreSQL image নামানোর জন্য এক মিনিট লাগতে পারে।

## Terminal থেকে চালানো

Project folder-এর PowerShell-এ চালান:

```powershell
if (!(Test-Path .env) -or (Get-Item .env).Length -eq 0) {
  Copy-Item .env.example .env -Force
}
npm ci
npm run db:up
npm run db:migrate
npm run db:seed
npm run build
npm start
```

এরপর **http://localhost:4000** খুলুন। নমুনা `.env` local PostgreSQL container-কে `5433` port-এ চালায়; API সীমিত permission-সহ `campus` database role ব্যবহার করে। Default credentials শুধু নিজের local machine-এ ব্যবহার করুন।

API বন্ধ করতে **Ctrl+C** চাপুন। PostgreSQL বন্ধ করে data রেখে দিতে:

```powershell
npm run db:down
```

Database মুছে ফেলতে না চাইলে `docker compose down -v` চালাবেন না।

## Development mode

প্রথমবার development mode চালালে আগে `npm run db:up`, `npm run db:migrate`, ও `npm run db:seed` চালান। এরপর `.env`-এর `APP_ORIGIN`-কে `http://localhost:5173` করে চালান:

```powershell
npm run dev
```

তারপর **http://localhost:5173** খুলুন। এই command API ও Vite একসঙ্গে চালায়। Production-style local server চালাতে `.env`-এ `APP_ORIGIN=http://localhost:4000` দিন, তারপর:

```powershell
npm run build
npm start
```

Project check:

```powershell
npm run lint
npm test
npm run build
```

Integration, operations, blueprint ও browser suite database ব্যবহার করে। `.env`-এ `_test` দিয়ে শেষ আলাদা PostgreSQL database দিন, migrate ও seed করুন, তারপর দরকারি `test:*` command চালান। এসব test database-এ record তৈরি বা পরিবর্তন করে—প্রয়োজনীয় data-সহ database-এ চালাবেন না।

## Demo account

সব demo account-এর default password **CampusDemo2026!**। Seed করার আগে `DEMO_PASSWORD` দিয়ে এটি বদলানো যায়।

| Role | Email | Workspace |
|---|---|---|
| Admin | `admin@campus.test` | People, registration, routine, notices, settings |
| Student | `student@campus.test` | Academic standing, registration, teaching, finance |
| Teacher | `teacher@campus.test` | Teaching, assessments, routine |
| Advisor | `advisor@campus.test` | Registration review, advisees, academic records |
| Accounts | `accounts_officer@campus.test` | Fees, invoices, payments, waivers |
| Librarian | `librarian@campus.test` | Catalogue, issues, returns, fines |
| Thesis supervisor | `thesis_supervisor@campus.test` | Assigned theses, feedback, milestones |

প্রতিটি role-এর আরও ৩০টি demo account আছে। যেমন `student01@demo.campus.test` থেকে `student30@demo.campus.test`; সবার password একই `DEMO_PASSWORD`।

## PostgreSQL configuration

অন্য PostgreSQL instance ব্যবহার করতে `.env`-এ `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` ও `DB_PASSWORD` দিন। `POSTGRES_ADMIN_USER` এবং `POSTGRES_ADMIN_PASSWORD` শুধু Docker-এর প্রথম initialization-এ local database তৈরি ও সীমিত application role বানাতে লাগে।

Schema আছে `db/001_foundation.sql` থেকে `db/006_resource_history.sql` পর্যন্ত। নতুন versioned schema change বসাতে `npm run db:migrate`, আর local demo record যোগ করতে `npm run db:seed` চালান। Seed command development-এর জন্য; এটি demo account ও record তৈরি করে।

এই সংস্করণে application PostgreSQL-এ চলে। আগের MySQL/MariaDB database-এর record স্বয়ংক্রিয়ভাবে কপি হয় না। পুরোনো database-এর backup রেখে দিন; এই project সেটি পরিবর্তন করে না। পুরোনো record ব্যবহার করতে হলে আলাদা, যাচাই করা data migration করতে হবে।

## Project structure

- `web/` — React/TypeScript interface ও responsive styles
- `server/` — Express API, authentication, role checks ও workflows
- `db/` — PostgreSQL schema, migration ও seed scripts
- `docs/` — architecture, role permissions, seed inventory ও workflow notes
