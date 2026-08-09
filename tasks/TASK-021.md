# Task Packet: TASK-021 — Auth Pages UI (Login & Register)

## Status
`VERIFIED`

## Owner
Codex

## Reviewer
Codex

## Feature ID
UI Foundation / Auth Pages (Login & Register)

## Objective
Xây dựng UI form components (`LoginForm`, `RegisterForm`) và 2 trang Auth (`/login`, `/register`) sử dụng Primitive UI components (`Button`, `Input`, `Card`), tích hợp với Auth Route Handlers từ `TASK-020`, tuân thủ `docs/ui.md`, `docs/architecture.md` và `docs/coding_standards.md`, kèm theo đầy đủ Unit Tests.

## Dependencies
- `TASK-003` (Primitive UI Components Foundation)
- `TASK-020` (Authentication Service & API Handlers)

## Required Context
- `AGENTS.md`
- `CODEX.md`
- `docs/ui.md`
- `docs/api_contract.md`
- `docs/architecture.md`
- `docs/coding_standards.md`

## Current State
- `TASK-003` đã tạo Primitive UI components (`Button`, `Input`, `Card`, `Badge`).
- `TASK-020` đã hoàn thành Auth Feature Service và 4 Route Handlers `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
- Chưa có UI Form Components hay Auth Page routes (`/login`, `/register`).
- Planner reconciliation: source và review artifacts của `TASK-002`/`TASK-003` đã được xác minh `PASS` nhưng chưa được Git track; các prerequisite này phải được commit riêng trước implementation commit của `TASK-021` để lịch sử Git có thể tái tạo build và test.

## In Scope
- Tạo Auth Feature UI Components tại `src/features/auth/components/`:
  - `src/features/auth/components/login-form.tsx`: Client Form Component xử lý login (email, password), loading state, client-side validation, gửi request tới `POST /api/auth/login`, điều hướng khi thành công, hiển thị lỗi khi thất bại.
  - `src/features/auth/components/register-form.tsx`: Client Form Component xử lý register (email, password, username), loading state, client-side validation, gửi request tới `POST /api/auth/register`, điều hướng khi thành công, hiển thị lỗi khi thất bại.
- Tạo Next.js Auth Pages & Layout:
  - `src/app/(auth)/login/page.tsx`: Route trang Đăng nhập bọc `LoginForm`.
  - `src/app/(auth)/register/page.tsx`: Route trang Đăng ký bọc `RegisterForm`.
  - `src/app/(auth)/layout.tsx`: Layout chung cho Auth pages (căn giữa Card trên nền `bg-slate-50`).
- Viết Unit Tests đầy đủ cho UI components:
  - `src/features/auth/components/login-form.test.tsx`
  - `src/features/auth/components/register-form.test.tsx`

## Out of Scope
- KHÔNG thay đổi Auth Route Handlers `/api/auth/*` hay database types.
- KHÔNG tạo OAuth / Social Login buttons ngoài phạm vi MVP.
- KHÔNG triển khai Course Catalog hay Dashboard Page (`TASK-022`, `TASK-024`).

## Files Allowed to Change
- `src/features/auth/components/login-form.tsx`
- `src/features/auth/components/login-form.test.tsx`
- `src/features/auth/components/register-form.tsx`
- `src/features/auth/components/register-form.test.tsx`
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `tasks/TASK-021.md`
- `project/TASKS.md`
- `ACTIVE_TASK.md`
- `reports/TASK-021-implementation.md`
- `reports/TASK-021-test.md`
- `reports/TASK-021-review.md`

## Files Not Allowed to Change
- `supabase/migrations/*`
- `src/generated/database.types.ts`
- `src/lib/supabase/*`
- `docs/*`
- `project/AGENTS.md`
- `project/CODEX.md`
- `project/GEMINI.md`

## Implementation Requirements
- Tái sử dụng Primitive UI Components (`Button`, `Input`, `Card`) đã xây dựng ở `TASK-003`.
- Đảm bảo tính tiếp cận Accessibility (a11y: `aria-label`, `aria-invalid`, `aria-describedby`, keyboard navigation).
- Trải nghiệm UX mượt mà với loading indicator và hiển thị lỗi thân thiện.

## API Requirements
- Tích hợp với `POST /api/auth/login` và `POST /api/auth/register`.

## Database Requirements
- Not applicable (UI layer).

## Security Requirements
- Validate và sanitize input ở client trước khi nộp.
- Không lưu password hay token trong `localStorage`/`sessionStorage`.

## UI Requirements
- Thiết kế theo tone Indigo 500 (`#6366F1`), Cyan 500 (`#06B6D4`), Slate 50/900 theo `docs/ui.md`.
- Bo góc Card `rounded-2xl`, Input & Button `rounded-lg`.
- Hiển thị responsive trên cả Mobile và Desktop.

## Tests Required
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Acceptance Criteria
- [x] Trang `/login` và `/register` hiển thị giao diện responsive, đúng design tokens trong `docs/ui.md`.
- [x] `LoginForm` validate client-side và kết nối thành công với `POST /api/auth/login`.
- [x] `RegisterForm` validate client-side (email, password, username 3–50 kí tự) và kết nối thành công với `POST /api/auth/register`.
- [x] Hiển thị thông báo lỗi và trạng thái loading trực quan, có accessible name/ARIA ổn định.
- [x] 100% Unit tests mới cho `LoginForm` và `RegisterForm` pass (12/12).
- [x] Quality gates (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`) pass 100%.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Expected Handoff
- Task packet tại `tasks/TASK-021.md`.
- Implementation report tại `reports/TASK-021-implementation.md`.
- Test report tại `reports/TASK-021-test.md`.
- Review report tại `reports/TASK-021-review.md`.
- `project/TASKS.md` và `ACTIVE_TASK.md` được cập nhật tương ứng.
