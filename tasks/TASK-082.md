# TASK-082 — Pedagogical Lesson Generation Phase C

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Feature:** `003-pedagogical-lesson-generation`
- **Scope:** T017–T025 only

## Objective

Add an independent semantic Quality Review to the verified Phase A/B candidate, allow exactly one targeted correction followed by one independent full re-review, and fail closed without persistence when the candidate does not pass. Stop before Course pipeline integration or scheduling.

## Required context

- `specs/003-pedagogical-lesson-generation/spec.md`
- `specs/003-pedagogical-lesson-generation/plan.md`
- `specs/003-pedagogical-lesson-generation/research.md`
- `specs/003-pedagogical-lesson-generation/data-model.md`
- `specs/003-pedagogical-lesson-generation/quickstart.md`
- `specs/003-pedagogical-lesson-generation/tasks.md`
- Verified Phase A/B implementation and `TASK-080`/`TASK-081` reports

## Allowed files

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `specs/003-pedagogical-lesson-generation/tasks.md`
- Task state and `TASK-082` reports

## Acceptance criteria

- T017–T025 and the Phase C gate pass.
- Whole-pipeline pass path uses exactly three provider calls; correctable path uses exactly five and never six.
- Review, correction, and re-review use exactly `gemini-3.6-flash` and one outbound request per invocation without retry/fallback.
- Quality Review owns semantic support, article-mode, progression, purpose fulfillment, repetition, scope, and claim/evidence matching.
- Structurally valid citations attached to unsupported prose are classified as correctable or reject, never pass.
- One correction changes only authorized targets; unaffected sections remain deeply equal.
- The corrected whole Lesson is structurally revalidated and independently re-reviewed.
- Review/correction artifacts remain transient and no persistence call occurs.
- No migration, feature 002, Continue, scheduler, Admin, learner, publication, Exercise, push, or deployment change.

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts
npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run typecheck
npm run lint
git diff --check
```

## Out of scope

Phase D, active Continue/regeneration integration, persistence orchestration, concurrency/deadline scheduling, migrations, Tavily, feature 002, Admin, learner, publication, Exercises, push, and deploy.
