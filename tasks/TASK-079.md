# TASK-079 — Recover Failed Lesson Content Generation

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Keep the Admin Course-import UI recoverable when Lesson-content generation fails or stops
responding, without changing the persisted Course-import state machine, generation evidence,
publication behavior, or any unrelated feature.

## Scope
- Bound the browser wait for the Lesson-content generation request.
- Refresh the persisted Course-import state after generation errors so the existing retry action
  targets the server's actual failed step.
- Add an explicit local “start new workflow” reset that preserves all persisted jobs and sources.
- Add focused component regression coverage for failure, retry, timeout cleanup, and local reset.
- Do not change Supabase schema/RPCs, provider prompts, generation concurrency, API contracts,
  publication, learner, Exercise, or web-ingestion behavior.

## Acceptance Criteria
- [x] A failed Lesson-content request releases the busy UI and refreshes the job to `failed`.
- [x] The failed job exposes a working retry that calls the same Lesson-generation endpoint.
- [x] A non-settling browser request is aborted within the bounded UI timeout and remains recoverable.
- [x] Admin can clear the local source/research checkpoint and start a new workflow without deleting
      or mutating an existing Course-import job.
- [x] Focused tests and repository `lint`, `typecheck`, `test`, and `build` gates pass.
- [x] Review finds no Critical/High/Medium regression and a bounded Conventional Commit is created.

## Required Commands
- `npm test -- --run src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
