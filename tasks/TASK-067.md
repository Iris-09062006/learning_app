# TASK-067 — Topic-Based Multi-Source Course Creation: Phase 1

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Implement only Phase 1 of `specs/001-topic-course-research/tasks.md`: additive database
compatibility and job-wide repository reads for one-to-eight Course-import sources while keeping
the production PDF/document-only flow unchanged.

## Scope
- Phase 1 tasks T001–T031 only.
- Additive migration, generated types, repository/DTO/route compatibility, focused tests, and the
  legacy PDF browser gate.
- No Phase 2–5 provider, research, ingestion UI, learner, Exercise, auth, enrollment, or progress
  product changes.

## Acceptance Criteria
- [x] Staged materialization creates no job or bridge.
- [x] Ordered usable-source initialization is atomic and concurrency-idempotent.
- [x] Failed/zero-chunk, foreign, unattached, and cross-job evidence is rejected.
- [x] Anchor, revision, Continue-lock, and publication invariants hold.
- [x] Phase 1 focused tests, legacy PDF E2E, lint, and typecheck pass.
- [x] Review PASS and in-scope commit created; no push/deploy.

## Required Commands
- `npm run test -- src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`
- `npm run test -- src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`
- `npm run test -- src/app/api/admin/__tests__/course-drafts-route.test.ts src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`
- `npm run test:e2e -- tests/e2e/critical-flows.spec.ts --grep "reviews an outline"`
- `npm run lint`
- `npm run typecheck`
- `git diff --check`
