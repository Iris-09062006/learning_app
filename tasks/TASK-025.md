# TASK-025 — Lesson Content API and Viewer

## Status
`VERIFIED`

## Required Context
- `docs/requirements.md`
- `docs/features.md` (Module 7: Lesson content — F-LESSON-01, F-LESSON-02)
- `docs/database.md` (§7.4 `chapters`, §7.5 `lessons`, §7.9 `user_progress`)
- `docs/api_contract.md` (§12.1 Get lesson, §12.2 Start lesson)
- `docs/ui.md`

## Objectives
1. Implement types for lesson data structure (`LessonResponse`, `StartLessonResponse`).
2. Add `lesson-repository.ts` in `src/features/lessons/repositories/` to fetch published lesson data and manage `user_progress` (locked/unlocked/in_progress).
3. Add `lesson-service.ts` in `src/features/lessons/services/` to enforce business rules (check enrollment, ensure lesson is unlocked, format response).
4. Implement API Route Handler `GET /api/lessons/:lessonId` returning standardized contract responses.
5. Implement API Route Handler `POST /api/lessons/:lessonId/start` to transition lesson status from `unlocked` to `in_progress`.
6. Build client component `LessonContentView` rendering lesson title, content (markdown/HTML), and "Start/Continue" button logic.
7. Create page at `src/app/(main)/lessons/[lessonId]/page.tsx`.
8. Write complete unit tests for repository, service, API endpoints, and UI component.

## File Scope
- `src/features/lessons/types/index.ts`
- `src/features/lessons/repositories/lesson-repository.ts`
- `src/features/lessons/services/lesson-service.ts`
- `src/app/api/lessons/[lessonId]/route.ts`
- `src/app/api/lessons/[lessonId]/start/route.ts`
- `src/features/lessons/components/lesson-content-view.tsx`
- `src/app/(main)/lessons/[lessonId]/page.tsx`
- `src/features/lessons/repositories/__tests__/lesson-repository.test.ts`
- `src/features/lessons/services/__tests__/lesson-service.test.ts`
- `src/app/api/lessons/[lessonId]/__tests__/route.test.ts`
- `src/app/api/lessons/[lessonId]/start/__tests__/route.test.ts`
- `src/features/lessons/components/__tests__/lesson-content-view.test.tsx`
- `tasks/TASK-025.md`
- `ACTIVE_TASK.md`
- `project/TASKS.md`
- `reports/TASK-025-implementation.md`
- `reports/TASK-025-review.md`

## Acceptance Criteria
- `GET /api/lessons/:lessonId` returns `200` with lesson content if user is enrolled and lesson is accessible (published, un-locked).
- Unenrolled users or unauthenticated requests receive `401` or `403`.
- Locked lesson returns `403` with specific error message.
- `POST /api/lessons/:lessonId/start` transitions lesson `user_progress` status to `in_progress` and records `started_at` timestamp.
- Visual component correctly renders lesson content and displays appropriate Start/Continue buttons based on status.
- Quality gates `npm run typecheck`, `npm run lint`, `npm run test` pass with 0 errors/warnings.