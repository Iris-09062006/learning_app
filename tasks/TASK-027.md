# TASK-027 — Progress Tracking API and Learner Progress Engine

## Status
`VERIFIED`

## Required Context
- `docs/requirements.md`
- `docs/features.md` (Module 9: Progress tracking — F-PROGRESS-01, F-PROGRESS-02)
- `docs/database.md` (§7.9 `user_progress`)
- `docs/api_contract.md` (§14.1 Get course progress, §14.2 Get lesson progress)

## Objectives
1. Implement types for progress responses (`CourseProgressResponse`, `LessonProgressResponse`).
2. Add progress querying & calculation methods to `progress-repository.ts` and `progress-service.ts` under `src/features/progress/`.
3. Implement API Route Handlers:
   - `GET /api/courses/:courseId/progress`
   - `GET /api/lessons/:lessonId/progress`
4. Build `CourseProgressCard` / `ProgressSummaryWidget` UI components to display completion stats, overall progress percentage, and last accessed lesson shortcut.
5. Write complete unit tests for progress calculation logic, repository methods, API handlers, and UI components.

## File Scope
- `src/features/progress/types/index.ts`
- `src/features/progress/repositories/progress-repository.ts`
- `src/features/progress/services/progress-service.ts`
- `src/app/api/courses/[courseId]/progress/route.ts`
- `src/app/api/lessons/[lessonId]/progress/route.ts`
- `src/features/progress/components/progress-summary-card.tsx`
- `src/features/progress/repositories/__tests__/progress-repository.test.ts`
- `src/features/progress/services/__tests__/progress-service.test.ts`
- `src/app/api/courses/[courseId]/progress/__tests__/route.test.ts`
- `src/app/api/lessons/[lessonId]/progress/__tests__/route.test.ts`
- `src/features/progress/components/__tests__/progress-summary-card.test.tsx`
- `tasks/TASK-027.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`
- `reports/TASK-027-implementation.md`
- `reports/TASK-027-review.md`

## Acceptance Criteria
- `GET /api/courses/:courseId/progress` returns accurate `completedLessons`, `totalLessons`, `completionPercentage`, and `lastAccessedLessonId` for enrolled user.
- `GET /api/lessons/:lessonId/progress` returns current status and completion timestamp.
- Requests from unenrolled or unauthenticated users are rejected with `401` or `403`.
- Progress components render progress bars and metrics accurately.
- Quality gates `npm run typecheck`, `npm run lint`, `npm run test` pass with 0 errors/warnings.