# Smart University ERP · Campus Desk

Campus Desk বিশ্ববিদ্যালয়ের role-based ERP। Frontend React ও TypeScript, API Express, আর database MySQL। Student workspace-এ profile editing/photo, class ও exam routine, registration, attendance correction, academic progress/what-if GPA, fees, library reservation/renewal, document requests, support tickets, career applications, notices ও thesis workflows আছে।

## Windows-এ চালানো

1. **Node.js 24 LTS** ও **MySQL 8.0.16+** অথবা MySQL-compatible **MariaDB 10.11+** ইনস্টল করুন। Database Windows service চালু রাখুন।
2. Project folder-এ PowerShell খুলে dependency install করুন:

   ```powershell
   npm.cmd ci
   ```

3. `START-WINDOWS.cmd` চালান। প্রথমবার MySQL administrator-এর host, port, username ও password চাইবে। Launcher project-এর জন্য database ও আলাদা app user বানাবে, schema/seed বসাবে এবং server চালু করবে। Manual setup করলে `.env`-এর সঠিক MySQL username/password দিয়ে নিচের commands চালান।
4. Terminal-এ দেখানো URL (সাধারণত **http://localhost:4000**) খুলুন। Server বন্ধ করতে launcher window-তে **Ctrl+C** চাপুন।

MySQL/MariaDB Server ইনস্টল করা না থাকলে আগে সেটি ইনস্টল করুন; launcher database server নিজে install করে না। আগে PostgreSQL-এর জন্য `.env` থাকলে launcher সেটিকে `.env.previous` নামে রেখে MySQL config তৈরি করে। PostgreSQL database-এর records MySQL-এ নিজে থেকে copy হয় না।

## নিজে database config করে চালানো

MySQL-এ নতুন database ও application user তৈরি করুন (Workbench বা MySQL command line-এ চালান):

```sql
CREATE DATABASE smart_university CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'campus'@'localhost' IDENTIFIED BY 'local-campus-dev';
CREATE USER 'campus'@'127.0.0.1' IDENTIFIED BY 'local-campus-dev';
GRANT ALL PRIVILEGES ON smart_university.* TO 'campus'@'localhost';
GRANT ALL PRIVILEGES ON smart_university.* TO 'campus'@'127.0.0.1';
```

Project folder-এ `.env` না থাকলে `.env.example` কপি করে `.env` বানান; আগে থেকে থাকলে সেটির `DB_NAME`, `DB_USER`, `DB_PASSWORD` এবং `DB_PORT` MySQL অনুযায়ী বদলান। Local MySQL account-এর password ফাঁকা হলে `.env`-এ `DB_PASSWORD=` রাখুন; এটি ফাঁকাই থাকবে, sample password দিয়ে replace হবে না। Shared বা production system-এ sample password ব্যবহার করবেন না। PowerShell-এ এরপর চালান:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run db:setup
npm.cmd start
```

`npm.cmd start` নিজে production build তৈরি করে এবং `4000` port ব্যস্ত থাকলে কাছের খালি port-এ চালু হয়; terminal-এ দেখানো URL খুলুন। `.env`-এ `APP_ORIGIN` না থাকলে server চালু হওয়া URL-টি নিজে সেট করে, যাতে login request আটকে না যায়।

`db:setup` একবারে base schema/seed এবং semester portal-এর additive update চালায়। Base schema আগে থেকে setup করা database-এ নতুন semester portal update দিতে চালান:

```powershell
npm.cmd run db:semester:setup
```

Update-এর schema ও sample data আলাদা করেও চালানো যায়:

```powershell
npm.cmd run db:semester:schema
npm.cmd run db:semester:seed
```

এই update বিদ্যমান database বা records reset করে না। Student, teacher, finance, library, thesis, support এবং career records semester অনুযায়ী দেখাতে global semester selector ব্যবহার করুন। CGPA cumulative থাকে; নির্বাচিত semester-এ GPA, registration, result, attendance, routine, invoice ও payment history দেখা যায়। Student payment request verify না হওয়া পর্যন্ত paid হিসেবে গণ্য হয়। Vite development server ও API একসঙ্গে চালাতে `npm.cmd run dev` চালান; `.env`-এ `APP_ORIGIN=http://localhost:5173` দিন, তারপর **http://localhost:5173** খুলুন।

Rule-based academic estimates ও Academic Assistant default-এ চালু থাকে। বন্ধ করতে চাইলে `.env`-এ `ENABLE_PHASE4=false` দিন। Estimate কোনো official grade বা trained ML prediction নয়; তুলনাযোগ্য পুরোনো result অপর্যাপ্ত হলে estimate দেখায় না।

## SQL ফাইল

- `db/schema.sql` — base table, key, constraint ও view-এর schema file।
- `db/seed.sql` — demo account, academic records, routine, finance, library, notice ও thesis-এর base seed।
- `db/updates/2026-semester-portal-schema.sql` — semester workflow columns ও student payment verification table-এর repeat-safe additive schema।
- `db/seeds/2026-semester-portal.sql` — semester portal demo requests এবং pending fee payment-এর idempotent seed।

Workbench দিয়ে হাতে import করলে আগে `schema.sql`, `updates/2026-semester-portal-schema.sql`, পরে `seed.sql` ও `seeds/2026-semester-portal.sql` execute করুন। SQL seed file-এ procedure আছে, তাই Workbench-এর SQL script execution ব্যবহার করুন। Recommended উপায় হলো project directory থেকে `npm.cmd run db:setup`; এটি procedure delimiter ঠিকভাবে সামলায়।

## Demo account

সব demo account-এর default password **CampusDemo2026!**। `.env`-এ `DEMO_PASSWORD`-এর মান seed করার আগে বদলালে project command সেই password-কে scrypt hash করে seed করবে। SQL file-কে Workbench-এ সরাসরি চালালে static default password-টাই ব্যবহৃত হবে।

| Role | Email | Workspace |
|---|---|---|
| Admin | `admin@campus.test` | People, registration, exams, documents, support, career, routine and settings |
| Student | `student@campus.test` | Academic progress, registration, exams, attendance, finance, library, support and thesis |
| Teacher | `teacher@campus.test` | Teaching, assessments, attendance correction review and routine |
| Advisor | `advisor@campus.test` | Registration review, advisees and academic records |
| Accounts | `accounts_officer@campus.test` | Fees, invoices, payments and waivers |
| Librarian | `librarian@campus.test` | Catalogue, circulation, reservations, renewals and fines |
| Thesis supervisor | `thesis_supervisor@campus.test` | Assigned theses, feedback and milestones |

আরও ৩০টি demo account প্রতি role-এ আছে; যেমন `student01@demo.campus.test` থেকে `student30@demo.campus.test`। এদের password-ও একই।

## Project checks

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run db:verify-seed
```

`db:verify-seed` চালানোর আগে MySQL/MariaDB service, `.env` connection এবং schema/seed প্রস্তুত থাকতে হবে। Database ব্যবহার করা integration ও browser suite চালালে আলাদা `_test` database ব্যবহার করুন; ওই suite-গুলো database-এ fixture তৈরি বা পরিবর্তন করতে পারে।

## Configuration

`.env`-এ `DB_HOST`, `DB_PORT` (default `3306`), `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `PORT`, `APP_ORIGIN` এবং ঐচ্ছিক `DEMO_PASSWORD` সেট করা যায়। পুরোনো PostgreSQL database-এর records প্রয়োজন হলে সেটি আলাদা backup হিসেবে রাখুন; এই project database engine বদলালেও পুরোনো data automatic transfer করে না।

## Project structure

- `web/` — React/TypeScript interface ও responsive styles
- `server/` — Express API, authentication, role checks ও workflows
- `db/schema.sql`, `db/seed.sql` — consolidated MySQL schema ও seed
- `scripts/` — Windows launcher ও development tools
- `docs/` — architecture, permissions ও workflow notes
