# TASK-030 — AI Exercise Generation

## Status
`VERIFIED`

## Required Context
- `docs/requirements.md`
- `docs/features.md` (Module 13: AI Exercise Generation — F-AIGEN-01)
- `docs/database.md` (§7.11 `generated_exercises`, `exercise_reviews`)
- `docs/api_contract.md`
- `docs/security.md`

## Objectives
1. Implement F-AIGEN-01 to generate new exercises using the AI Provider.
2. Build an internal generation service/API that accepts lesson context, type, difficulty, and objective.
3. Validate AI provider response against a strict schema (MVP exercise types only).
4. Save the generated draft to `generated_exercises` in a `pending` state (never auto-publish).
5. Cover prompt building, response validation, and secure execution with tests.

## File Scope
- `src/features/ai/types/index.ts`
- `src/features/ai/repositories/ai-repository.ts`
- `src/features/ai/services/ai-service.ts`
- `src/features/ai/providers/ai-provider.ts`
- `src/features/moderation/` (initial setup)
- `src/app/api/`
- `src/features/ai/**/__tests__/`
- `src/app/api/**/__tests__/`
- `tasks/TASK-030.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`
- `project/ROADMAP.md`
- `reports/TASK-030-implementation.md`
- `reports/TASK-030-review.md`

## Acceptance Criteria
- AI exercise generation is successfully integrated using the existing AI provider.
- Structured output (JSON) is strictly validated against the supported exercise types.
- Generated content includes code snippet, options, and correct solution.
- The result is safely stored in `generated_exercises` with `status = pending`.
- The system prevents auto-publishing; it requires moderation review.
- Tests cover schema validation, prompt building, provider failure, and database persistence.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass without errors or warnings.

## Non-Goals
- Full moderation UI (handled in a separate task).
- Supporting unsupported exercise types like drag-and-drop in generation.
- Real-time streaming generation.