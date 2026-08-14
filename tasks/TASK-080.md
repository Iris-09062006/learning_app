# TASK-080 — Pedagogical Lesson Generation Phase A

- **Status:** VERIFIED
- **Owner / Reviewer:** Codex
- **Feature:** `003-pedagogical-lesson-generation`
- **Scope:** T001–T008 only

## Objective

Implement the transient approved-evidence, evidence-synthesis, and Lesson-blueprint contracts plus the first combined pedagogical provider stage. Stop before final section prose, quality review orchestration, Course Continue integration, or persistence.

## Required context

- `specs/003-pedagogical-lesson-generation/spec.md`
- `specs/003-pedagogical-lesson-generation/plan.md`
- `specs/003-pedagogical-lesson-generation/research.md`
- `specs/003-pedagogical-lesson-generation/data-model.md`
- `specs/003-pedagogical-lesson-generation/quickstart.md`
- `specs/003-pedagogical-lesson-generation/tasks.md`

## Allowed files

- `src/features/content-pipeline/types/index.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.ts`
- `src/features/content-pipeline/providers/lesson-draft-provider.test.ts`
- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- Task state and `TASK-080` reports

## Acceptance criteria

- T001–T008 and the Phase A gate pass.
- The combined stage uses exactly `gemini-3.6-flash` and exactly one outbound HTTP request per invocation.
- Malformed output, provider failure, timeout, and reported model substitution do not retry or fall back.
- Structural validation rejects invalid taxonomy, shape, ordering, and evidence ownership without judging prose claim support.
- Conceptual and procedural fixtures may produce materially different valid blueprints.
- `StructuredLessonDraft`, persistence, migrations, Continue, and downstream behavior remain unchanged.

## Required commands

```powershell
npm run test -- src/features/content-pipeline/providers/lesson-draft-provider.test.ts src/features/content-pipeline/services/content-pipeline-service.test.ts
npm run typecheck
npm run lint
git diff --check
```

## Out of scope

Phase B–D, final Lesson prose, quality review/correction, Course orchestration integration, persistence, migrations, Tavily, outline generation, Admin, learner, publication, Exercises, push, and deploy.
