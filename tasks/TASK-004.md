# Task Packet: TASK-004 — CI Quality Gates Workflow (GitHub Actions)

## Status
`DONE`

## Owner
Codex

## Reviewer
Codex (self-review; agent duy nhất)

## Feature ID
System Foundation / CI Quality Gates

## Objective
Cấu hình GitHub Actions CI Workflow (`.github/workflows/ci.yml`) tự động kích hoạt khi push hoặc pull_request vào branch `main`, chạy 4 quality gates (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`), bảo đảm chất lượng mã nguồn dự án luôn được kiểm tra tự động.

## Dependencies
- `TASK-001` (Bootstrap Next.js & Project Config)
- `TASK-002` (Configure Testing Setup)
- `TASK-003` (Primitive UI Components Foundation)

## Required Context
- `AGENTS.md` (repository root)
- `CODEX.md` (repository root)
- `docs/testing.md`
- `docs/coding_standards.md`
- `docs/project.md`

## Current State
- Dự án đã hoàn tất setup Next.js 15, Vitest, Playwright, Primitive UI Components và các npm test scripts (`lint`, `typecheck`, `test`, `build`).
- Thư mục `.github/workflows/` hiện chưa tồn tại trong repository.

## In Scope
- Tạo thư mục `.github/workflows/`.
- Tạo file workflow `.github/workflows/ci.yml`:
  - Lắng nghe sự kiện `push` và `pull_request` tới branch `main`.
  - Thiết lập môi trường chạy `ubuntu-latest` với Node.js `20.x`.
  - Cấu hình `actions/checkout@v4` và `actions/setup-node@v4` (bật cache `npm`).
  - Chạy `npm ci` để cài đặt dependencies sạch.
  - Thực thi tuần tự 4 Quality Gates bắt buộc:
    1. `npm run lint`
    2. `npm run typecheck`
    3. `npm run test`
    4. `npm run build`
- Chạy thử và kiểm tra toàn bộ Quality Gates local.

## Out of Scope
- Không cấu hình deployment tự động lên Vercel/Production (phạm vi của TASK-063).
- Không cấu hình các dịch vụ phụ trợ như Supabase CLI hay Docker runner trong CI workflow ở task này.

## Files Allowed to Change
- `.github/workflows/ci.yml`
- `tasks/TASK-004.md`
- `project/TASKS.md`
- `ACTIVE_TASK.md`
- `reports/TASK-004-implementation.md`

## Files Not Allowed to Change
- `supabase/migrations/*`
- `src/*`
- `docs/*`
- `project/AGENTS.md`
- `project/CODEX.md`
- `project/GEMINI.md`

## Implementation Requirements
- Cú pháp YAML chuẩn GitHub Actions workflow specification.
- Sử dụng GitHub Actions chính thức và bảo mật: `actions/checkout@v4`, `actions/setup-node@v4`.
- Đảm bảo thiết lập `cache: 'npm'` để tối ưu thời gian chạy trên GitHub Actions.

## API Requirements
- Not applicable.

## Database Requirements
- Not applicable.

## Security Requirements
- Không lưu secret, API key hay token cá nhân vào file workflow `.github/workflows/ci.yml`.

## UI Requirements
- Not applicable.

## Tests Required
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Acceptance Criteria
- [x] File `.github/workflows/ci.yml` được tạo với cấu pháp YAML hợp lệ.
- [x] Workflow kích hoạt khi push hoặc pull_request đến branch `main`.
- [x] Workflow sử dụng Node.js 20.x với `npm ci` và cache.
- [x] Workflow khai báo đầy đủ 4 bước kiểm tra Quality Gates (`lint`, `typecheck`, `test`, `build`).
- [x] Lệnh local `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass 100%.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Expected Handoff
- Task packet tại `tasks/TASK-004.md`.
- Implementation report tại `reports/TASK-004-implementation.md`.
- `project/TASKS.md` và `ACTIVE_TASK.md` được cập nhật tương ứng.
