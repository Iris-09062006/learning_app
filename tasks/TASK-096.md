# TASK-096 — UI Workflow Continuity and Auth-Aware Navigation

- **Status:** `DONE` — `production-test-2` commit `4a4fa6c3eb9fe23e028f14b1a3ded37b209bb510`
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `dce587004fdcde228020a9ab4146187e687b0ba7`

## Objective

Make successful Course/content/review mutations reconcile visible client state with authoritative
server state without a manual browser reload, reset only completed transient Course-import state,
and make the public landing header reflect the existing authenticated Supabase session without
changing session lifecycle or showing guest CTAs to signed-in users.

## Scope

- Audit and harden Course outline rename/metadata save, Lesson-content save, Course-import creation,
  Course review, and Exercise moderation refresh boundaries.
- Prevent stale or out-of-order Course-import queue reads from overwriting newer server truth.
- Reset completed transient workflow inputs only after successful creation; preserve them on failure.
- Render `/` from the existing server-side auth/session boundary and reuse existing authenticated routes.
- Add focused component/page tests and Playwright coverage for authenticated/guest landing plus
  mutation continuity.

## Files allowed to change

- `src/app/page.tsx`
- `src/app/page.test.tsx`
- `src/features/content-pipeline/components/content-pipeline-admin.tsx`
- `src/features/content-pipeline/components/__tests__/content-pipeline-admin.test.tsx`
- `src/features/moderation/components/moderation-review-form.tsx`
- `src/features/moderation/components/__tests__/moderation-review-form.test.tsx`
- `src/features/moderation/components/moderation-detail-view.tsx`
- `src/features/moderation/components/__tests__/moderation-detail-view.test.tsx`
- `tests/e2e/critical-flows.spec.ts`
- `tasks/TASK-096.md`
- `reports/TASK-096-*.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Acceptance criteria

- A saved Course title/metadata or Lesson draft immediately displays the reloaded server value.
- A newly created Course import is selected from the refreshed queue; completed transient creation
  inputs reset only after success, while failed mutations preserve retryable input.
- Resolved review items immediately leave pending queues according to the existing state machine.
- Clicking the LearningApp logo never signs out; `/` renders authenticated actions from the real
  server-resolved session with no guest-header flicker, while guest actions remain intact.
- Duplicate submissions are disabled during mutations and existing error feedback is preserved.
- Focused tests, relevant Playwright flows, lint, typecheck, build, and `git diff --check` pass.
- No database migration, AI provider call, deployment, push, or commit.

## Explicit exclusions

No auth semantic/RBAC/schema change; no AI generation, 9Router, outline/Lesson/Exercise generation,
TASK-090/TASK-091, publication-state, visual-system, dependency, or deploy change. The original
no-push/no-commit exclusion was superseded by the user's 2026-08-28 request to release the verified
work to `production-test-2` through GitHub MCP.
