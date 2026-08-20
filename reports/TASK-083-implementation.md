# TASK-083 Implementation Report

## Outcome

Phase D (T026–T036) is implemented and verified. The active Course-import Continue and Lesson-wide regeneration paths now use the reviewed pedagogical pipeline and the unchanged immutable persistence boundary. No migration, public API, Admin UI, learner, publication, Tavily, outline, Exercise, or progress implementation changed.

## Integration

- Replaced the Course-import-only one-shot `generateLessonDraft()` call inside `generateOneCourseLesson()` with `generateReviewedPedagogicalLesson()`.
- Preserved exact approved Lesson evidence resolution, one `ai:lesson-content` capacity check per started Lesson pipeline, canonical citation rows, and `persistCourseLessonContentForJob()`.
- Persisted only the final reviewed `StructuredLessonDraft`; synthesis, blueprint, purposes, findings, and correction instructions remain transient.
- Kept the historical standalone source-to-Lesson path unchanged; the Course-import Continue/regeneration path makes zero legacy one-shot calls and has no fallback.
- Lesson-wide regeneration runs the same pipeline for only the selected outline Lesson and relies on the existing RPC for a new immutable revision.

## Scheduling and recovery

- Replaced unbounded missing-Lesson `Promise.all` fan-out with three fixed workers consuming Lessons in outline order.
- Each Lesson's stages remain sequential. A shared stage-start guard stops later stages after the first hard failure or the 240-second scheduling deadline.
- Workers settle already-running stages; completed drafts remain persisted. Queued Lessons remain missing, the job is failed once with `LESSON_GENERATION_FAILED`, and retry selects only Lessons without a completed content draft.
- The provider's existing 45-second timeout remains unchanged for every stage request.
- The selected-Lesson regeneration route now exports `maxDuration = 300`, matching the existing Course generation envelope without changing its HTTP contract.

## Compatibility

- `StructuredLessonDraft`, canonical citation ownership, `persist_lesson_content_draft_for_job`, and immutable revision behavior are unchanged.
- Existing Admin Continue timeout/refresh/retry, review editing, publication, learner Markdown, enrollment/progress, Exercise, PDF/file, multi-source, and Tavily-outage flows pass unchanged.
- No database migration or schema artifact was added.

## Documentation verification

- Context7 confirmed that `maxDuration` is a statically exported App Router route-segment configuration supported in `route.ts`.
- The Supabase changelog was reviewed as required by the Supabase skill; no current breaking change affects the existing RPC-only persistence boundary, and no remote database operation was performed.
