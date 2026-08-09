# TASK-038 — Security and RLS Regression Hardening

## Status
`PLANNED`

## Phase
Phase 7

## Objective
Tạo bằng chứng release-grade cho authentication, authorization, RLS, server-only data và abuse controls; sửa mọi finding Critical/High/Medium trong scope.

## Dependencies
- Các feature READY được chọn cho release candidate đã verified.
- Supabase local test environment có thể reset/seed độc lập với Production.

## Required Context
- `docs/security.md`
- `docs/testing.md` — integration/RLS strategy
- `docs/database.md` — RLS policies and grants
- `docs/api_contract.md` — access matrix and rate limits
- All private route handlers and privileged repositories/RPCs

## In Scope
- Lập route access matrix và audit mọi private handler có authoritative auth/active-user/role check.
- Xác minh user đã bị deactivate bị từ chối ở request riêng tư kế tiếp, không chỉ ở lần login mới.
- Integration tests chứng minh cross-user isolation cho profiles, enrollments, progress, submissions và AI explanations.
- Chứng minh `exercise_solutions` không đọc được bởi anon/authenticated client.
- Role regression cho moderation, generation, admin và audit data.
- Kiểm tra toàn bộ public tables đã bật RLS và privileged RPC grants hẹp quyền.
- Triển khai/kiểm thử rate limits bắt buộc cho login, register, AI explanation và moderation mutations/publish theo contract bảo mật nghiêm hơn.
- Secret/client-bundle scan, unsafe render scan và service-role import boundary test.

## Out of Scope
- Production database changes or credential rotation.
- Penetration test bởi bên thứ ba.
- Push/deploy.

## Acceptance Criteria
- Security checklist trong `docs/security.md` có evidence cho từng mục.
- Tests dùng local/isolated data, không chạm Staging/Production.
- Không còn finding Critical/High/Medium.
- Rate limit trả 429 theo contract và không phụ thuộc state chỉ nằm trong một process nếu target deployment cần distributed enforcement.

## Required Commands
- Local Supabase reset/start commands được packet implementation khóa theo môi trường thực tế
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
