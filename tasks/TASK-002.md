# Task Packet: TASK-002 — Configure Testing Setup (Vitest & Playwright)

## Status
`DONE`

## Owner
Codex

## Reviewer
Codex (self-review; agent duy nhất)

## Feature ID
System Foundation / Testing Infrastructure

## Objective
Cấu hình khung kiểm thử đơn vị/tích hợp (Vitest + React Testing Library) và kiểm thử đầu-cuối (Playwright) theo chuẩn `docs/testing.md`, thêm npm test scripts và các file mẫu để bảo đảm Quality Gates hoạt động hoàn chỉnh.

## Dependencies
- `TASK-001` (Bootstrap Next.js & Project Config)

## Required Context
- `AGENTS.md` (repository root)
- `CODEX.md` (repository root)
- `docs/testing.md`
- `docs/coding_standards.md`

## Current State
- Dự án đã hoàn tất `TASK-001` (Next.js 15, TypeScript, Tailwind) và `TASK-010`, `TASK-010A`, `TASK-011`, `TASK-012` (Database Foundation & Clean Baseline).
- `package.json` hiện chưa có cấu hình Vitest hay Playwright và chưa có lệnh `npm run test`.

## In Scope
- Cài đặt các gói devDependencies cần thiết: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`, `@playwright/test`.
- Tạo `vitest.config.ts` với hỗ trợ path alias `@/*` và môi trường `jsdom`.
- Tạo `playwright.config.ts` cấu hình E2E test suite.
- Tạo file setup test `tests/setup.ts`.
- Thêm scripts vào `package.json`: `"test": "vitest run"`, `"test:e2e": "playwright test"`.
- Tạo 1 sample unit test tại `src/shared/utils/sample.test.ts` để kiểm thử utility cơ bản.
- Tạo 1 sample E2E test tại `tests/e2e/sample.spec.ts` để kiểm thử render trang chủ.
- Chạy và kiểm tra toàn bộ Quality Gates local.

## Out of Scope
- Không viết test case cho Supabase database hay RPC.
- Không sửa bất kỳ file SQL migration nào trong `supabase/migrations/`.
- Không tạo UI components mới ngoài phạm vi testing setup.

## Files Allowed to Change
- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `playwright.config.ts`
- `tests/setup.ts`
- `src/shared/utils/sample.test.ts`
- `tests/e2e/sample.spec.ts`
- `tasks/TASK-002.md`
- `project/TASKS.md`
- `ACTIVE_TASK.md`
- `reports/TASK-002-implementation.md`

## Files Not Allowed to Change
- `supabase/migrations/*`
- `src/app/*`
- `docs/*`
- `project/AGENTS.md`
- `project/CODEX.md`
- `project/GEMINI.md`

## Implementation Requirements
- Tuân thủ strict type checking trong tất cả các file test.
- Đảm bảo `vitest.config.ts` resolve đúng `@/` tương tự `tsconfig.json`.

## API Requirements
- Not applicable.

## Database Requirements
- Not applicable.

## Security Requirements
- Không lưu secret hay API key trong file cấu hình test hay test sample.

## UI Requirements
- Not applicable.

## Tests Required
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Acceptance Criteria
- [x] `npm run lint` pass 100% (0 warning, 0 error).
- [x] `npm run typecheck` pass 100%.
- [x] `npm run test` (Vitest) chạy thành công sample unit test.
- [x] `npm run build` pass 100%.
- [x] File `playwright.config.ts` và `tests/e2e/sample.spec.ts` được tạo đúng cấu trúc.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Expected Handoff
- Task packet ghi tại `tasks/TASK-002.md`.
- Implementation report ghi tại `reports/TASK-002-implementation.md`.
- `project/TASKS.md` và `ACTIVE_TASK.md` được cập nhật tương ứng.
