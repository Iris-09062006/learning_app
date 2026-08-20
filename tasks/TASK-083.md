# TASK-083 — Pedagogical Lesson Generation Phase D

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Feature:** `003-pedagogical-lesson-generation`
- **Scope:** T026–T036 only

## Objective

Replace only the active Course-import Lesson one-shot step with the verified pedagogical runner, cap Course Lesson pipelines at three with a 240-second scheduling deadline, preserve partial success/retry and immutable regeneration semantics, and verify all existing external contracts without migrations.

## Required context

- `specs/003-pedagogical-lesson-generation/spec.md`
- `specs/003-pedagogical-lesson-generation/plan.md`
- `specs/003-pedagogical-lesson-generation/research.md`
- `specs/003-pedagogical-lesson-generation/data-model.md`
- `specs/003-pedagogical-lesson-generation/quickstart.md`
- `specs/003-pedagogical-lesson-generation/tasks.md`
- Verified Phase A–C code and TASK-080/TASK-081/TASK-082 reports

## Allowed files

- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `src/app/api/admin/course-drafts/[id]/lessons/[lessonId]/regenerate/route.ts`
- `src/app/api/admin/__tests__/pdf-to-course-routes.test.ts` (preserve existing user changes)
- `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx` when required for regression evidence
- `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts` when required for compatibility evidence
- `tests/e2e/critical-flows.spec.ts` when required for compatible pedagogical fixtures
- `specs/003-pedagogical-lesson-generation/tasks.md`
- Task state and `TASK-083` reports

## Acceptance criteria

- T026–T036 and the Phase D gate pass.
- Continue and target-Lesson regeneration use only the pedagogical 3/5-call runner; the legacy one-shot method has zero calls in the Course path.
- Maximum three Lesson pipelines run concurrently and stages within one Lesson remain sequential.
- The 240-second scheduling deadline/failure stops queued work, lets in-flight stages settle, records one recoverable failure, and preserves completed revisions.
- Retry generates only missing Lessons; rejected candidates are never persisted.
- Existing `StructuredLessonDraft`, canonical citations, RPC, immutable revisions, Admin, publication, learner, PDF/file, feature 002, Exercise, and progress behavior remain compatible.
- Regeneration route duration is 300 seconds without a public API change.
- No migration, live Gemini call, push, or deployment.

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx src/features/content-pipeline/repositories/content-pipeline-repository.test.ts
npm run test:e2e -- tests/e2e/critical-flows.spec.ts
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

## Out of scope

Migrations, new routes, public contract changes, section regeneration, Admin/learner redesign, publication changes, Tavily/source/outline changes, provider routing, more than one correction, more than five calls, generic queue infrastructure, live AI, push, and deploy.
