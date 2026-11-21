# Smart University ERP · Campus Desk

Campus Desk বিশ্ববিদ্যালয়ের role-based ERP। Frontend React ও TypeScript, API Express, আর database MySQL। এতে course registration, attendance, finance, library, routine, notices, notifications ও thesis workflow আছে।

## Windows-এ চালানো

1. **Node.js 24 LTS** ও **MySQL Server 8.0.16 বা নতুন সংস্করণ** ইনস্টল করুন। MySQL Windows service চালু রাখুন।
2. Project folder-এ PowerShell খুলে dependency install করুন:

   ```powershell
   npm.cmd ci
   ```

3. `START-WINDOWS.cmd` চালান। প্রথমবার MySQL administrator-এর host, port, username ও password চাইবে। Launcher project-এর জন্য database ও আলাদা app user বানাবে, schema/seed বসাবে এবং server চালু করবে।
4. Browser-এ **http://localhost:4000** খুলুন। Server বন্ধ করতে launcher window-তে **Ctrl+C** চাপুন।

MySQL Server ইনস্টল করা না থাকলে আগে সেটি ইনস্টল করুন; launcher MySQL নিজে install করে না। আগে PostgreSQL-এর জন্য `.env` থাকলে launcher সেটিকে `.env.previous` নামে রেখে MySQL config তৈরি করে। PostgreSQL database-এর records MySQL-এ নিজে থেকে copy হয় না।

## নিজে database config করে চালানো

MySQL-এ নতুন database ও application user তৈরি করুন (Workbench বা MySQL command line-এ চালান):

```sql
CREATE DATABASE smart_university CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'campus'@'localhost' IDENTIFIED BY 'local-campus-dev';
CREATE USER 'campus'@'127.0.0.1' IDENTIFIED BY 'local-campus-dev';
GRANT ALL PRIVILEGES ON smart_university.* TO 'campus'@'localhost';
GRANT ALL PRIVILEGES ON smart_university.* TO 'campus'@'127.0.0.1';
```

Project folder-এ `.env` না থাকলে `.env.example` কপি করে `.env` বানান; আগে থেকে থাকলে সেটির `DB_NAME`, `DB_USER`, `DB_PASSWORD` এবং `DB_PORT` MySQL অনুযায়ী বদলান। Shared বা production system-এ sample password ব্যবহার করবেন না। PowerShell-এ এরপর চালান:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run db:setup
npm.cmd run build
npm.cmd start
```

`db:setup` একবারে `db/schema.sql` ও `db/seed.sql` চালায়। আলাদা করে schema বসাতে `npm.cmd run db:migrate`, শুধু demo data বসাতে `npm.cmd run db:seed` ব্যবহার করুন। Vite development server ও API একসঙ্গে চালাতে `npm.cmd run dev` চালান; `.env`-এ `APP_ORIGIN=http://localhost:5173` দিন, তারপর **http://localhost:5173** খুলুন।

## SQL ফাইল

- `db/schema.sql` — সব table, key, constraint ও view-এর একক schema file।
- `db/seed.sql` — permission matrix, demo account, academic records, routine, finance, library, notice ও thesis data-সহ একক seed file। এটি আবার চালালেও fixture duplicate করে না।

Workbench দিয়ে হাতে import করলে আগে `schema.sql`, পরে `seed.sql` execute করুন। `seed.sql`-এ procedure আছে, তাই Workbench-এর SQL script execution ব্যবহার করুন। Recommended উপায় হলো project directory থেকে `npm.cmd run db:setup`; এটি procedure delimiter ঠিকভাবে সামলায়।

## Demo account

সব demo account-এর default password **CampusDemo2026!**। `.env`-এ `DEMO_PASSWORD`-এর মান seed করার আগে বদলালে project command সেই password-কে scrypt hash করে seed করবে। SQL file-কে Workbench-এ সরাসরি চালালে static default password-টাই ব্যবহৃত হবে।

| Role | Email | Workspace |
|---|---|---|
| Admin | `admin@campus.test` | People, registration, routine, notices, settings |
| Student | `student@campus.test` | Academic standing, registration, teaching, finance |
| Teacher | `teacher@campus.test` | Teaching, assessments, routine |
| Advisor | `advisor@campus.test` | Registration review, advisees, academic records |
| Accounts | `accounts_officer@campus.test` | Fees, invoices, payments, waivers |
| Librarian | `librarian@campus.test` | Catalogue, issues, returns, fines |
| Thesis supervisor | `thesis_supervisor@campus.test` | Assigned theses, feedback, milestones |

আরও ৩০টি demo account প্রতি role-এ আছে; যেমন `student01@demo.campus.test` থেকে `student30@demo.campus.test`। এদের password-ও একই।

## Project checks

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run db:verify-seed
```

`db:verify-seed` চালানোর আগে MySQL service, `.env` connection এবং schema/seed প্রস্তুত থাকতে হবে। Database ব্যবহার করা integration ও browser suite চালালে আলাদা `_test` database ব্যবহার করুন; ওই suite-গুলো data তৈরি বা বদলায়।

## Configuration

`.env`-এ `DB_HOST`, `DB_PORT` (default `3306`), `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `PORT`, `APP_ORIGIN` এবং ঐচ্ছিক `DEMO_PASSWORD` সেট করা যায়। পুরোনো PostgreSQL database-এর records প্রয়োজন হলে সেটি আলাদা backup হিসেবে রাখুন; এই project database engine বদলালেও পুরোনো data automatic transfer করে না।

## Project structure

- `web/` — React/TypeScript interface ও responsive styles
- `server/` — Express API, authentication, role checks ও workflows
- `db/schema.sql`, `db/seed.sql` — consolidated MySQL schema ও seed
- `scripts/` — Windows launcher ও development tools
- `docs/` — architecture, permissions ও workflow notes
