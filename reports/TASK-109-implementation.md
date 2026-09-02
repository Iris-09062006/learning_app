# TASK-109 Implementation Report

## Outcome

`VERIFIED` — every Course-import queue item now has a confirmed `Xóa` action. A successful removal
deletes the unresolved import, its owned draft/evidence database graph, and its private source
objects, then reconciles the UI from an uncached queue response. Published curriculum is protected.

## Files changed

- Admin queue UI and component regression tests.
- `DELETE /api/admin/course-drafts/:id`, service, repository, and their tests.
- Generated Supabase function type.
- Migration `034_remove_course_import_from_queue.sql` and migration contract tests.
- API/database documentation and task-state artifacts.

## Implementation notes

- The destructive action uses the existing danger token, a per-item accessible name, browser
  confirmation, an item-local loading state, success status announcement, and error alert.
- The RPC validates an active Admin, locks the job, refuses resolved/published identities, captures
  owned private storage paths, deletes the database graph transactionally, and writes
  `course_import.removed_from_queue` audit evidence.
- Official Course, Chapter, Lesson, publication, learner, progress, and Exercise rows are outside the
  deletion graph and guarded explicitly.
- Migration `034` was subsequently applied through Supabase MCP as remote migration
  `20260902034802 remove_course_import_from_queue`; no application deployment, push, or live provider
  request was performed.
- Commit: `1556cb6` (`feat(content-pipeline): remove imports from queue`).
