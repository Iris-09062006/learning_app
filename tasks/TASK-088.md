# TASK-088 — Feature 005 Per-Lesson Generation Phase B

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Feature:** `005-per-lesson-generation`
- **Scope:** Backend Phase B only

## Objective

Add one Admin backend endpoint that generates exactly one requested outline Lesson while reusing the verified pedagogical runner and persistence boundary, lock both service and provider to the currently configured `gemini-3.7-flash` model, and preserve all existing Course-wide behavior.

## Required context

- User-provided Feature 005 Phase A discovery and model rebase result
- User-provided Feature 005 Phase B task packet
- Existing Feature 003 pedagogical generation implementation and TASK-080 through TASK-083 reports
- Model migration commits `1cc29ee` and `935067b` (inspected; changes ported selectively, not cherry-picked)

## Allowed files

- Per-Lesson generate route and route tests
- Content pipeline service/provider implementation and focused tests
- Content pipeline repository model expectation test
- Task state and TASK-088 reports

## Acceptance criteria

- `POST /api/admin/course-drafts/[id]/lessons/[lessonId]/generate` generates only the requested Lesson.
- First generation persists one reviewed draft and returns `generated`; replay of a completed Lesson returns `already_generated` without provider, persistence, or revision work.
- The exact configured pedagogical model is `gemini-3.7-flash` in both service and provider, and focused tests assert that exact value.
- Normal flow remains exactly three model requests; correction remains at most five with no sixth request; every request retains the 45-second timeout.
- Existing regeneration, Course-wide Continue scheduling (concurrency three, 240-second deadline), citations, publication, Exercise, and progress behavior remain unchanged.
- No frontend timeout change, migration, live provider request, push, or deployment.

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts
npm run test -- src/features/content-pipeline/repositories/content-pipeline-repository.test.ts
npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run test -- src/app/api/admin/__tests__/pdf-to-course-routes.test.ts
npm run lint
npm run typecheck
npm run test -- --reporter=dot
npm run build
git diff --check
```

## Out of scope

Frontend orchestration, the existing 60-second browser timeout, Course-wide route/scheduler changes, regeneration contract changes, migrations, publication, Exercise, progress, live Gemini calls, push, and deployment.
