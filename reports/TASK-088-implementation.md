# TASK-088 Implementation Report

## Outcome

Feature 005 Phase B is implemented. The new Admin route generates one requested outline Lesson per POST and reuses the existing reviewed pedagogical generation and immutable persistence boundaries. The service and provider use the exact current model `gemini-3.7-flash`.

## Model compatibility

- Ported the model invariant from inspected commit `1cc29ee` without importing that commit's unrelated task metadata.
- Ported only the Gemini 3.7 request compatibility hunks from inspected commit `935067b`: pedagogical requests use `reasoning_effort: "low"` and omit the deprecated `temperature` field.
- Did not import that commit's frontend timeout or scheduler changes.
- Provider and service constants agree, and focused tests assert the exact model rather than accepting an arbitrary model.

## Per-Lesson orchestration

- Added `POST /api/admin/course-drafts/[id]/lessons/[lessonId]/generate` with the existing Admin authorization and error envelope.
- Added a service entry point that validates IDs, job freshness, requested-Lesson membership, outline approval, and permitted job state before generation.
- Reused `generateOneCourseLesson()`, `generateReviewedPedagogicalLesson()`, and `persistCourseLessonContentForJob()` for only the selected Lesson.
- A completed-Lesson replay returns the same persisted draft ID/revision with `already_generated` and performs zero provider, persistence, preparation, or failure-state calls.
- First generation returns `generated`; status remains `generating_content` while Lessons are missing and becomes `content_review` when the final missing Lesson completes.
- Provider failures retain the safe `AI_PROVIDER_ERROR` envelope and existing recoverable job failure transition.

## Protected behavior

- Normal/correction call budgets remain exactly three/maximum five, with one correction and no sixth request.
- The 45-second per-request provider timeout is unchanged.
- Existing Course-wide concurrency remains three and its scheduling deadline remains 240 seconds.
- Existing generate-all route, regeneration, canonical citations, persistence RPC, publication, Exercise, progress, and frontend code are unchanged.
- The browser Continue timeout remains 60 seconds for an explicit Phase C decision.
- No migration, live provider request, remote mutation, push, or deployment occurred.

## Known concurrency boundary

Completed replay is idempotent. Two genuinely simultaneous first requests can still race before either persistence result is visible; Phase B intentionally adds no database lock or migration, so stronger cross-instance first-request idempotency remains a documented Phase C consideration.
