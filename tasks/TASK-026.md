# TASK-026 — Exercise API, Evaluation, and Submissions

## Status
`VERIFIED`

## Required Context
- `docs/requirements.md`
- `docs/features.md` (Module 8: Interactive exercise — F-EXERCISE-01, F-EXERCISE-02)
- `docs/database.md` (§7.6 `exercises`, §7.7 `exercise_options`, §7.8 `exercise_solutions`, §7.10 `submissions`)
- `docs/api_contract.md` (§13.1 Get exercise, §13.2 Submit exercise, §13.3 Get learner submissions)
- `docs/security.md` (Exercise solutions server-side evaluation rule)

## Objectives
1. Implement types for exercise data structures (`GetExerciseResponse`, `SubmitExerciseRequest`, `SubmitExerciseResponse`, `SubmissionSummary`).
2. Add `exercise-repository.ts` in `src/features/exercises/repositories/` to handle secure solution retrieval (server-side ONLY) and submission persistence.
3. Add `exercise-service.ts` in `src/features/exercises/services/` to perform answer validation, grade submissions (`predictOutput` & `fixTheBug`), update lesson completion status when required exercises pass, and auto-unlock next lesson.
4. Implement API Route Handlers:
   - `GET /api/exercises/:exerciseId`
   - `POST /api/exercises/:exerciseId/submissions`
   - `GET /api/exercises/:exerciseId/submissions`
5. Build client component `ExerciseView` supporting `predictOutput` and `fixTheBug` choice selection, submission feedback banner, and next-lesson progression trigger.
6. Write complete unit tests for repository, evaluation logic, API handlers, and UI components.

## File Scope
- `src/features/exercises/types/index.ts`
- `src/features/exercises/repositories/exercise-repository.ts`
- `src/features/exercises/services/exercise-service.ts`
- `src/app/api/exercises/[exerciseId]/route.ts`
- `src/app/api/exercises/[exerciseId]/submissions/route.ts`
- `src/features/exercises/components/exercise-view.tsx`
- `src/features/exercises/repositories/__tests__/exercise-repository.test.ts`
- `src/features/exercises/services/__tests__/exercise-service.test.ts`
- `src/app/api/exercises/[exerciseId]/__tests__/route.test.ts`
- `src/app/api/exercises/[exerciseId]/submissions/__tests__/route.test.ts`
- `src/features/exercises/components/__tests__/exercise-view.test.tsx`
- `tasks/TASK-026.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`
- `reports/TASK-026-implementation.md`
- `reports/TASK-026-review.md`

## Acceptance Criteria
- `GET /api/exercises/:exerciseId` never exposes `correctAnswer`, `solution`, or `is_correct` flags of options.
- Server performs evaluation against `exercise_solutions` using service role/privileged handler without revealing solution to client.
- Successful submission auto-calculates completion percentage and updates `user_progress` to `completed` if all required exercises pass.
- Completing a lesson automatically unlocks the subsequent lesson in chapter/course order.
- Quality gates `npm run typecheck`, `npm run lint`, `npm run test` pass with 0 errors/warnings.