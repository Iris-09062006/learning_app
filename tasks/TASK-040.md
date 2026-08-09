# TASK-040 — Performance and Release Readiness

## Status
`PLANNED`

## Phase
Phase 7

## Objective
Đóng gói bằng chứng performance và checklist phát hành để release candidate có thể deploy an toàn ở một task được ủy quyền riêng.

## Dependencies
- `TASK-039` verified.

## Required Context
- `docs/deployment.md`
- `docs/security.md`
- `docs/testing.md`
- `docs/architecture.md`
- `.github/workflows/ci.yml`
- `.env.example`, migrations and build configuration

## In Scope
- Đo baseline cho landing, catalog, roadmap, lesson, dashboard và admin/moderation pages phù hợp role.
- Review bundle/client boundaries, request waterfalls, query pagination và obvious N+1 behavior.
- Sửa regression performance có bằng chứng và nằm trong scope.
- Xác minh CI chứa required gates; quyết định có đưa deterministic E2E vào CI hay tách job có service dependencies.
- Đồng bộ documentation drift đã có bằng chứng, tối thiểu health route `/api/system/health` và moderation UI route `/moderation`, mà không thay đổi contract nghiệp vụ đã verified.
- Hoàn thiện environment, migration order, rollback và post-deploy smoke runbook.
- Chạy full gates và tạo release-readiness report.

## Out of Scope
- Push, Preview deployment hoặc Production deployment.
- Thay đổi infrastructure/hosting account.
- Áp migration lên external database.

## Acceptance Criteria
- Performance report ghi tool, environment, before/after và ngưỡng đã thống nhất; không tuyên bố số liệu chưa đo.
- Release checklist chỉ rõ mọi biến môi trường theo public/secret boundary.
- Migration/rollback/smoke steps có thể thực thi mà không dùng Production data cho test.
- Full quality gates pass và review verdict PASS.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `git diff --check`
