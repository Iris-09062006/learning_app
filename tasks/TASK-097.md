# TASK-097 â€” Subject-Agnostic Lesson Exercises

- **Status:** `DONE` â€” `production-test-2` commit `6d08668f78b914d02fb6b1fed9edde8f7a855db2`
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `dce587004fdcde228020a9ab4146187e687b0ba7`

## Objective

Replace the programming-only Lesson Exercise contract with the smallest subject-agnostic,
type-discriminated contract. Exercise generation must choose modality from the published Lesson
title, summary, learning objectives, and content; coding modalities remain available only when code
is pedagogically relevant.

Targeted follow-up: make provider schema/prompt, parser/validator, and persistence express one
ownership contract. The provider owns `type`; request/application metadata owns `difficulty`.

## Scope

- Audit and update Exercise enums/types, generated draft validation, provider prompt/schema/parser,
  generation API/service/form, persistence RPCs, moderation rendering/editing, learner rendering,
  answer validation/evaluation, and documentation contracts.
- Support `multiple_choice`, `true_false`, `short_answer`, `ordering`, `matching`, `scenario`,
  `predict_output`, and `fix_the_bug` with precise type-specific payloads.
- Preserve persisted and newly generated `predict_output` and `fix_the_bug` Exercises.
- Add a backward-compatible migration file, generated TypeScript type updates, and migration tests;
  do not apply the migration to any database.
- Cover Agile Manifesto, professional ethics, Python loops, database theory, and an existing
  `fix_the_bug` regression without calling a real AI provider.

## Files allowed to change

- Exercise-related files under `src/features/ai`, `src/features/moderation`, `src/features/exercises`,
  and `src/features/lessons`
- Exercise generation/submission route files under `src/app/api`
- `src/generated/database.types.ts`
- `supabase/migrations/032_subject_agnostic_exercises.sql`
- Exercise-focused tests and E2E mock fixtures
- Relevant sections of `docs/api_contract.md`, `docs/database.md`, `docs/features.md`, and
  `docs/decisions.md`
- `tasks/TASK-097.md`, `reports/TASK-097-*.md`, `ACTIVE_TASK.md`, and `project/TASKS.md`

## Acceptance criteria

- The authoritative provider/parser contract is a strict discriminated union with no meaningless
  coding fields on non-code modalities.
- The provider selects type from Lesson title, summary, objectives, and content and explicitly
  prohibits decorative/fake code wrappers.
- Agile Manifesto and professional-ethics fixtures produce conceptual Exercises; database theory is
  conceptual unless SQL/code is itself taught; Python loops may use a coding Exercise.
- Moderation and learner UIs render/edit/submit type-specific controls without showing code blocks
  for non-code Exercises.
- Server-side evaluation supports all eight types and never exposes solutions to learners.
- Existing `fix_the_bug` and `predict_output` rows still render and evaluate correctly.
- Focused tests, full tests, lint, typecheck, build, and `git diff --check` pass.
- No live AI call, deploy, push, or commit. Migration application was separately authorized after
  local verification and completed through Supabase MCP.

## Migration deployment

`032_subject_agnostic_exercises.sql` adds the six generic values to the existing PostgreSQL
`exercise_type` enum and replace the Lesson-context, generated-content validation, review, publish,
and submission RPC implementations so each modality is validated and evaluated by type. Existing
enum values, rows, columns, option IDs, and `correctOptionId` solutions remain valid. It was applied
to project `yzucdzlgaucmduoghjft` as `20260828054832_subject_agnostic_exercises` and verified remotely.

## Explicit exclusions

No Course/Lesson generation, 9Router routing, TASK-090 checkpointing, TASK-091 semantic retries,
publication workflow state changes, authentication/RBAC, dependency, deploy, or live AI call. The
original no-push/no-commit exclusion was superseded by the user's 2026-08-28 request to release the
verified work to `production-test-2` through GitHub MCP.

