# TASK-089 — Feature 005 Per-Lesson Generation Phase C

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Feature:** `005-per-lesson-generation`
- **Scope:** Frontend sequential orchestration only

## Objective

Replace the Admin Continue generate-all request with explicit, server-truth-driven, sequential one-Lesson requests while preserving the Phase B backend, legacy Course scheduler, Feature 004 UI, and all downstream contracts.

## Acceptance criteria

- Continue refreshes `GET /api/admin/course-drafts`, sorts missing Lessons by `lessonOrder`, and POSTs one Lesson at a time.
- Every successful POST is followed by a refresh and confirmation that the requested `contentDraft` exists.
- One-Lesson POSTs alone use a 300,000ms client timeout; other requests retain existing timeout behavior.
- Failure stops later POSTs; retry refreshes first and skips completed Lessons.
- Reload never auto-starts generation; server drafts recover visible progress.
- A synchronous ref guard plus disabled controls prevent duplicate client orchestration.
- Progress exposes completed/total and current Lesson through an accessible live status without redesign.
- The final persisted Lesson exposes the existing `content_review` UI; an already-complete Course sends zero generation POSTs.
- No provider, model, backend scheduler, database, migration, publication, Exercise, or progress change.

## Required commands

```powershell
npm run test -- src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts
npm run test -- src/features/content-pipeline/repositories/content-pipeline-repository.test.ts
npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts
npm run test:e2e -- tests/e2e/per-lesson-generation.spec.ts
npm run test:e2e -- tests/e2e/critical-flows.spec.ts
npm run lint
npm run typecheck
npm run build
git diff --check
```

## Out of scope

Phase D, backend route retirement, provider/prompt/call-budget changes, scheduler changes, database locking, migrations, a background worker, polling, automatic reload resume, push, and deployment.
