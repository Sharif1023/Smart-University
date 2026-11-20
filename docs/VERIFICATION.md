# Verification

Run the static checks from the project root:

```powershell
npm run lint
npm test
npm run build
```

For database-backed verification, configure `.env` to a separate PostgreSQL database ending in `_test`, then run migrations, seed, and `npm run db:verify-seed`. Run `npm run test:integration`, `npm run test:operations`, `npm run test:blueprint`, and `npm run test:e2e` against that test database. The workflow suites write records; never point them at data you need to keep.

The Windows launcher uses Docker Desktop and the same PostgreSQL settings. Verify its first start on Windows before distributing a Windows package; the development shell is not a substitute for that platform check.
