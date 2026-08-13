# TASK-068 — Topic-Based Multi-Source Course Creation: Phase 2

## Status
`VERIFIED`

## Owner / Reviewer
Codex / Codex

## Objective
Implement only Phase 2 (T032–T049) of
`specs/001-topic-course-research/tasks.md`: make Course outline and Lesson generation job-wide
and source-qualified while preserving the existing editor, Continue checkpoint, immutable
revisions, publication flow, and legacy PDF path.

## Scope
- Phase 2 tasks T032–T049 only.
- Additive source-qualified DTO/provider contracts, deterministic job-wide selection, outline and
  Lesson generation orchestration, Admin provenance display, focused tests, and two browser gates.
- Reuse the Phase 1 schema/RPC foundation without redesign.
- No Phase 3–5 URL ingestion, source-review, research, rollout, learner, Exercise, auth,
  enrollment, or progress changes.

## Acceptance Criteria
- [x] Colliding local chunk indexes map to distinct request-local provider refs and canonical IDs.
- [x] Job-wide context selection is deterministic, source-aware, and at most 80,000 characters.
- [x] Outline save/regeneration and Lesson generation/regeneration validate current job/approved
      outline membership and preserve immutable revision behavior.
- [x] Admin UI uses controlled source-qualified references for multi-source outlines and displays
      citation provenance; legacy single-source editing/display remains compatible.
- [x] Mocked two-source and unchanged legacy PDF browser gates pass.
- [x] Focused gates, lint, typecheck, full tests, and build pass; review verdict is PASS.
- [x] Verified in-scope commit is created; no push or deploy.

## Required Commands
- `npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `npm run test -- src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`
- `npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts`
- `npm run test -- src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`
- `npm run test:e2e -- tests/e2e/critical-flows.spec.ts --grep "multi-source"`
- `npm run test:e2e -- tests/e2e/critical-flows.spec.ts --grep "reviews an outline"`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
