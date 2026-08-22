# TASK-090 Implementation Report

## Outcome

Lesson generation now treats each persisted `lesson_content_drafts.status = 'ready'` revision as a
durable checkpoint for its approved outline Lesson. Bulk generation reloads the approved revision
and its Lesson drafts from database state, skips ready Lessons with zero provider calls, and runs
missing Lessons sequentially in outline order. Each final reviewed Lesson persistence call is
awaited before the next Lesson begins.

Retry preparation now preserves an existing `approved_outline_revision` rather than overwriting it
with a different current revision. Repository loading selects that approved revision and selects
the latest ready content revision for each Lesson. Job failure continues to update only
`course_import_jobs`; it does not delete or invalidate ready Lesson drafts.

An all-complete failed retry performs zero provider calls and uses the new
`reconcile_course_lesson_generation` RPC to restore `content_review` without inserting a duplicate
Lesson revision. Targeted single-Lesson regeneration retains its existing preparation semantics.

## Behavior before the fix

- `generateOneCourseLesson()` already awaited Lesson persistence immediately after the final review
  passed; invalid or rejected candidates were not persisted.
- `generateCourseLessonContents()` already filtered out non-null `contentDraft` values, so it did
  not unconditionally generate every Lesson. The predicate did not explicitly require `status =
  'ready'`.
- `prepare_course_lesson_generation` did not delete Lesson drafts, but it always replaced
  `approved_outline_revision` with `current_outline_revision`.
- Repository loading always selected `current_outline_revision`. If it differed from the previously
  approved revision, the approved Lesson IDs and their ready drafts disappeared from retry truth,
  making retry appear to start from Lesson 1.
- `fail_course_import_job` changed only job status/error state and did not erase Lesson drafts.

## Authoritative state

The authoritative per-Lesson completion state is a `lesson_content_drafts` row belonging to the
Lesson in `approved_outline_revision` with `status = 'ready'`. Overall `course_import_jobs.status`
is not used as proof that an individual Lesson is complete.

## Database change

Migration `031_lesson_generation_retry_checkpointing.sql` replaces the existing prepare
RPC behavior to preserve the approved revision and adds an Admin-only all-complete reconciliation
RPC. It adds no table, column, enum, prompt data, or checkpoint table. The migration was created
locally and was not applied to any database.

## Files changed for TASK-090

- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `src/features/content-pipeline/repositories/content-pipeline-repository.ts`
- `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`
- `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`
- `supabase/migrations/031_lesson_generation_retry_checkpointing.sql`
- `docs/ai-course-current-flow.md`
- `docs/database.md`
- Task state and TASK-090 report files

The working tree also contains pre-existing uncommitted TASK-089 provider/diagnostic changes in
overlapping service/repository files. Those changes were preserved.

## Limits

- No real AI call, remote database mutation, migration application, build, deployment, push, or
  commit was performed.
- Concurrent duplicate generate requests were not redesigned; this task covers failure/retry
  checkpoint correctness for the existing request workflow.
