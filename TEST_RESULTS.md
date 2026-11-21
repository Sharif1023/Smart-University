# Test results

Date: 2026-11-21

## Completed checks

| Check | Result |
|---|---|
| `npm.cmd run lint` | Passed. ESLint checked `server`, `web`, `db`, `scripts` and `tests`. |
| `npm.cmd run build` | Passed. TypeScript check and Vite production build completed. |
| `npm.cmd test` | Passed: 9/9 unit tests, including SQL comment/delimiter parsing and validation checks. |
| `npm.cmd run db:setup` | Passed twice against MariaDB 10.11.19. It applied the consolidated schema and seed, and rerunning did not duplicate the seed fixtures. |
| `npm.cmd run db:verify-seed` | Passed. Verified 222 users, 30 demo users per role, 7 core accounts and portal fixture records. |
| Core demo login | Passed for Admin, Student, Teacher, Advisor, Accounts Officer, Librarian and Thesis Supervisor. Each login, authenticated session lookup and logout returned HTTP 200. |
| `npm.cmd start` | Passed. It built the application and started the API; port 4000 was already occupied, so it selected port 4001. Login requests with the active origin were accepted. |

## Not run

- `npm.cmd run test:blueprint`, `npm.cmd run test:operations`, `npm.cmd run test:integration` and `npm.cmd run test:e2e` were not run. Those suites require a separate database whose name ends in `_test`; the configured database `smart_university` contains development seed data and must not be used for test fixtures.
- The new profile, exam, attendance, grade-review, document, support, library, preference and career workflows were not each exercised through full end-to-end scenarios. Their source-level checks and test scenarios are present.
- Browser-based visual review was not performed in this run.

## Environment notes

- The configured local server is MariaDB 10.11.19 on port 3306. The application uses the MySQL wire protocol through `mysql2/promise`.
- Database setup previously failed because an empty `DB_PASSWORD=` was replaced by the sample password, and because the SQL loader split on semicolons inside comments. Both issues are fixed and covered by the unit tests or live setup run.
- The local database is `smart_university`. No schema or application tables were dropped; setup and seed were additive.
