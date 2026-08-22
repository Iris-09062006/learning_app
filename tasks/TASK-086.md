# TASK-086 — Migrate Pedagogical Lessons to Gemini 3.7 Flash

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Type:** Content operations hotfix

## Objective

Replace the complete pedagogical Lesson generation model lock with the official GA
`gemini-3.7-flash` identifier requested by the user.

## Scope

- Update provider requests and service-side model verification to `gemini-3.7-flash`.
- Update all directly affected provider, service, and repository contract fixtures.
- Preserve the Google OpenAI-compatible endpoint, structured schemas, exact 3/5-call budgets,
  pacing, timeouts, citation ownership, persistence, retry mapping, and API response shape.
- No migration, provider fallback, live generation probe, push, or deployment.

## Allowed files

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`
- Task state and TASK-086 reports

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/repositories/content-pipeline-repository.test.ts
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```
