# TASK-090 Test Report

## Focused deterministic tests

Command:

`npm test -- src/features/content-pipeline/repositories/content-pipeline-repository.test.ts src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts --silent`

Result: **PASS** — 3 files, 184 tests.

Coverage includes:

- Lesson 1 persists before Lesson 2 generation begins.
- Lesson 2 persists before Lesson 3 generation begins.
- Lesson 3 provider failure preserves the Lesson 1/2 checkpoint sequence and fails the job.
- Retry makes zero provider calls for Lessons 1/2 and begins at Lesson 3.
- Missing Lessons 3–6 continue in approved-outline order.
- All-complete failed retry makes zero provider calls and invokes server reconciliation.
- Persistence failure prevents the next Lesson from starting.
- Repository selects the approved revision and latest ready draft rather than a different current
  outline or a newer failed draft.
- Failure and preparation migrations do not delete/update ready Lesson draft checkpoints.
- Admin authorization and RPC grants remain constrained.

## Quality gates

- `npm run lint` — **PASS**
- `npm run typecheck` — **PASS**
- `git diff --check` — **PASS** (only existing Windows LF/CRLF warnings)

No real provider calls were made. Build was not requested and was not run.
