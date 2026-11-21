# Verification

Run the frontend and source checks from the project root:

```powershell
npm.cmd run lint
npm.cmd run build
```

The database uses MySQL 8.0.16 or newer. Start the MySQL service, configure `.env`, and run `npm.cmd run db:setup` to apply the consolidated schema and seed. `npm.cmd run db:verify-seed` reports table counts and confirms all seven roles have 30 demo accounts plus the seven main role accounts.

Run database-backed integration, operations, blueprint and browser suites only against a separate MySQL database ending in `_test`. Apply `db:setup` to it first. These suites write records; do not point them at data you need to keep.

The Windows launcher provisions the local database and app user on first start. Test that setup on Windows with a running MySQL service before distributing a Windows package.
