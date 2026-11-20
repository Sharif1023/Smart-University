# Verification

## Current workspace checks

- `npm run lint` — passed.
- `npm test` — passed (5 unit tests).
- `npm run build` — passed, including the TypeScript check.
- PostgreSQL migrations and database-backed suites — not run here; Docker Desktop and `psql` are not available in this environment.

Run the static checks from the project root:

```powershell
npm run lint
npm test
npm run build
```

For database-backed verification, configure `.env` to a separate PostgreSQL database ending in `_test`, then run migrations, seed, and `npm run db:verify-seed`. Run `npm run test:integration`, `npm run test:operations`, `npm run test:blueprint`, and `npm run test:e2e` against that test database. The workflow suites write records; never point them at data you need to keep.

The Windows launcher uses Docker Desktop and the same PostgreSQL settings. Verify its first start on Windows before distributing a Windows package; the development shell is not a substitute for that platform check.
