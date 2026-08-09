# Task Packet: TASK-010A — Repair Project Baseline

## Status
`VERIFIED`

## Owner
Codex

## Reviewer
Codex (self-review; agent duy nhất)

## Feature ID
System Foundation / Baseline Repair

## Objective
Khôi phục tính hợp lệ của project baseline (Quality Gates) bằng cách xóa các Supabase client file (`src/lib/supabase/admin.ts`, `client.ts`, `server.ts`) được tạo sớm khi chưa có `src/generated/database.types.ts` và hiện chưa được source code sử dụng, đảm bảo `npm run typecheck` và `npm run build` pass 100% mà không tạo type giả hay làm mất code nghiệp vụ hợp lệ.

## Dependencies
- `TASK-001` (Bootstrap Next.js & Project Config)

## Required Context
- `AGENTS.md` (repository root)
- `CODEX.md` (repository root)
- `docs/architecture.md`

## Current State
- `npm run typecheck` và `npm run build` đang thất bại do `src/lib/supabase/admin.ts`, `client.ts`, `server.ts` import `@/generated/database.types` (file chưa tồn tại, theo lộ trình nằm ở TASK-028).
- Các Supabase client này được tạo trong giai đoạn phân mảnh database (task đã retired) nhưng hiện chưa được bất kỳ component, page hay service nào trong `src/` import hay sử dụng.
- Cần dọn dẹp các file client bị lỗi typecheck khỏi baseline để tháo gỡ điểm nghẽn cho các task tiếp theo.

## In Scope
- Xóa 3 file Supabase client chưa sử dụng gây lỗi typecheck:
  - `src/lib/supabase/admin.ts`
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
- Cập nhật `tasks/TASK-010A.md`, `project/TASKS.md`, `ACTIVE_TASK.md` và tạo `reports/TASK-010A-implementation.md`.

## Out of Scope
- Không tạo file `src/generated/database.types.ts` giả hoặc dummy placeholder type `any`.
- Không chỉnh sửa hay thêm bất kỳ file SQL migration nào trong `supabase/migrations/` (bao gồm `008_create_rls_policies.sql` và `009_create_rpc_functions.sql`).
- Không chỉnh sửa hay xóa bất kỳ code nghiệp vụ hợp lệ nào trong `src/app`, `src/components`, `src/shared`.

## Files Allowed to Change
- `src/lib/supabase/admin.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `reports/TASK-010A-implementation.md`
- `tasks/TASK-010A.md`
- `project/TASKS.md`
- `ACTIVE_TASK.md`

## Files Not Allowed to Change
- `supabase/migrations/*`
- `src/generated/*`
- `src/app/*`
- `src/components/*`
- `src/shared/*`
- `docs/*`

## Implementation Requirements
- Loại bỏ triệt để các file client chưa dùng gây hỏng typecheck.
- Không tạo file type giả.
- Giữ nguyên toàn bộ cấu hình dự án và code nghiệp vụ hợp lệ.

## API Requirements
- Not applicable.

## Database Requirements
- Not applicable (không đụng vào DB migrations hay schema trong task này).

## Security Requirements
- Đảm bảo không để rò rỉ secret hay làm thay đổi cấu hình bảo mật dự án.

## UI Requirements
- Not applicable.

## Tests Required
- Chạy toàn bộ các lệnh Quality Gates:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`

## Acceptance Criteria
- [x] `npm run lint` pass 100% (0 warning, 0 error).
- [x] `npm run typecheck` pass 100% không còn lỗi missing module `@/generated/database.types`.
- [x] `npm run build` pass 100% xuất ra build bundle thành công.
- [x] Không có file `database.types.ts` giả hoặc type `any` placeholder nào được tạo.
- [x] Không có file migration nào trong `supabase/migrations/` bị thay đổi.
- [x] Không làm mất code nghiệp vụ hợp lệ.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Expected Handoff
- Task packet ghi tại `tasks/TASK-010A.md`.
- Implementation report ghi tại `reports/TASK-010A-implementation.md`.
- `project/TASKS.md` và `ACTIVE_TASK.md` được cập nhật tương ứng.
