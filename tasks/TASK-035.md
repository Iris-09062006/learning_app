# TASK-035 — Self-service Password Recovery

## Status
`BLOCKED` — blockers được ghi tại `reports/TASK-035-blocked.md`

## Feature ID
`F-AUTH-04`

## Objective
Cung cấp luồng quên mật khẩu và đặt mật khẩu mới qua Supabase Auth mà không tiết lộ tài khoản tồn tại hay đưa credential vào database ứng dụng.

## Dependencies
- `TASK-020` and `TASK-021` verified.

## Required Context
- `docs/features.md` — F-AUTH-04
- `docs/architecture.md` — Supabase Auth boundary
- `docs/security.md` — authentication, rate limiting and secrets
- `docs/api_contract.md`
- Supabase SSR recovery semantics used by the installed version

## Contract Decisions Required Before READY
- Khóa route/API names cho request recovery và update password.
- Khóa allowlist của recovery redirect URL cho local, Preview và Production.
- Chọn server-mediated hay Supabase SSR callback/session flow.
- Quy định rate limit, generic response chống account enumeration và hành vi với inactive user.

Không tự thêm endpoint trước khi các quyết định trên được ghi vào source of truth.

## Planned Scope
- Forgot-password form và generic success state.
- Recovery callback/session validation.
- Reset-password form với policy hiện có và session invalid/expired state.
- Rate limiting, safe logging và tests không gọi email provider thật.

## Out of Scope
- Lưu password/reset token trong `profiles` hoặc bảng ứng dụng.
- Admin đặt một password cụ thể cho user.
- Email template branding ngoài cấu hình tối thiểu cần cho flow.

## Acceptance Criteria
- Response không xác nhận email có tồn tại hay không.
- Redirect chỉ dùng origin được allowlist.
- Token hết hạn/sai bị từ chối an toàn; password mới tuân policy.
- Không log password, token, cookie hoặc recovery URL chứa token.
- Tests bao phủ abuse, invalid session, happy path và error states.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
