# TASK-035 — Blocker Report

## Result

`BLOCKED` — không thể triển khai an toàn trong phạm vi task. Run này kết thúc ở PLAN phase; không có IMPLEMENT / TEST / REVIEW.

## Outcome

Không có implementation hay code change nào được tạo. Hệ thống hiện tại không có route/API, form, callback hay test nào liên quan đến password recovery — và điều đó là đúng theo packet, vì packet cấm tự thêm endpoint trước khi khóa contract.

## Nguyên nhân (Cause)

`tasks/TASK-035.md` đang ở trạng thái `DRAFT` và phần **Contract Decisions Required Before READY** liệt kê 4 quyết định bắt buộc phải được ghi vào source of truth trước khi chuyển `READY`. Packet ghi rõ:

> "Không tự thêm endpoint trước khi khi các quyết định trên được ghi vào source of truth."

Cả 4 quyết định đều chưa được khóa trong source of truth:

1. **Route/API names** cho request recovery và update password — không có trong `docs/api_contract.md` hay `docs/features.md`.
2. **Allowlist recovery redirect URL** cho local/Preview/Production — không có trong `docs/security.md` hay `docs/deployment.md` (`docs/deployment.md` không xác định production origin).
3. **Flow**: server-mediated hay Supabase SSR callback/session — không có trong `docs/architecture.md`.
4. **Rate limit, generic response chống account enumeration và hành vi với inactive user** — không có trong `docs/security.md` hay `docs/api_contract.md`.

Một quyết định trọng yếu khác (redirect allowlist) phụ thuộc production domain — thông tin nằm ngoài phạm vi task và không thể suy ra an toàn từ source of truth hiện có.

## Bằng chứng (Evidence)

- `tasks/TASK-035.md` — status `DRAFT`; mục "Contract Decisions Required Before READY" (4 mục chưa được giải quyết); câu cấm tự thêm endpoint.
- `project/TASKS.md` — TASK-035 nằm ở **Draft / Deferred Queue** với blocker ghi sẵn: "Password recovery API/callback contract chưa được khóa".
- `ACTIVE_TASK.md` — queue hiện tại: active = None, next task = `TASK-036` (`READY`); TASK-035 không được chọn làm task triển khai tiếp theo.
- Rà soát `docs/features.md`, `docs/architecture.md`, `docs/security.md`, `docs/api_contract.md`, `docs/deployment.md` — không chứa 4 quyết định nêu trên.
- `project/TASKS.md` mục Verified — `TASK-020` và `TASK-021` đã `VERIFIED` (dependency của TASK-035 thỏa; không phải blocker).

## Phần đã hoàn thành (Completed portion)

- PLAN phase hoàn tất: đã đọc `AGENTS.md`, `CODEX.md`, `ACTIVE_TASK.md`, `tasks/TASK-035.md`, task registry và source of truth liên quan.
- Đã xác nhận dependency `TASK-020` / `TASK-021` verified — không phải blocker.
- Đã xác nhận repository đã chủ động đưa TASK-035 vào Draft/Deferred Queue và chọn `TASK-036` làm task tiếp theo.
- Chưa có IMPLEMENT / TEST / REVIEW — không tạo code, endpoint, form hay test vì bị chặn ở PLAN bởi contract chưa khóa.

## Hành động cần thiết tiếp theo (Required next actions)

1. Người giữ quyết định sản phẩm khóa 4 contract decision và ghi vào source of truth:
   - Route/API names cho request recovery và update password (vào `docs/api_contract.md`).
   - Allowlist recovery redirect URL cho local/Preview/Production (cần production origin).
   - Chọn flow: server-mediated hay Supabase SSR callback/session (vào `docs/architecture.md`).
   - Rate limit cụ thể, generic response chống enumeration, hành vi với inactive user (vào `docs/security.md` và `docs/api_contract.md`).
2. Cập nhật `tasks/TASK-035.md`: điền các quyết định, chuyển Status `READY` khi đủ.
3. Khi `READY`, chạy lại vòng lặp PLAN → IMPLEMENT → TEST → REVIEW → COMMIT với đầy đủ required commands (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`).

## Không phải blocker

- Thiếu quyền ghi, dependency hoặc dịch vụ bên ngoài: không.
- Lỗi required gate: không — không có quality gate nào được chạy vì không có code change cần gate.

## Commit

- Commit `55ceb9d` (`docs(task-035): mark TASK-035 as BLOCKED pending contract decisions`) chứa cập nhật trạng thái blocker: `tasks/TASK-035.md`, `project/TASKS.md`, `reports/TASK-035-blocked.md`.
