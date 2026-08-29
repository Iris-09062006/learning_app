# TASK-090 — Fix Lesson Generation Retry Checkpointing

- **Status:** VERIFIED (uncommitted by user request)
- **Owner / Reviewer:** Codex
- **Type:** Workflow correctness / persistence

## Objective

Make each valid persisted Lesson content draft a durable retry checkpoint. Bulk Lesson generation
must persist one Lesson before starting the next, reload the approved outline and per-Lesson server
state on retry, skip every Lesson with a persisted `ready` draft, and resume in outline order at the
first missing Lesson.

## Required context

- `AGENTS.md`, `CODEX.md`, `ACTIVE_TASK.md`
- `docs/ai-course-current-flow.md`, `docs/database.md`
- `specs/003-pedagogical-lesson-generation/{spec.md,plan.md,tasks.md}`
- `supabase/migrations/025_pdf_to_course_pipeline.sql`
- Active service/repository implementation and tests

## Scope

- Preserve and reuse the approved Course-outline revision on retry.
- Treat a persisted `lesson_content_drafts.status = 'ready'` row as the per-Lesson completion truth.
- Keep Lesson generation strictly ordered and await persistence before the next Lesson starts.
- Preserve ready Lesson drafts when the overall job transitions to `failed`.
- Reconcile an all-complete retry to `content_review` with zero provider calls.
- Add deterministic service, repository, and migration tests; make no real provider calls.
- Preserve the uncommitted TASK-089 changes already present in overlapping files.

## Out of scope

- AI prompts, JSON Schemas, provider routing, 9Router, model selection, review/correction semantics.
- Course-outline content changes, frontend changes, queues/background workers, new checkpoint tables.
- Live AI calls, deployment, push, or commit.

## Acceptance criteria

- In a six-Lesson job, Lessons 1 and 2 persist before Lesson 3 begins; a Lesson 3 failure leaves
  those ready drafts intact.
- Retry reloads server truth, makes zero provider calls for Lessons 1 and 2, and starts at Lesson 3.
- Missing Lessons continue in approved-outline order.
- An all-ready retry makes zero provider calls and reconciles the job to `content_review`.
- A failed job does not delete or invalidate ready Lesson checkpoints.
- The approved outline revision is retained instead of being replaced with a different current
  revision.
- Focused tests, lint, typecheck, and `git diff --check` pass.

## Required commands

- `npm test -- src/features/content-pipeline/services/content-pipeline-service.test.ts src/features/content-pipeline/repositories/content-pipeline-repository.test.ts src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`
- `npm run lint`
- `npm run typecheck`
- `git diff --check`
