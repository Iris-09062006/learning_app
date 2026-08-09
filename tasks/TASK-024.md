# TASK-024 — Visual Learning Roadmap Page

## Status
`VERIFIED`

## Required Context
- `docs/requirements.md`
- `docs/features.md` (Module 6: Roadmap F-ROADMAP-01/02)
- `docs/database.md` (§7.3, §7.4, §7.5, §7.9)
- `docs/api_contract.md` (§4.2, §6, §11.1)
- `docs/ui.md` (§5)

## Objectives
1. Implement types for course roadmap data structure (`RoadmapResponse`, `RoadmapChapter`, `RoadmapLesson`, `ProgressStatus`).
2. Add `fetchCourseRoadmap` function to `src/features/courses/repositories/course-repository.ts` to retrieve published chapters, published lessons, and current learner progress (`user_progress`).
3. Add `getCourseRoadmap` method in `src/features/courses/services/course-service.ts` to perform enrollment check (`COURSE_NOT_ENROLLED` if unauthenticated/not enrolled), format progress status (`locked`, `unlocked`, `inProgress`, `completed`), and calculate overall `completionPercentage`.
4. Implement API Route Handler `GET /api/courses/:courseId/roadmap` returning standardized contract responses (`200 OK`, `401 UNAUTHENTICATED`, `403 FORBIDDEN/COURSE_NOT_ENROLLED`, `404 NOT_FOUND`).
5. Build client component `CourseRoadmapView` displaying course header, percentage progress bar, chapter tree with lesson statuses, estimated time, and clickable navigation to unlocked/in-progress/completed lessons.
6. Create page at `src/app/(main)/courses/[courseId]/roadmap/page.tsx` rendering the roadmap for enrolled learners.
7. Write complete unit tests for repository, service, API endpoint, and UI component.

## File Scope
- `src/features/courses/types/index.ts`
- `src/features/courses/repositories/course-repository.ts`
- `src/features/courses/services/course-service.ts`
- `src/app/api/courses/[courseId]/roadmap/route.ts`
- `src/features/courses/components/course-roadmap-view.tsx`
- `src/app/(main)/courses/[courseId]/roadmap/page.tsx`
- `src/features/courses/repositories/__tests__/course-repository.test.ts`
- `src/features/courses/services/__tests__/course-service.test.ts`
- `src/app/api/courses/[courseId]/roadmap/__tests__/route.test.ts`
- `src/features/courses/components/__tests__/course-roadmap-view.test.tsx`
- `tasks/TASK-024.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`
- `reports/TASK-024-implementation.md`
- `reports/TASK-024-review.md`

## Acceptance Criteria
- `GET /api/courses/:courseId/roadmap` returns `200` with course title, completion percentage, and ordered chapter/lesson status hierarchy for enrolled learners.
- Unenrolled users or unauthenticated requests receive appropriate error code (`401 UNAUTHENTICATED` or `403 COURSE_NOT_ENROLLED`).
- Non-existent or unpublished course returns `404 NOT_FOUND`.
- `ProgressStatus` mapped cleanly (`locked` -> `locked`, `unlocked` -> `unlocked`, `in_progress` -> `inProgress`, `completed` -> `completed`).
- Progress percentage calculated accurately based on `completed` vs total published lessons in course.
- Visual component correctly renders statuses, handles locked items (disabled/lock icon), and links accessible lessons.
- Quality gates `npm run typecheck`, `npm run lint`, `npm run test` pass with 0 errors/warnings.