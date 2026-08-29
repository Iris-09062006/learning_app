# TASK-088 — Route Course Outline and Lessons through 9Router Configuration

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Type:** AI provider configuration

## Objective

Remove the hard-coded pedagogical Gemini model and route Course outline plus Lesson generation
through the configured 9Router OpenAI-compatible endpoint and model identifier.

## Scope

- Use `AI_API_KEY`, `AI_PROVIDER_URL`, and `AI_PROVIDER_MODEL` for every 9Router outline/Lesson request.
- Allow 9Router to report the actual upstream model selected for each stage without rejecting router fallback.
- Verify Course outline requests use the 9Router authorization/header/model contract.
- Update provider documentation from direct Gemini to 9Router-managed upstream routing.
- Preserve schemas, call budgets, pacing, timeouts, citations, persistence, error mapping, and public APIs.
- No dependency, migration, live provider request, secret write, database mutation, push, or deployment.

## Allowed files

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `.env.example`
- `docs/architecture.md`
- `docs/ai-course-current-flow.md`
- `docs/deployment.md`
- `docs/security.md`
- `docs/tech_stack.md`
- `docs/testing.md`
- Task state and TASK-088 reports

## Acceptance criteria

- No pedagogical model name is hard-coded in provider or service production code.
- Missing `AI_PROVIDER_MODEL` fails as `AI_PROVIDER_NOT_CONFIGURED` before dispatch.
- All pedagogical requests use the configured 9Router route without app-level vendor model locking.
- Course outline requests use the configured route, Bearer authorization, and 9Router token-saver header.
- Existing provider response validation and downstream contracts remain unchanged.

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```
