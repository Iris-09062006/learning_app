# Task Packet: TASK-003 — Primitive UI Components Foundation

## Status
`DONE`

## Owner
Codex

## Reviewer
Codex (self-review; agent duy nhất)

## Feature ID
UI System / Primitive Components

## Objective
Xây dựng bộ Primitive UI Components cơ bản (`Button`, `Input`, `Card`, `Badge`) tuân thủ `docs/ui.md`, hỗ trợ custom styling qua helper `cn()`, hỗ trợ accessibility (a11y), kèm theo unit tests bằng Vitest và React Testing Library.

## Dependencies
- `TASK-001` (Bootstrap Next.js & Project Config)
- `TASK-002` (Configure Testing Setup)

## Required Context
- `AGENTS.md` (repository root)
- `CODEX.md` (repository root)
- `docs/ui.md`
- `docs/coding_standards.md`
- `docs/architecture.md`

## Current State
- Dự án đã hoàn tất setup Next.js 15, Tailwind CSS, TypeScript strict mode, Vitest và Playwright testing setup.
- Thư viện `clsx` và `tailwind-merge` đã sẵn sàng trong `package.json`.
- Hiện tại chưa có các primitive UI components reusable trong `src/components/ui/` và chưa có helper `cn()`.

## In Scope
- Tạo utility helper `cn()` (`clsx` + `tailwind-merge`) tại `src/shared/utils/cn.ts` (hoặc `src/lib/utils.ts`).
- Tạo component `Button` (`src/components/ui/button.tsx`):
  - Hỗ trợ các variants: `primary`, `secondary`, `outline`, `ghost`, `danger`.
  - Hỗ trợ các sizes: `sm`, `md`, `lg`.
  - Hỗ trợ `isLoading` state (hiển thị spinner, disable click, giữ nguyên kích thước nút) và `disabled` state.
  - Tích hợp `className` tùy biến qua `cn()`.
- Tạo component `Input` (`src/components/ui/input.tsx`):
  - Hỗ trợ `label`, `error` message, `helperText`, `disabled` state, focus ring tương phản cao.
  - Hỗ trợ thuộc tính `aria-invalid` và `aria-describedby` cho accessibility.
  - Tích hợp `className` tùy biến qua `cn()`.
- Tạo component `Card` (`src/components/ui/card.tsx`):
  - Hỗ trợ cấu trúc compound sub-components: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
  - Sử dụng thiết kế bo góc `rounded-2xl` (16px) hoặc `rounded-xl` (12px) và viền Slate (`slate-200`) theo chuẩn `docs/ui.md`.
- Tạo component `Badge` (`src/components/ui/badge.tsx`):
  - Hỗ trợ các status variants: `default`, `success`, `error`, `warning`, `ai`, `outline`.
  - Thiết kế bo góc `rounded-full` (status pill) theo `docs/ui.md`.
- Viết Unit Tests đầy đủ cho 4 components:
  - `src/components/ui/button.test.tsx`
  - `src/components/ui/input.test.tsx`
  - `src/components/ui/card.test.tsx`
  - `src/components/ui/badge.test.tsx`
- Chạy và kiểm tra 100% Quality Gates.

## Out of Scope
- Không cài đặt các thư viện UI nặng (như Shadcn CLI đầy đủ) để giữ codebase gọn nhẹ.
- Không xây dựng các layout phức tạp hay business components của Phase 3/4.
- Không chỉnh sửa file backend, Supabase hay database migration.

## Files Allowed to Change
- `package.json` (nếu cần thêm icons hoặc helper)
- `package-lock.json`
- `src/shared/utils/cn.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/button.test.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/input.test.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/card.test.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/badge.test.tsx`
- `tasks/TASK-003.md`
- `project/TASKS.md`
- `ACTIVE_TASK.md`
- `reports/TASK-003-implementation.md`

## Files Not Allowed to Change
- `supabase/migrations/*`
- `src/app/*`
- `docs/*`
- `project/AGENTS.md`
- `project/CODEX.md`
- `project/GEMINI.md`

## Implementation Requirements
- 100% components phải mở rộng đúng React HTML Attributes chuẩn (như `React.ButtonHTMLAttributes<HTMLButtonElement>`, `React.InputHTMLAttributes<HTMLInputElement>`).
- Sử dụng đúng màu sắc và tokens quy định tại `docs/ui.md` (Indigo 500/600 cho Primary, Emerald 500 cho Success, Cyan 500/50 cho AI Accent, Red 500 cho Error).
- Tuân thủ strict type checking trong TypeScript.

## API Requirements
- Not applicable.

## Database Requirements
- Not applicable.

## Security Requirements
- Đảm bảo các component không chứa secret hay lộ thông tin nhạy cảm.

## UI Requirements
- Thiết kế Button & Input có `rounded-lg` (8px), Card có `rounded-2xl` (16px), Badge có `rounded-full`.
- Hỗ trợ focus ring rõ ràng khi dùng bàn phím (`focus-visible:ring-2 focus-visible:ring-indigo-500`).

## Tests Required
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Acceptance Criteria
- [x] Helper `cn()` ghép Tailwind classes chuẩn xác mà không bị trùng lặp style.
- [x] `Button` component hỗ trợ 5 variants (`primary`, `secondary`, `outline`, `ghost`, `danger`), 3 sizes, loading state và disabled state.
- [x] `Input` component hỗ trợ label, error text, helper text, focus ring và các thuộc tính accessibility.
- [x] `Card` component kèm các sub-components (`Header`, `Title`, `Description`, `Content`, `Footer`) render đúng cấu trúc.
- [x] `Badge` component hỗ trợ các trạng thái `default`, `success`, `error`, `warning`, `ai`.
- [x] 100% unit tests trong `src/components/ui/*.test.tsx` pass.
- [x] Lệnh `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass 100%.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Expected Handoff
- Task packet tại `tasks/TASK-003.md`.
- Implementation report tại `reports/TASK-003-implementation.md`.
- `project/TASKS.md` và `ACTIVE_TASK.md` được cập nhật tương ứng.
