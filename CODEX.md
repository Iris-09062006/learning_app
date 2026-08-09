# CODEX — Hướng dẫn agent toàn quyền

## Vai trò

Codex chịu trách nhiệm end-to-end cho toàn bộ vòng đời task của LearningApp: phân tích, lập kế hoạch, triển khai, viết test, chạy kiểm thử, review, sửa findings, commit và cập nhật trạng thái.

Quy tắc nền tảng nằm trong `AGENTS.md`. File này mô tả checklist thao tác cụ thể.

## Checklist khởi động task

1. Đọc `AGENTS.md`, `CODEX.md`, `ACTIVE_TASK.md` và task packet được tham chiếu.
2. Đọc Required Context và source trực tiếp liên quan.
3. Chạy `git status --short`; phân biệt thay đổi task với thay đổi có sẵn của người dùng.
4. Kiểm tra dependency và current state thay vì tin tuyệt đối vào task packet.
5. Lập kế hoạch ngắn gọn, có thể kiểm chứng.

## Checklist implementation

- Cập nhật trạng thái `IN_PROGRESS`.
- Chỉ sửa file thuộc scope; nếu task packet lỗi thời, cập nhật packet có giải thích trước khi mở rộng danh sách file.
- Tuân thủ TypeScript strict, module boundary và server/client boundary.
- Validate dữ liệu không tin cậy; server vẫn là lớp validation có thẩm quyền.
- Viết test cho happy path, validation, error state và regression liên quan.
- Không thêm dependency hoặc abstraction nếu chưa thật sự cần cho task.

## Checklist test

- Chạy required commands đúng nguyên văn khi có thể.
- Chạy test tập trung trước để phản hồi nhanh, sau đó chạy toàn bộ quality gates.
- Với UI, kiểm tra semantic HTML, label, keyboard, focus, loading và error announcement.
- Với API, kiểm tra DTO, status code, error shape, authentication và authorization.
- Với database, kiểm tra migration, constraint, generated types và RLS.
- Ghi report trung thực, bao gồm cả failure do môi trường.

## Checklist review

Review trên diff thực tế theo thứ tự:

1. Scope và file changed.
2. Correctness và edge cases.
3. Architecture/layering.
4. API/database/security contract.
5. UI/UX/accessibility.
6. Test quality và coverage.
7. Required commands và acceptance criteria.
8. Secret/credential scan.

Verdict:

- `PASS`: Không còn finding Critical/High/Medium; required gates pass.
- `FIX_REQUIRED`: Có finding có thể sửa trong scope.
- `BLOCKED`: Thiếu quyền, dependency hoặc quyết định quan trọng.

Khi `FIX_REQUIRED`, Codex tự sửa, thêm regression test nếu phù hợp, rồi lặp lại test và review. Không yêu cầu người dùng đóng vai trò cầu nối.

## Checklist commit

1. Chạy `git status --short` và `git diff --check`.
2. Rà soát `git diff` và secret/credential.
3. Stage chính xác từng file của task.
4. Kiểm tra `git diff --cached`.
5. Commit bằng Conventional Commit phù hợp.
6. Ghi commit hash vào báo cáo.
7. Không push/deploy nếu người dùng chưa yêu cầu rõ.

Nếu commit thất bại, không tuyên bố task đã commit. Nếu working tree có file ngoài scope, không stage chúng.

## Artifacts chuẩn

- `tasks/TASK-XXX.md`: Task packet.
- `reports/TASK-XXX-implementation.md`: Thay đổi và quality gates.
- `reports/TASK-XXX-test.md`: Commands, kết quả và evidence.
- `reports/TASK-XXX-review.md`: Verdict, checklist và findings.
- `ACTIVE_TASK.md`: Task và trạng thái hiện tại.
- `project/TASKS.md`: Bảng trạng thái tổng.

Owner và Reviewer đều là `Codex`. Việc cùng một agent đảm nhiệm review phải được bù bằng review trên diff thực tế, quality gates đầy đủ và report có bằng chứng.
