# TASK-042 Implementation Report

## Outcome

Status: `VERIFIED`

Guest onboarding và public operational routes không còn bị middleware chuyển thành `307 /login`. Homepage đã phản ánh sản phẩm LearningApp hiện tại và route group `(main)` có app navigation responsive, lọc theo trạng thái đăng nhập/role.

## Changes

- Chuyển middleware sang access policy có chủ đích:
  - Public: `/`, `/login`, `/register`, `/courses`, `/courses/:courseId`.
  - API không bị đổi thành HTML redirect; Route Handler/service giữ quyền quyết định JSON `401/403`.
  - Page riêng tư vẫn redirect về `/login` và giữ relative `next` URL.
- Forward anti-cache response headers do `@supabase/ssr` gửi kèm auth cookie refresh.
- Thay homepage placeholder bằng landing page mô tả roadmap, bài tập tương tác và AI Mentor server-side.
- Thêm app shell với sidebar desktop, top/bottom navigation mobile, auth actions và role-aware destinations.
- Thêm app icon để browser không tạo resource 404.
- Thay placeholder E2E bằng onboarding/navigation regression; cho phép Playwright dùng browser executable được cung cấp qua env.

## Files changed

- `.gitignore`
- `playwright.config.ts`
- `src/app/page.tsx`, `src/app/page.test.tsx`, `src/app/icon.svg`
- `src/app/(main)/layout.tsx`
- `src/components/layout/app-navigation.tsx`, `app-navigation.test.tsx`
- `src/lib/supabase/middleware.ts`, `middleware.test.ts`
- `tests/e2e/sample.spec.ts`
- `tasks/TASK-042.md`, `ACTIVE_TASK.md`, `project/TASKS.md`
- `reports/TASK-042-implementation.md`, `TASK-042-test.md`, `TASK-042-review.md`

## Environment notes

- Không tạo hoặc ghi secret giả. `.env.local` vẫn ignored và hiện thiếu `SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`.
- Không thay đổi migration/database contract.
- Chrome hệ thống được dùng cho browser verification qua `PLAYWRIGHT_BROWSER_EXECUTABLE_PATH`; mặc định Playwright/CI không đổi.
