# Smart University ERP · Campus Desk

Campus Desk হলো বিশ্ববিদ্যালয়ের role-based ERP। Frontend React ও TypeScript, API Express, আর database PostgreSQL। এতে academic records, course registration, attendance, finance, library circulation, class routine, notices, notifications ও thesis supervision আছে।

## Windows-এ এক ক্লিকে চালানো

**Node.js 24 LTS** এবং **PostgreSQL** ইনস্টল করুন। Windows Services থেকে PostgreSQL service চালু আছে নিশ্চিত করুন। Windows launcher-এর আগে `.env.example` কপি করে `.env` বানাবেন না; launcher নিজেই connection config তৈরি করবে। Source checkout হলে project folder-এ একবার `npm ci` চালান। এরপর **START-WINDOWS.cmd** চালান।

প্রথমবার launcher PostgreSQL administrator-এর host, port, username ও password চাইবে। এটি project-এর জন্য আলাদা database ও application user বানিয়ে `.env`-এ সংযোগের তথ্য রাখবে; administrator password `.env`-এ রাখে না। এরপর schema ও demo data বসিয়ে app চালু করবে। পরেরবার administrator তথ্য চাইবে না। App খুলবে **http://localhost:4000**-এ। চলার সময় launcher window খোলা রাখুন; API বন্ধ করতে **Ctrl+C** চাপুন। PostgreSQL service ও database চালু থাকবে।

আগের database config `.env`-এ থাকলে launcher সেটি `.env.previous` নামে রেখে নতুন local PostgreSQL connection config বানায়। পুরোনো database-এর data আলাদা থাকে; স্বয়ংক্রিয়ভাবে কপি হয় না।

## Terminal থেকে চালানো

PostgreSQL administrator হিসেবে SQL Shell বা `psql` খুলে project-এর user ও database তৈরি করুন:

```sql
CREATE ROLE campus WITH LOGIN PASSWORD 'local-campus-dev';
CREATE DATABASE smart_university OWNER campus;
```

Shared বা production machine-এ নিজের শক্তিশালী password দিন এবং একই password `.env`-এর `DB_PASSWORD`-এ রাখুন। এরপর project folder-এর PowerShell-এ চালান:

```powershell
if (!(Test-Path .env) -or (Get-Item .env).Length -eq 0) {
  Copy-Item .env.example .env -Force
}
npm ci
npm run db:migrate
npm run db:seed
npm run build
npm start
```

আগের `.env` থাকলে এর `DB_*` মানগুলো নতুন PostgreSQL user/database-এর সাথে মিলিয়ে দিন। One-click launcher পুরোনো পরিচিত database config পেলে সেটি `.env.previous`-এ রেখে নতুন config তৈরি করে।

তারপর **http://localhost:4000** খুলুন। নমুনা `.env` `127.0.0.1:5432`-এর PostgreSQL-এ সংযোগ করে। API `campus` role ব্যবহার করে।

API বন্ধ করতে **Ctrl+C** চাপুন। পুরো PostgreSQL service বন্ধ করতে Windows Services থেকে PostgreSQL service stop করুন; database files অক্ষত থাকবে।

## Development mode

প্রথমবার development mode চালালে PostgreSQL service চালু রেখে `npm run db:migrate` ও `npm run db:seed` চালান। `.env`-এ `APP_ORIGIN=http://localhost:5173` করে চালান:

```powershell
npm run dev
```

তারপর **http://localhost:5173** খুলুন। এই command API ও Vite একসঙ্গে চালায়। Production-style local server চালাতে `.env`-এ `APP_ORIGIN=http://localhost:4000` দিয়ে `npm run build` ও `npm start` চালান।

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

অন্য PostgreSQL instance ব্যবহার করতে `.env`-এ `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` ও `DB_PASSWORD` দিন। Windows launcher-এর প্রথম setup-এ PostgreSQL administrator-এর connection details শুধু terminal-এ চাওয়া হয়।

Schema আছে `db/001_foundation.sql` থেকে `db/006_resource_history.sql` পর্যন্ত। নতুন versioned schema change বসাতে `npm run db:migrate`, আর local demo record যোগ করতে `npm run db:seed` চালান। Seed command development-এর জন্য; এটি demo account ও record তৈরি করে।

এই সংস্করণে application PostgreSQL-এ চলে। আগের MySQL/MariaDB database-এর record স্বয়ংক্রিয়ভাবে কপি হয় না। পুরোনো database-এর backup রেখে দিন; এই project সেটি পরিবর্তন করে না। পুরোনো record ব্যবহার করতে হলে আলাদা, যাচাই করা data migration করতে হবে।

## Project structure

- `web/` — React/TypeScript interface ও responsive styles
- `server/` — Express API, authentication, role checks ও workflows
- `db/` — PostgreSQL schema, migration ও seed scripts
- `docs/` — architecture, role permissions, seed inventory ও workflow notes
