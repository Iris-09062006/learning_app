# TASK-079 Implementation Report

## Outcome

`VERIFIED` — failed or non-settling Lesson-content generation no longer strands the Admin UI.
The fix is browser-state only and preserves the existing retryable Supabase job contract.

## Changes

- Added a 60-second browser boundary only to the Lesson-content generation request. The provider's
  existing 45-second boundary remains unchanged.
- Refreshes the Course-import queue after every generation failure before presenting retry state.
- Keeps concurrent retry safe: a still-running job remains `generating_content` and exposes only a
  read-only status refresh; the persisted RPC continues to reject a second generation transition.
- Added “Bắt đầu workflow mới” to clear session checkpoint, staged research/source UI, selection,
  and uncontrolled inputs without deleting or updating persisted jobs/sources.
- Added regression tests for non-settling request abort, failed-state refresh plus successful retry,
  and local reset with persisted queue retention.

## Files Changed

- `src/features/content-pipeline/components/content-pipeline-admin.tsx`
- `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`
- `tasks/TASK-079.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`
- `reports/TASK-079-implementation.md`
- `reports/TASK-079-test.md`
- `reports/TASK-079-review.md`

No migration, RPC, API route, provider, environment, deployment, or remote-data change was made.
