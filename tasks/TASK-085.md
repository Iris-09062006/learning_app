# TASK-085 — Handle Gemini Lesson Generation Quota

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Type:** Content operations hotfix

## Objective

Repair the confirmed upstream HTTP 429 failure behind local Course Lesson generation by preventing
parallel pedagogical request bursts and preserving the stable recoverable rate-limit API contract.

## Scope

- Serialize pedagogical HTTP requests made by one Course generation provider instance and pace
  request starts at a quota-safe interval.
- Preserve three Course pipeline workers while preventing their provider calls from overlapping.
- Retain upstream HTTP status in a secret-safe error type.
- Map upstream Lesson-provider 429 to `RATE_LIMITED`/HTTP 429 with a retry hint.
- Preserve model lock, exact stage call budget, no hidden retries, persistence, citations, and API shape.
- No migration, job retry/persistence, push, or deployment.

## Allowed files

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- Task state and TASK-085 reports

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts src/app/api/admin/__tests__/pdf-to-course-routes.test.ts
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```
