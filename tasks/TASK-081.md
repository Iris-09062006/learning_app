# TASK-081 — Pedagogical Lesson Generation Phase B

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Feature:** `003-pedagogical-lesson-generation`
- **Scope:** T009–T016 only

## Objective

Generate one complete purpose-aware Lesson candidate from the validated Phase A synthesis and blueprint, validate exact blueprint structure and approved citation ownership, and normalize to the existing `StructuredLessonDraft` contract. Stop before quality review, correction, Continue integration, or persistence.

## Required context

- `specs/003-pedagogical-lesson-generation/spec.md`
- `specs/003-pedagogical-lesson-generation/plan.md`
- `specs/003-pedagogical-lesson-generation/research.md`
- `specs/003-pedagogical-lesson-generation/data-model.md`
- `specs/003-pedagogical-lesson-generation/quickstart.md`
- `specs/003-pedagogical-lesson-generation/tasks.md`
- Verified Phase A implementation and `TASK-080` reports

## Allowed files

- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `specs/003-pedagogical-lesson-generation/tasks.md`
- Task state and `TASK-081` reports

## Acceptance criteria

- T009–T016 and the Phase B gate pass.
- All blueprint sections are generated in one request using exactly `gemini-3.6-flash`.
- Purpose-specific instructions cover the complete approved taxonomy and avoid article mode.
- Exact blueprint count/order/key/purpose and section-bounded citations are validated deterministically.
- Every final section resolves at least one approved citation through the immutable ref map.
- Normalization returns only the existing draft fields and canonical citation rows.
- Conceptual and procedural fixtures can use meaningfully different structures.
- No review, correction, persistence, migration, Continue, Admin, learner, publication, or Exercise change.

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts
npm run test -- src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run lint
npm run typecheck
git diff --check
```

## Out of scope

Phase C–D, quality review, targeted correction, Course orchestration integration, persistence calls, migrations, Tavily, feature 002, Admin, learner, publication, Exercises, push, and deploy.
