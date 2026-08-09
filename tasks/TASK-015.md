# Task Packet: TASK-015 — Apply and Verify Supabase Core Database via Supabase MCP

## Status
`DONE`

## Owner
Codex

## Reviewer
Codex (self-review; agent duy nhất)

## Feature ID
Database Foundation / Supabase MCP Execution & Verification

## Objective
Sử dụng Supabase MCP kết nối tới dự án Supabase Development (tuyệt đối không thao tác trên Production), apply chuỗi migrations 001–009 theo đúng thứ tự, nạp seed data nếu file seed tồn tại, và thực hiện xác minh toàn diện schema 11 bảng Core MVP, RLS policies, RPC functions, quyền truy cập và tính nhất quán với TypeScript database types trước khi bước vào Phase 3.

## Dependencies
- `TASK-010` (Database Migrations: Core Tables)
- `TASK-011` (Database Migrations: Core RLS Policies)
- `TASK-012` (Core Database RPC Functions)
- `TASK-014` (Supabase SSR Clients & Database Types Integration)

## Required Context
- `AGENTS.md` (repository root)
- `CODEX.md` (repository root)
- `docs/database.md`
- `docs/security.md`
- `docs/architecture.md`

## Current State
- Toàn bộ 9 file SQL migrations (`001_create_enums.sql` đến `009_create_rpc_functions.sql`) đã được tạo và lưu trong `supabase/migrations/`.
- Người dùng đã xác nhận Project Reference `yzucdzlgaucmduoghjft` (`https://yzucdzlgaucmduoghjft.supabase.co`) chính là môi trường **Development**.
- File `supabase/seed.sql` chưa tồn tại và được miễn nạp seed data cho TASK-015 theo lựa chọn của người dùng.
- `TASK-014` đã hoàn thành khai báo TypeScript database types và Supabase SSR client factories.
- Cần thực thi và xác minh trực tiếp trên môi trường Supabase Development qua Supabase MCP.

## In Scope
- Kết nối tới Supabase Development project (`yzucdzlgaucmduoghjft`) qua Supabase MCP tools.
- Thực thi toàn bộ SQL Migrations từ `001_create_enums.sql` đến `009_create_rpc_functions.sql` theo đúng thứ tự tuần tự.
- Thực thi `supabase/seed.sql` nếu file tồn tại; nếu không có thì bỏ qua bước seed.
- Xác minh sự tồn tại của đầy đủ 11 bảng Core MVP public (`profiles`, `courses`, `chapters`, `lessons`, `exercises`, `exercise_options`, `exercise_solutions`, `course_enrollments`, `user_progress`, `submissions`, `ai_explanations`).
- Xác minh 100% các bảng public đều đã được bật Row Level Security (RLS).
- Xác minh bảng `exercise_solutions` **tuyệt đối không có RLS SELECT policy nào** cho các role `anon` hoặc `authenticated`.
- Xác minh các database functions/procedures (`enroll_course`, `submit_exercise`, `has_role`) tồn tại với đúng cấu hình `SECURITY DEFINER` và `set search_path = public`.
- Đối chiếu hoặc sinh lại TypeScript Database Types (`src/generated/database.types.ts`) từ schema thực tế trên Supabase Development project để bảo đảm 100% khớp.
- Ghi rõ Project ID / Reference và Environment Name (`Development`) được thao tác trong Implementation Report.

## Out of Scope
- Tuyệt đối KHÔNG apply hoặc thao tác trên môi trường Production.
- Tuyệt đối KHÔNG tự ý chỉnh sửa schema hay RLS policies thủ công ngoài các file migrations đã được review và duyệt.
- KHÔNG triển khai bất kỳ code nghiệp vụ Auth hay API routes nào của `TASK-020` cho đến khi `TASK-015` đạt trạng thái `VERIFIED`.

## Files Allowed to Change
- `src/generated/database.types.ts` (nếu đối chiếu / sync type với DB live)
- `tasks/TASK-015.md`
- `project/TASKS.md`
- `ACTIVE_TASK.md`
- `reports/TASK-015-implementation.md`

## Files Not Allowed to Change
- `supabase/migrations/*` (Giữ nguyên chuỗi migrations đã chốt)
- `supabase/seed.sql`
- `src/app/*`
- `src/components/*`
- `docs/*`
- `project/AGENTS.md`
- `project/CODEX.md`
- `project/GEMINI.md`

## Implementation Requirements
- Thao tác trực tiếp thông qua các công cụ Supabase MCP tool (`list_tables`, `execute_sql`, v.v.).
- Đảm bảo ghi log và chụp lại kết quả xác minh (bảng, RLS, functions, security grants) vào `reports/TASK-015-implementation.md`.

## API Requirements
- Not applicable.

## Database Requirements
- Áp dụng chính xác chuỗi migrations 001–009.
- Xác minh 11 bảng public, 7 enums và 3 RPC functions.

## Security Requirements
- Xác minh khóa 100% quyền truy cập SELECT client tới `exercise_solutions`.
- Xác minh các RPC functions sở hữu thuộc tính `SECURITY DEFINER` và `set search_path = public`.

## UI Requirements
- Not applicable.

## Tests Required
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Acceptance Criteria
- [x] Supabase Development project kết nối thành công qua Supabase MCP (`yzucdzlgaucmduoghjft`).
- [x] Chạy thành công toàn bộ migrations 001–009 theo thứ tự.
- [x] Bỏ qua hoặc nạp `seed.sql` nếu tồn tại (không bắt buộc cho TASK-015).
- [x] Đủ 11 bảng Core MVP tồn tại trong schema `public`.
- [x] 100% bảng public được bật RLS.
- [x] Bảng `exercise_solutions` hoàn toàn không có RLS SELECT policy cho `anon`/`authenticated`.
- [x] Các RPC `enroll_course`, `submit_exercise` và `has_role` tồn tại đúng cấu hình security definer.
- [x] File `src/generated/database.types.ts` khớp 100% với schema DB thực tế.
- [x] Báo cáo `reports/TASK-015-implementation.md` ghi rõ Project ID / Environment đã thao tác.
- [x] Lệnh `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass 100%.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Expected Handoff
- Task packet tại `tasks/TASK-015.md`.
- Implementation report tại `reports/TASK-015-implementation.md`.
- `project/TASKS.md` và `ACTIVE_TASK.md` được cập nhật tương ứng.
