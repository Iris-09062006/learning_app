# TASK-091 Test Report

## Required gates

- `npx vitest run src/features/content-pipeline/providers/lesson-draft-provider.test.ts --reporter=dot`
  - PASS: 196 tests.
- `npx vitest run src/features/content-pipeline/services/content-pipeline-service.test.ts --reporter=dot`
  - PASS: 147 tests.
- `npx vitest run src/features/content-pipeline/repositories/content-pipeline-repository.test.ts src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts --reporter=dot`
  - PASS: 40 tests.
- `npm run lint`
  - PASS.
- `npm run typecheck`
  - PASS.
- `npm run build`
  - PASS; 32 static pages generated.
- `git diff --check`
  - PASS; only existing CRLF conversion warnings were printed.

## Additional full regression

- `npm test -- --run`
  - 1153 PASS, 1 SKIP, 1 FAIL.
  - The single failure is outside TASK-091 in
    `src/features/admin/repositories/__tests__/admin-rpc-migration.test.ts`: its legacy naming
    assertion accepts only `NNN_*.sql`, while the preserved uncommitted TASK-090 migration is named
    `031_lesson_generation_retry_checkpointing.sql`.
  - TASK-091 neither introduced nor modified that migration or assertion. The required checkpoint
    regression tests pass.

## Covered behavior

- Valid first responses use one call per primary stage.
- Invalid then valid responses use exactly two calls and preserve schema/original stage input.
- Invalid twice stops after two calls.
- HTTP 503 and timeout paths make one request and do not enter semantic retry.
- Repair prompts contain validation code, field path, complete-object guidance, and no raw invalid
  response marker.
- Valid `correctable` review remains a valid one-call review result.
- Normal Lesson service path remains three calls; correction path remains five calls.
- Re-review remains one call; invalid Lessons are not persisted; ready Lesson checkpoints remain
  skipped.
