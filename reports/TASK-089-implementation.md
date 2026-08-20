# TASK-089 Implementation Report

## Outcome

Feature 005 Phase C is implemented. The Admin browser now orchestrates initial Course Lesson generation sequentially from persisted server truth and no longer calls the legacy generate-all endpoint.

## Orchestration

- `refresh()` now returns the fetched Course-import collection as well as updating React state.
- An explicit Continue/Retry action refreshes first, finds the selected job, sorts Lessons by `lessonOrder` with ID tie-breaking, and filters `contentDraft === null`.
- Each missing Lesson is POSTed to `/api/admin/course-drafts/{jobId}/lessons/{lessonId}/generate` and awaited before the next request.
- Each 2xx response is followed by a fresh GET; the requested Lesson must have a persisted `contentDraft` before the loop advances.
- A failure stops immediately, refreshes persisted progress, displays the existing safe error alert, and leaves later Lessons unrequested.
- Retry performs a new initial refresh and starts from the first missing Lesson. Reload restores the same count but never auto-starts work.
- A synchronous ref guard prevents same-tick duplicate runs; existing busy state disables relevant controls.

## Timeout and progress

- Added `PER_LESSON_GENERATION_REQUEST_TIMEOUT_MS = 300_000` and pass it only to the new one-Lesson POST.
- The Phase B route already exported `maxDuration = 300`; no route change was required.
- The selected Course shows persisted completed/total progress. During generation its live status also announces the current count and Lesson title.
- Partially generated `generating_content` jobs expose an explicit Continue control alongside the existing refresh control.
- A selected queue item's secondary text uses the stronger existing semantic text token to meet stable light-theme contrast.

## Protected scope

The provider/model, Gemini 3.7 payload, 45-second call timeout, three/five-call limits, Quality Review, citations, persistence, Course-wide scheduler, old generate-all route, regeneration, database, publication, Exercise, learner progress, and Phase D are unchanged.

The cross-instance simultaneous first-request race documented in Phase B remains; Phase C adds no migration or distributed lock.
