# TASK-097 Implementation Report

## Outcome

Status: `VERIFIED` for the targeted contract follow-up and authorized for release to
`production-test-2` through GitHub MCP.

Release outcome: `DONE` in source commit `6d08668f78b914d02fb6b1fed9edde8f7a855db2`.

The targeted follow-up confirms that AI owns generated `type`, while application request metadata
owns `difficulty`. The provider request no longer exposes an external `exerciseType`; every strict
schema branch requires its singleton `type` enum and forbids extra fields; and the prompt explicitly
forbids returning `difficulty`, aliases, or additional root fields. Parser/validator and persistence
logic already enforced the intended ownership and were not changed.

Lesson Exercise generation is now subject-agnostic. The provider chooses one of eight precise
modalities from the published Lesson title, summary, learning objectives, and content. Non-code
modalities do not carry decorative code fields, while `predict_output` and `fix_the_bug` remain
supported end to end.

## Implemented

- Added a strict eight-branch generated-content contract and authoritative parser validation.
- Removed the moderator's forced type choice and made provider selection lesson-driven.
- Added type-specific moderation editors/previews and learner controls.
- Added type-specific server submission validation and evaluation without exposing solutions.
- Authored backward-compatible migration `032_subject_agnostic_exercises.sql`; it was subsequently
  applied through Supabase MCP after explicit user authorization.
- Updated generated database types and the API/database/feature/decision documentation.
- Preserved overlapping, unrelated TASK-096 working-tree changes.

## Files changed

- Exercise generation route, form, provider, service, types, validator, and tests under `src/app/api/ai/exercises` and `src/features/ai`.
- Moderation components, repository compatibility mapping, and tests under `src/features/moderation`.
- Learner Exercise DTO/repository/service/view, Lesson type labels, and tests under `src/features/exercises` and `src/features/lessons`.
- `src/generated/database.types.ts` and `supabase/migrations/032_subject_agnostic_exercises.sql`.
- `docs/api_contract.md`, `docs/database.md`, `docs/features.md`, and `docs/decisions.md`.
- TASK-097 task state and reports.

## External actions

No real AI call, deploy, push, or commit was performed. Supabase MCP applied migration
`20260828054832_subject_agnostic_exercises` to project `yzucdzlgaucmduoghjft` after separate explicit
authorization.

## Targeted verification note

Before the current release, the provider/schema follow-up passed 52/52 focused tests, the full
Vitest suite (1,211 passed, 1 skipped), lint, typecheck, production build, `git diff --check`, and
secret review. No live AI request or application deployment was performed.
