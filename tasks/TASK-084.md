# TASK-084 — Repair Live Pedagogical Lesson Generation

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Type:** Content operations hotfix

## Objective

Diagnose and repair the reproducible `502 AI_PROVIDER_ERROR` returned by
`POST /api/admin/course-drafts/25/lessons/generate` while preserving the verified
pedagogical generation, citation, retry, and persistence contracts.

## Scope

- Inspect the persisted, retryable state of Course import job 25 without mutating it.
- Identify the failing provider stage and retain privacy-safe operational diagnostics.
- Make the smallest provider/service correction required by the live failure.
- Add regression coverage for the exact failure mode.
- Preserve the existing public API, database schema, three-pipeline bound, partial-success retry,
  exact pedagogical model contract, and three/five-call limit.

## Allowed files

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`
- `src/features/content-pipeline/repositories/content-pipeline-migration.test.ts`
- `src/features/content-pipeline/repositories/content-destination-migration.test.ts`
- `src/features/content-pipeline/repositories/content-target-migration.test.ts`
- `tasks/TASK-084.md`
- `reports/TASK-084-implementation.md`
- `reports/TASK-084-test.md`
- `reports/TASK-084-review.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Acceptance criteria

- The root cause of job 25's 502 is supported by a provider or persisted-state probe.
- The live failure mode has focused regression coverage.
- No provider response body, source text, credential, prompt, or secret is logged.
- Required focused tests, `lint`, `typecheck`, full `test`, and `build` pass.
- Migration contract tests remain portable across LF and CRLF worktrees.
- Diff review has no remaining Critical/High/Medium finding.
- No database mutation, migration, retry of job 25, push, or deployment occurs.

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```
