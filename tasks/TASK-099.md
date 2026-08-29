# TASK-099 — Lesson Previous Navigation and Exercise Completion State

- **Status:** `VERIFIED` (uncommitted by user request)
- **Owner / Reviewer:** Codex

## Objective

Restore learner continuity on `/lessons/[lessonId]` by deriving both adjacent Lessons from the
persisted Course curriculum order and by rendering each Exercise's persisted, user-specific correct
submission state.

## Proven root causes

- `fetchLessonDetail` already loads the complete published Course curriculum in authoritative
  `(chapter_order, lesson_order)` order, but maps only the item after the current Lesson.
- Correct attempts are already stored atomically by `submit_exercise` in `submissions.is_correct`,
  and RLS permits a learner to select only their own rows. The Lesson query does not load that signal,
  so every Exercise card is rendered as incomplete.

## Scope

- Resolve `previousLesson` and `nextLesson` together from one ordered curriculum list.
- Load correct submissions for the current learner and current Lesson Exercises only.
- Add persisted completed styling/checkmark and keep completed Exercises accessible for review/retry.
- Show a responsive previous/next navigation area with at least 44px touch targets.
- Add repository, service, component, API/E2E regression coverage including incorrect attempts and
  user isolation.
- Update the Lesson API documentation and task/report state.

## Files allowed to change

- `src/features/lessons/repositories/lesson-repository.ts`
- `src/features/lessons/repositories/__tests__/lesson-repository.test.ts`
- `src/features/lessons/services/lesson-service.ts`
- `src/features/lessons/services/__tests__/lesson-service.test.ts`
- `src/features/lessons/types/index.ts`
- `src/features/lessons/components/lesson-content-view.tsx`
- `src/features/lessons/components/__tests__/lesson-content-view.test.tsx`
- `src/features/exercises/components/exercise-view.tsx`
- `src/features/exercises/components/__tests__/exercise-view-subject-agnostic.test.tsx`
- `src/app/api/lessons/__tests__/route.test.ts`
- `tests/e2e/t022-functional-regression.spec.ts`
- `tests/e2e/support/fixtures.ts`
- `tests/e2e/support/mock-supabase-server.mjs`
- `playwright.task-099.config.ts`
- `docs/api_contract.md`
- `tasks/TASK-099.md`
- `reports/TASK-099-*.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`

## Acceptance criteria

- First Lesson has no Previous action; middle Lessons point to exact previous/next Lessons; last
  Lesson keeps Previous while preserving the existing absence/final behavior for Next.
- Adjacency is never inferred from IDs and is not calculated independently in two places.
- A correct persisted submission marks only that learner's Exercise as completed after return,
  refresh, and a new authenticated session; an incorrect-only attempt never marks completion.
- Completed Exercises remain reachable and no solution data is added to the Lesson response.
- Existing Lesson/Course progress formula remains unchanged.
- Focused tests, relevant Playwright flow, lint, typecheck, full Vitest, build, and
  `git diff --check` pass.
- No migration, real AI call, deploy, push, or commit.
