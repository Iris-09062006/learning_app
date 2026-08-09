# TASK-028 — AI Mentor API and Explanation Service

## Status
`VERIFIED`

## Required Context
- `docs/requirements.md`
- `docs/features.md` (Module 11: AI Mentor — F-AI-01, F-AI-02)
- `docs/database.md` (§7.11 `ai_explanations`, §9.8 RLS)
- `docs/api_contract.md` (§15.1 Explain submission, §15.2 Get explanation history)

## Objectives
1. Create AI feature structure (`src/features/ai/`).
2. Define `AIProvider` interface and implement `MockAIProvider` (for testing) and `RestAIProvider` (for runtime usage, using native `fetch` to call an AI service without adding bulky SDKs).
3. Implement `ai-repository.ts` to handle `ai_explanations` table CRUD.
4. Implement `ai-service.ts` to orchestrate fetching explanations from the provider and saving them to the database.
5. Implement `POST /api/ai/explanations` route to request new explanations.
6. Implement `GET /api/submissions/[submissionId]/explanations` route to fetch history.
7. Update `ExerciseView` (or create a wrapper component) to integrate the "Ask AI" button and display explanations.
8. Write comprehensive unit tests for the service, repository, and API routes.

## File Scope
- `src/features/ai/types/index.ts`
- `src/features/ai/providers/ai-provider.ts`
- `src/features/ai/repositories/ai-repository.ts`
- `src/features/ai/services/ai-service.ts`
- `src/app/api/ai/explanations/route.ts`
- `src/app/api/submissions/[submissionId]/explanations/route.ts`
- `src/features/ai/components/ai-explanation-view.tsx`
- `src/features/exercises/components/exercise-view.tsx` (Update to include AI trigger)
- `src/features/ai/repositories/__tests__/ai-repository.test.ts`
- `src/features/ai/services/__tests__/ai-service.test.ts`
- `src/app/api/ai/explanations/__tests__/route.test.ts`
- `src/app/api/submissions/[submissionId]/explanations/__tests__/route.test.ts`

## Acceptance Criteria
- `POST /api/ai/explanations` accepts valid schema, fetches from provider, saves to DB, and returns `200` with the explanation.
- `GET /api/submissions/[submissionId]/explanations` returns the history of explanations for that submission, adhering to RLS (only owner can read).
- Unauthorized users or users trying to access others' submissions are blocked (`401` / `403`).
- AI provider failures are gracefully caught, logged as `failed` in DB, and return `502 AI_PROVIDER_ERROR`.
- The UI allows learners to request an explanation after submission and view it natively.
- Quality gates (`lint`, `typecheck`, `test`) pass without warnings.

## Result
- Implemented full AI Mentor feature: types, providers (`MockAIProvider`/`RestAIProvider`), repository, service, API routes, UI component.
- Provider uses only `AI_API_KEY` with OpenAI-compatible default (`AI_API_BASE_URL`, `AI_MODEL` overrides).
- Guarded secrets: AI API key stays server-only; API routes rely on `createClient` (ANON) + RLS; `exercise_solutions` never sent to client.
- Tests added for provider, repository, service, and both API routes (failures returned as `502` and logged as `failed`).
- Quality gates pass: `lint` ✓, `typecheck` ✓, `test` (235/235) ✓, `build` ✓, `git diff --check` clean.
- Review verdict: PASS — all findings resolved.
