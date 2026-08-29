# TASK-106 — Exercise Completion Return Flow and Review Mode

- **Status:** `VERIFIED`
- **Owner / Reviewer:** Codex
- **Starting HEAD:** `c2fdc66825b4a963ab765cb5a7d4f305c9be13d9`

## Objective

Separate incomplete Exercise attempts from completed, persisted, read-only review. A correct result
must expose a clear return-to-Lesson action, while `Xem lại` restores the current learner's latest
successful submitted answer across refresh without exposing another learner's data or solution.

## Proven root causes

- The top-level Exercise breadcrumb links to the Lesson, but the correct-result panel has no
  completion-specific return CTA and leaves the form in an editable resubmission state.
- The Lesson uses the same `/exercises/:id` link for both `Làm bài` and `Xem lại`, so intent is lost.
- The submission repository selects only summary metadata even though the existing API/database
  contract persists `answer` and permits a learner to read only their own submissions.
- The Exercise page never loads an authoritative successful submission into the viewer.

## Scope

- Use `?mode=review` for completed Lesson links; keep the attempt URL unchanged.
- Let persisted completion override the route hint so refresh cannot reopen a completed form.
- Select the current learner's highest-attempt successful submission deterministically.
- Fetch static feedback server-side only after ownership/correctness is established.
- Restore every supported answer shape and render review controls read-only.
- Hide submission actions after correct completion and in review mode.
- Add a prominent `Quay lại bài học` CTA after completion and in review.
- Preserve incorrect-attempt retry, generation, grading, completion semantics, auth, and RLS.

## Files allowed to change

- `src/features/lessons/components/lesson-content-view.tsx`
- `src/features/lessons/components/__tests__/lesson-content-view.test.tsx`
- `src/features/exercises/types/index.ts`
- `src/features/exercises/repositories/exercise-repository.ts`
- `src/features/exercises/repositories/__tests__/exercise-repository.test.ts`
- `src/features/exercises/services/exercise-service.ts`
- `src/features/exercises/services/__tests__/exercise-service.test.ts`
- `src/features/exercises/components/exercise-view.tsx`
- `src/features/exercises/components/fix-the-bug-drag-drop.tsx`
- `src/features/exercises/components/__tests__/exercise-view-subject-agnostic.test.tsx`
- `src/features/exercises/components/__tests__/exercise-view-fix-the-bug.test.tsx`
- `src/app/(main)/exercises/[exerciseId]/page.tsx`
- `src/app/api/exercises/[exerciseId]/submissions/route.ts`
- focused route/page tests if required
- `tests/e2e/t022-functional-regression.spec.ts`
- `tests/e2e/support/mock-supabase-server.mjs`
- `playwright.task-106.config.ts`
- `docs/api_contract.md`
- task/reports/queue files

## Acceptance criteria

- Correct submission shows `Hoàn thành` and an in-context return-to-Lesson CTA; no active submit.
- `Xem lại` explicitly opens review mode and restores the latest successful answer after refresh.
- Choice, short-answer, ordering, matching, scenario, predict-output, and fix-the-bug answers restore.
- Review controls are read-only and cannot create or overwrite a submission.
- User B cannot see User A's answer or completion.
- No solution/correct answer is exposed before submission or added to the learner DTO.
- No migration, real AI call, deploy, push, or commit.
- Required focused/full tests, Playwright, lint, typecheck, build, and `git diff --check` pass.

## Verification summary

- Latest successful submission is selected by current user, Exercise, `is_correct = true`, and
  descending `attempt_number`; no other-user fallback exists.
- All supported answer shapes restore in read-only controls; completed/review states have no submit.
- Correct completion and both attempt/review refresh paths preserve the completed state.
- Focused 55 tests, full 1,230-test suite, eight Chromium flows, lint, typecheck, build, and diff
  checks pass. Review verdict: `PASS`.
- Database migration: `NONE`; commit: `NONE`.
