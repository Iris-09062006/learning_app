# TASK-092 — Diagnose Lesson Exercise Generation Boundaries

- **Status:** `VERIFIED` (uncommitted by user request)
- **Starting HEAD:** `f0ca2f5f1747da75781cd1520c4d99e48c06cea5`
- **Owner / Reviewer:** Codex

## Objective

Instrument the active one-Lesson Exercise generation path so the next authorized real generation
identifies the exact provider-envelope, output-validation, or persistence boundary without exposing
prompt/response/Exercise/evidence/credential content and without changing generation behavior.

## Scope

- Trace the Lesson-scoped UI, API, service, provider, parser, validator, and persistence RPC.
- Add metadata-only diagnostics for provider HTTP success/failure and response-envelope failures.
- Replace generic internal Exercise validation failures with stable diagnostic codes and field paths.
- Add parse and persistence boundary events with safe Supabase/Postgres error metadata.
- Add deterministic provider, parser, and service tests; never call the real provider.
- Record implementation, test, and review evidence.

## Files allowed to change

- `src/features/ai/providers/ai-provider.ts`
- `src/features/ai/providers/__tests__/ai-provider.test.ts`
- `src/features/ai/validation/exercise-draft.ts`
- `src/features/ai/validation/exercise-draft.test.ts`
- `src/features/ai/services/ai-service.ts`
- `src/features/ai/services/__tests__/ai-exercise-generation-service.test.ts`
- `src/features/ai/repositories/ai-repository.ts`
- `src/features/ai/repositories/__tests__/ai-repository.test.ts`
- `tasks/TASK-092.md`
- `reports/TASK-092-*.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Acceptance criteria

- Successful provider HTTP responses log only status/content-type/model/count/type/length metadata.
- Provider transport/non-2xx failures log host, duration, timeout, status, and stable error code.
- Invalid JSON envelope, missing choices/message/content, and non-string content are distinguishable.
- The authoritative parser emits precise stable validation codes and field paths without weakening rules.
- Parse/persistence started/success/failure boundaries are visible; DB failures log only safe DB metadata.
- Existing valid output passes unchanged and existing invalid output remains rejected.
- Tests prove prompt, AI response content, evidence, and secrets are absent from diagnostics.
- Focused provider/parser/service tests, ESLint, typecheck, and `git diff --check` pass.

## Explicit exclusions

No prompt, JSON Schema, parser rule, alias normalization, fallback, retry, provider/router/model,
frontend, database schema, Lesson/Course generation, real AI call, commit, push, or deployment change.
