# TASK-042 — Restore Public Onboarding and Product Navigation

- **Status:** `VERIFIED`
- **Owner:** Codex
- **Reviewer:** Codex
- **Priority:** Critical hotfix

## Objective

Khôi phục luồng onboarding/public bị middleware chuyển hướng sai, thay homepage placeholder bằng landing page phản ánh LearningApp hiện tại, và bổ sung navigation chung để các màn hình chính không còn phụ thuộc vào URL trực tiếp.

## Required context

- `AGENTS.md`, `CODEX.md`
- `docs/requirements.md`
- `docs/architecture.md`
- `docs/api_contract.md`
- `docs/security.md`
- `docs/ui.md`, `docs/features.md`
- `tasks/TASK-020.md`, `tasks/TASK-021.md`, `tasks/TASK-033.md`

## Scope

- `src/lib/supabase/middleware.ts` và regression tests.
- Public landing page tại `/`.
- Shared navigation/app shell cho route group `(main)`.
- Task registry, reports và trạng thái task liên quan.
- Xác minh trung thực trạng thái env và Supabase local; không tạo secret giả.

## Access matrix

- Public pages: `/`, `/login`, `/register`, `/courses`, `/courses/:courseId`.
- Public API: mọi Route Handler tiếp tục đi qua delivery/service của chính endpoint và không bị middleware đổi thành HTML redirect; endpoint riêng tư phải trả JSON `401/403` theo contract.
- Protected pages: mọi page khác do middleware bảo vệ; service/page vẫn giữ session/role checks làm lớp authoritative.

## Acceptance criteria

1. Guest nhận response bình thường từ `/register`, `POST /api/auth/login` và `GET /api/system/health`; không còn `307 /login`.
2. Guest có thể mở landing page, course catalog và course detail; page riêng tư vẫn redirect về `/login` với `next` an toàn.
3. API không bị middleware redirect sang page; authentication/authorization vẫn do endpoint/service thực thi.
4. Homepage mô tả đúng sản phẩm học Python theo lộ trình, bài tập tương tác và AI Mentor.
5. Navigation responsive dẫn tới các màn hình phù hợp; mục moderator/admin chỉ hiện theo role.
6. Có regression tests cho route policy và navigation.
7. `lint`, `typecheck`, `test`, `build` pass; smoke test xác minh status/redirect thực tế nếu dev server chạy được.

## Required commands

```text
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

## Known environment limits

- `.env.local` chưa có `SUPABASE_SERVICE_ROLE_KEY` và `AI_API_KEY`; admin privileged operations và AI provider thật không thể integration-test đầy đủ.
- Docker/Supabase local chưa khả dụng, nên migration integration test được ghi nhận là giới hạn môi trường thay vì giả lập kết quả pass.
