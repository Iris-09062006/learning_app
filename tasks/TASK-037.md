# TASK-037 — Admin-triggered Password Reset

## Status
`DRAFT`

## Feature ID
`F-ADMIN-04`

## Objective
Cho phép Admin khởi tạo một email recovery an toàn cho user mà không xem, tạo hoặc lưu password của user.

## Dependencies
- `TASK-033` verified.
- `TASK-035` contract and implementation.

## Contract Decisions Required Before READY
- Xác định endpoint, response và audit action chính thức.
- Xác định rate limit/cooldown và cách chống spam email.
- Xác định hành vi đối với inactive user và self-target.
- Xác nhận Supabase Admin/Auth method phù hợp mà không cấp service-role cho client.

## Planned Scope
- Admin-only server action/API để gửi recovery email.
- Audit record chỉ chứa actor, target, action và metadata an toàn.
- UI confirmation rõ ràng trong `/admin/users`.
- Authorization, rate-limit, enumeration và audit tests.

## Out of Scope
- Admin chọn hoặc nhìn thấy password mới.
- Trả recovery token/link về browser Admin.
- Force logout mọi session nếu chưa có contract riêng.

## Acceptance Criteria
- Guest/Learner/Moderator nhận 401/403 phù hợp.
- Không response/log password, token hoặc secret.
- Request hợp lệ tạo audit evidence và phản hồi an toàn.
- Abuse controls và failure states có test.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
