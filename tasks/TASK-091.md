# TASK-091 — Add Bounded Semantic Repair Retry for Primary Lesson Stages

- **Status:** `VERIFIED` (uncommitted by user request)
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `6e0c0d858efd8c2e96909fdff0ef41ee08cbedbf`

## Objective

Add one bounded repair retry when an HTTP-successful model response fails application validation
for `synthesis_blueprint`, `sections`, or `quality_review`, without restarting prior stages or
changing correction, re-review, persistence, checkpointing, routing, or provider/network retries.

## Scope

- Align static JSON Schema constraints with the authoritative parsers for the three primary stages.
- Retry the same primary stage at most once after `LessonValidationError`.
- Reuse the original request and exact stage schema, adding only safe validation feedback.
- Log stage, attempt, validation code, field path, and repair-retry metadata without AI content.
- Add deterministic provider/service/checkpoint regression coverage.

## Files allowed to change

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `tasks/TASK-091.md`
- `reports/TASK-091-*.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Acceptance criteria

- Each primary stage uses one call normally and no more than two semantic attempts.
- HTTP/provider/network failures do not enter the new retry path.
- A repaired stage does not rerun an already successful prior stage.
- Repair request uses the original schema/input, contains validation code and field path, requests
  complete corrected JSON, and excludes the raw invalid response.
- Valid `correctable` review continues through the unchanged correction/re-review flow.
- No invalid Lesson is persisted and TASK-090 checkpoint behavior remains unchanged.
- Focused provider/service/checkpoint tests, lint, typecheck, build, and `git diff --check` pass.

## Required context

- `AGENTS.md`, `CODEX.md`, `ACTIVE_TASK.md`
- `tasks/TASK-080.md` through `tasks/TASK-083.md`
- `tasks/TASK-090.md`
- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- Relevant provider/service/checkpoint tests

## Explicit exclusions

No Course Outline, correction/re-review, frontend, database, migration, routing, persistence,
publication, Exercise, learner-progress, queue, deployment, push, or real-provider changes.
