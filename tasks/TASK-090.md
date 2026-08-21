# TASK-090 — Gemini 3.7 Provider Response Boundary

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Feature:** `005-per-lesson-generation`
- **Scope:** Targeted provider-boundary compatibility fix only

## Objective

Prove and minimally repair the HTTP-200 Gemini 3.7 stage-one synthesis response mismatch observed
for one-Lesson generation, without changing orchestration, timeouts, model-call budgets,
persistence, citations, regeneration, publication, Exercises, learner progress, or schema.

## Acceptance criteria

- A deterministic pre-fix fixture reproduces the observed response-boundary failure.
- The exact parser/validator rejection and error mapping are documented.
- Only a proven semantically equivalent Gemini 3.7 representation is normalized.
- Malformed ordering and invalid synthesis still fail closed.
- The model remains `gemini-3.7-flash`, `reasoning_effort` remains `low`, and temperature is absent.
- Three-call normal and max-five correction budgets remain unchanged with no sixth request.
- Focused provider, service, one-Lesson endpoint, persistence, regeneration, citation, and publication regressions pass.
- Lint, typecheck, build, and `git diff --check` pass.
- No paid provider request, push, deployment, database change, or remote mutation occurs unless separately authorized.

## Allowed files

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `tasks/TASK-090.md`
- `reports/TASK-090-implementation.md`
- `reports/TASK-090-test.md`
- `reports/TASK-090-review.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts
npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts
npm run test -- src/features/content-pipeline/repositories/content-pipeline-repository.test.ts
npm run lint
npm run typecheck
npm run build
git diff --check
```

## Out of scope

Provider retries, model fallback, prompt redesign beyond an explicit order hint, public error-system
redesign, orchestration, UI, client/provider timeouts, database, migrations, and all downstream
contracts named in the investigation request.
