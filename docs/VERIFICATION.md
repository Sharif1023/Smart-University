# Verification

## Current workspace checks

- `npm.cmd run lint` — passed.
- `npm.cmd test` — passed (5 unit tests).
- `npm.cmd run build` — passed, including the TypeScript check.
- `node --check` on the changed server and setup scripts — passed.
- PostgreSQL migrations and database-backed suites — not run here; a local PostgreSQL service is not available in this environment.

Run the static checks from the project root:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

For database-backed verification, configure `.env` to a separate PostgreSQL database ending in `_test`, then run `npm.cmd run db:setup` and `npm.cmd run db:verify-seed`. Run `npm.cmd run test:integration`, `npm.cmd run test:operations`, `npm.cmd run test:blueprint`, and `npm.cmd run test:e2e` against that test database. The workflow suites write records; never point them at data you need to keep.

The Windows launcher provisions a local PostgreSQL database on first start. Verify that first-start flow on Windows before distributing a Windows package; the development shell is not a substitute for that platform check.
