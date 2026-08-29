# TASK-106 Implementation Report

## Outcome

`VERIFIED` from starting HEAD `c2fdc66825b4a963ab765cb5a7d4f305c9be13d9`.

## Root causes

- The Exercise had a top breadcrumb but no completion-specific return CTA inside the success result.
- A correct response left the form editable and exposed `Nộp lại`.
- `Làm bài` and `Xem lại` used the same URL, and the page never loaded persisted submission answers.
- The repository selected only submission metadata despite the existing contract and `answer` column.

## Implementation

- `Làm bài` retains `/exercises/:id`; `Xem lại` uses `/exercises/:id?mode=review`.
- The server selects the current learner's highest successful `attempt_number` for the Exercise.
- Persisted completion takes precedence over route intent, so refresh cannot reopen a completed form.
- Privileged static feedback is read only after an owned successful submission is established.
- Multiple choice, true/false, scenario, predict-output, fix-the-bug, short-answer, ordering, and
  matching answers initialize from persisted JSON.
- Completed/review controls are read-only, submit is absent, and an in-panel 44px return CTA points
  to the Exercise's real `lessonId`.
- Incorrect attempts retain the existing explicit `Nộp lại` behavior. No completed retry was added.

## Files changed for TASK-106

- `src/app/(main)/exercises/[exerciseId]/page.tsx`
- `src/features/exercises/types/index.ts`
- `src/features/exercises/repositories/exercise-repository.ts`
- `src/features/exercises/repositories/__tests__/exercise-repository.test.ts`
- `src/features/exercises/services/exercise-service.ts`
- `src/features/exercises/services/__tests__/exercise-service.test.ts`
- `src/features/exercises/components/exercise-view.tsx`
- `src/features/exercises/components/fix-the-bug-drag-drop.tsx`
- Exercise component tests
- `src/features/lessons/components/lesson-content-view.tsx`
- `src/features/lessons/components/__tests__/lesson-content-view.test.tsx`
- `tests/e2e/t022-functional-regression.spec.ts`
- `playwright.task-106.config.ts`
- `docs/api_contract.md`
- TASK-106 packet, reports, and active task queues

No database migration, real AI call, deploy, push, or commit occurred.
