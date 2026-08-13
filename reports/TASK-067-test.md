# TASK-067 Test Report

## Phase 1 focused gate

- Migration/repository/Admin-route gate — PASS: 4 files, 30 tests.
- Final focused migration/repository rerun after review fixes — PASS: 2 files, 26 tests.
- Legacy PDF browser gate — PASS: 1 Chromium scenario; outline review, Continue, Lesson content
  review, and atomic publication completed.

## PostgreSQL integration evidence

Using a disposable isolated Supabase PostgreSQL 17.6 container:

- All migrations `001` through `030` applied cleanly from an empty database — PASS.
- Legacy insert produced exactly one job and one order-zero bridge — PASS.
- Explicit staged sources produced zero jobs/bridges — PASS.
- Two truly concurrent calls for the same ordered usable set returned the same job; database
  assertions found one job and two ordered bridge rows — PASS.
- Failed and zero-chunk promotion, overlapping/cross-job ownership, cross-owner attachment,
  cross-job outline chunks/citations, last-source detach, and post-Continue attachment were
  rejected — PASS.
- Anchor reassignment, stale-outline transition, immutable replacement revision, canonical
  citations, and unchanged Continue behavior — PASS.
- Simulated incomplete publication rolled back Course/Chapter/Lesson/publication/source changes;
  completed two-source publication archived both sources and retry returned the same publication
  — PASS.
- Complete legacy single-PDF database wrapper flow through publication — PASS.

The disposable container and all test-only rows were removed after validation.

## Repository quality gates

- `npm run lint` — PASS, zero warnings.
- `npm run typecheck` — PASS.
- `npm run test` — PASS, repository-wide suite.
- `npm run build` — PASS, Next.js 15.5.22 production build.
- `git diff --check` — PASS; only expected Windows line-ending notices were printed.
