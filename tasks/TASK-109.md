# TASK-109 — Remove Course Imports from the Queue

- **Status:** `VERIFIED`
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `3e547c5fef25bbcf92ca3be9e2c4f3d3253d4dfb`

## Objective

Let an active Admin permanently remove an unwanted Course import and its owned source material from
the queue while protecting published curriculum.

## Scope

- Add a destructive action beside every Course-import queue item.
- Require explicit browser confirmation and expose item-specific accessible labels.
- Delete the unresolved import, its owned database evidence, and private source objects.
- Authorize and serialize removal in a dedicated database RPC and record an Admin audit event.
- Allow removal from every unresolved status shown by the queue, including failed or in-flight jobs.
- Preserve official Courses, Chapters, Lessons, publication mappings, and learner history.

## Files allowed to change

- `src/features/content-pipeline/components/content-pipeline-admin.tsx`
- `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`
- `src/app/api/admin/course-drafts/[id]/route.ts`
- `src/features/content-pipeline/services/content-pipeline-service.ts`
- `src/features/content-pipeline/services/content-pipeline-service.test.ts`
- `src/features/content-pipeline/repositories/content-pipeline-repository.ts`
- `src/features/content-pipeline/repositories/content-pipeline-repository.test.ts`
- `src/features/content-pipeline/repositories/pdf-to-course-migration.test.ts`
- `src/generated/database.types.ts`
- `supabase/migrations/034_remove_course_import_from_queue.sql`
- `docs/api_contract.md`
- `docs/database.md`
- task, queue, and TASK-109 report files

## Acceptance criteria

- Each visible queue item has a clearly labelled `Xóa` action.
- Canceling confirmation sends no request and preserves the item.
- Confirming sends `DELETE /api/admin/course-drafts/:id`, announces progress, and removes only the
  successful item after reconciliation with the uncached queue response.
- API/database authorization is restricted to active Admins.
- Database removal is transactional, writes audit evidence, and cannot remove published or already
  resolved jobs; private storage cleanup uses only paths returned by the authorized RPC.
- Failure keeps the item visible and shows an accessible error.
- Focused/full tests, lint, typecheck, build, `git diff --check`, and final review pass.
- No live AI request, push, or application deployment; apply the reviewed database migration through
  Supabase MCP and verify its function security settings.

## Verification summary

- Confirm/cancel, successful reconciliation, accessible labels/loading, and failure retention have
  component regression coverage.
- Service/repository tests cover ID validation, RPC calls, response validation, and private storage
  cleanup handoff; migration tests cover locking, active-Admin authorization, audit, hard deletion,
  published-curriculum protection, and grants.
- Focused 223 tests, full 1,245-test suite (1 skipped), lint, typecheck, production build, diff check,
  secret scan, and final review pass.
- Review verdict: `PASS`; migration `034` was applied through Supabase MCP as remote migration
  `20260902034802 remove_course_import_from_queue` and its function grants/security settings were
  verified; main integration commit `1b18c96`; no application deploy, live AI request, or queue-item deletion
  occurred.
