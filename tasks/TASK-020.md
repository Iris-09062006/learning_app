# Task Packet: TASK-020 — Authentication Service & API Handlers

## Status
`VERIFIED`

## Owner
Codex

## Reviewer
Codex (self-review; agent duy nhất)

## Feature ID
Auth & User Foundation / Authentication API Handlers

## Objective
Triển khai Auth Feature Service (`src/features/auth/auth.service.ts`), Session helper (`src/lib/auth/session.ts`), và 4 Next.js Route Handlers (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) tuân thủ đúng `docs/architecture.md` (Mục 3.3 feature modules layout), `docs/api_contract.md` (Mục 8) và `docs/security.md`, kèm theo đầy đủ Unit Tests.

## Dependencies
- `TASK-015` (Apply & Verify Supabase Database via Supabase MCP)

## Required Context
- `AGENTS.md` (repository root)
- `CODEX.md` (repository root)
- `docs/api_contract.md`
- `docs/architecture.md`
- `docs/security.md`
- `docs/coding_standards.md`

## Current State
- Phase 2 (Database Foundation) đã hoàn tất: 11 bảng Core MVP, 7 enums, RLS policies, RPC functions đã được apply và verify live qua Supabase MCP.
- `src/lib/supabase/` đã có `client.ts`, `server.ts`, `admin.ts` với đầy đủ generic `<Database>`.
- Đã giải quyết xung đột vị trí file theo kiến trúc chuẩn: Auth Service chuyển về `src/features/auth/auth.service.ts`.

## In Scope
- Tạo Auth Feature Module tại `src/features/auth/`:
  - `src/features/auth/auth.service.ts`: xử lý logic `register`, `login`, `logout`, `getCurrentUser`.
  - `src/features/auth/auth.types.ts`: khai báo kiểu dữ liệu nội bộ của auth feature.
  - `src/features/auth/auth.schema.ts`: khai báo validation schema cho Auth request/response.
- Tạo Session Helper tại `src/lib/auth/session.ts` export async helpers:
  - `requireUser()`: lấy session user đã đăng nhập hoặc ném lỗi/trả UNAUTHENTICATED.
  - `getOptionalUser()`: lấy session user nếu có, hoặc trả `null`.
- Tạo 4 Next.js Route Handlers:
  - `src/app/api/auth/register/route.ts` (`POST /api/auth/register`)
  - `src/app/api/auth/login/route.ts` (`POST /api/auth/login`)
  - `src/app/api/auth/logout/route.ts` (`POST /api/auth/logout`)
  - `src/app/api/auth/me/route.ts` (`GET /api/auth/me`)
- Viết Unit Tests đầy đủ cho Auth Service, Session helper & Route Handlers tại:
  - `src/features/auth/auth.service.test.ts`
  - `src/lib/auth/session.test.ts`
  - `src/app/api/auth/auth-routes.test.ts` (hoặc test files tương ứng)

## Out of Scope
- KHÔNG tạo Auth UI Pages (Form đăng nhập / đăng ký UI sẽ do `TASK-021` đảm nhận).
- KHÔNG sửa đổi database schema, migrations hay `src/generated/database.types.ts`.
- KHÔNG tạo OAuth / Social Login providers trong MVP scope.
- KHÔNG tạo Admin User Management UI (`TASK-054`).

## Files Allowed to Change
- `src/features/auth/auth.service.ts`
- `src/features/auth/auth.service.test.ts`
- `src/features/auth/auth.types.ts`
- `src/features/auth/auth.schema.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/session.test.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/auth-routes.test.ts`
- `tasks/TASK-020.md`
- `project/TASKS.md`
- `ACTIVE_TASK.md`
- `reports/TASK-020-implementation.md`

## Files Not Allowed to Change
- `supabase/migrations/*`
- `src/generated/database.types.ts`
- `src/components/*`
- `docs/*`
- `project/AGENTS.md`
- `project/CODEX.md`
- `project/GEMINI.md`

## Implementation Requirements
- Route Handlers tuân thủ giao thức response chuẩn (`ApiSuccess<T>` hoặc `ApiFailure`) theo `docs/api_contract.md`.
- Validate input cẩn thận bằng schema trước khi xử lý logic.
- Xử lý lỗi tập trung, map đúng HTTP status codes (400 `VALIDATION_ERROR`, 401 `UNAUTHENTICATED`, 500 `DATABASE_ERROR`/`INTERNAL_ERROR`).
- Tuyệt đối không để lộ password hash, API key hay raw Supabase errors ra client.

## API Requirements
- `POST /api/auth/register`: nhận `{ email, password, username }`, trả `{ success: true, data: { user: { id, email, username, role: "learner" }, requiresEmailConfirmation: boolean } }`.
- `POST /api/auth/login`: nhận `{ email, password }`, thiết lập session cookie qua Supabase SSR client, trả `{ success: true, data: { user: { id, email, username, role, isActive } } }`.
- `POST /api/auth/logout`: xóa session cookie, trả `{ success: true, data: { loggedOut: true } }`.
- `GET /api/auth/me`: lấy user từ session, trả `{ success: true, data: { id, email, username, role, isActive } }` hoặc HTTP 401 nếu chưa đăng nhập.

## Database Requirements
- Sử dụng `profiles` table để lấy / truy vấn `username`, `role` (`learner`, `moderator`, `admin`).
- Không tạo thêm bảng hay thay đổi schema DB.

## Security Requirements
- `requireUser()` lấy thông tin user trực tiếp từ session Supabase Auth đã được xác thực ở server (không tin tưởng `userId` truyền từ client).
- Cookie session được quản lý an toàn qua `@supabase/ssr`.

## UI Requirements
- Not applicable (API & Service layer only).

## Tests Required
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Acceptance Criteria
- [x] Auth Feature Service (`src/features/auth/auth.service.ts`) được xây dựng hoàn chỉnh với đủ phương thức `register`, `login`, `logout`, `getCurrentUser`.
- [x] Session helper (`src/lib/auth/session.ts`) triển khai hàm `requireUser()` và `getOptionalUser()` từ Supabase SSR Server Client.
- [x] 4 Route Handlers (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) hoạt động chuẩn theo API contract.
- [x] Reponse dạng JSON tuân thủ chuẩn `ApiSuccess<T>` / `ApiFailure` và map đúng error codes (`VALIDATION_ERROR`, `UNAUTHENTICATED`, etc.).
- [x] 100% Unit tests mới cho service, session helper và routes pass.
- [x] Quality gates (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`) pass 100%.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Expected Handoff
- Task packet tại `tasks/TASK-020.md`.
- Implementation report tại `reports/TASK-020-implementation.md`.
- `project/TASKS.md` và `ACTIVE_TASK.md` được cập nhật tương ứng.
