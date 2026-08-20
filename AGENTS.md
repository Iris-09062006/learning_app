# AGENTS — Quy tắc vận hành dự án

## 1. Phạm vi và trách nhiệm

Tài liệu này là quy tắc agent cấp repository cho dự án **LearningApp**.

**Codex là agent chính và duy nhất**, đồng thời đảm nhiệm:

- Planner và Architect.
- Implementer và Bug Fixer.
- Test Writer và Tester.
- Reviewer và Security Reviewer.
- Orchestrator và người quản lý trạng thái task.

Không sử dụng Gemini/Antigravity và không yêu cầu người dùng chuyển prompt hoặc report giữa nhiều agent.

## 2. Source of truth

Áp dụng theo thứ tự ưu tiên:

1. Yêu cầu rõ ràng, hiện tại của người dùng.
2. `AGENTS.md` và `CODEX.md` tại repository root.
3. `ACTIVE_TASK.md` và task packet đang hoạt động.
4. `docs/requirements.md`.
5. `docs/architecture.md`.
6. `docs/database.md`.
7. `docs/api_contract.md`.
8. `docs/security.md`.
9. `docs/coding_standards.md`.
10. `docs/ui.md`, `docs/features.md` và `docs/decisions.md`.

Không tự thêm bảng, cột, enum, endpoint, role hoặc thay đổi contract khi không có căn cứ trong yêu cầu hay source of truth. Không viết lại `docs/requirements.md` chỉ để hợp thức hóa implementation.

## 3. Vòng lặp bắt buộc

Mỗi task được xử lý xuyên suốt:

```text
PLAN → IMPLEMENT → TEST → REVIEW → FIX/RETEST (nếu cần) → COMMIT
```

### PLAN

- Đọc `ACTIVE_TASK.md`, task packet, Required Context và source liên quan.
- Kiểm tra dependencies, Git status và trạng thái repository thực tế.
- Xác nhận objective, scope, file được phép sửa, acceptance criteria và required commands.
- Nếu task packet thiếu hoặc lỗi thời, cập nhật nó trước khi implement mà không tự mở rộng sản phẩm.
- Chuyển task sang `IN_PROGRESS` khi bắt đầu thay đổi.

### IMPLEMENT

- Chỉ triển khai nội dung in-scope.
- Giữ đúng architecture, API, database và security contract.
- Viết hoặc cập nhật test cùng implementation.
- Bảo toàn mọi thay đổi không liên quan đang có trong working tree.

### TEST

- Chạy toàn bộ required commands của task.
- Quality gates mặc định cho thay đổi code là `lint`, `typecheck`, `test`, `build` nếu project hỗ trợ.
- Không xóa, skip, làm yếu assertion hoặc che lỗi để tạo kết quả pass giả.
- Ghi Test Report với command và kết quả thực tế.

### REVIEW

- Review Git diff thực tế, không chỉ dựa vào Implementation Report.
- Kiểm tra scope, correctness, architecture, API, database, security, UI/a11y, tests và acceptance criteria.
- Finding phải có severity, file, evidence, expected behavior, required fix và regression test khi phù hợp.
- Codex tự sửa findings rồi chạy lại TEST và REVIEW cho đến khi `PASS` hoặc thực sự `BLOCKED`.
- Chỉ chuyển `VERIFIED` khi không còn finding Critical/High/Medium và mọi gate bắt buộc đã pass.

### COMMIT

- Chỉ commit sau review `PASS`.
- Trước commit phải chạy `git status`, `git diff --check`, kiểm tra staged diff và rà soát secret.
- Stage chính xác file thuộc task; không dùng `git add .` khi working tree có thay đổi ngoài scope.
- Dùng Conventional Commits và ghi đúng mục đích task.
- Không force-push, không `git reset --hard`.
- Commit không đồng nghĩa với push/deploy. Chỉ push hoặc deploy khi người dùng yêu cầu rõ.

## 4. Trạng thái task

- `DRAFT`: Chưa đủ thông tin.
- `READY`: Có thể bắt đầu.
- `IN_PROGRESS`: Đang plan/implement/test.
- `READY_FOR_REVIEW`: Implementation và test hoàn tất.
- `FIX_REQUIRED`: Review có finding phải sửa.
- `FIXED_FOR_REVIEW`: Finding đã sửa, chờ review lại.
- `VERIFIED`: Review `PASS`, quality gates đạt.
- `DONE`: Điều kiện hoàn tất/merge/push được quy định đã đạt.
- `BLOCKED`: Không thể tiếp tục an toàn.

Codex được tự chuyển trạng thái dựa trên bằng chứng và phải cập nhật đồng bộ task packet, `project/TASKS.md`, `ACTIVE_TASK.md` cùng report liên quan.

## 5. Quy tắc an toàn

- Không hardcode, log hoặc commit password, secret, credential, access token hay API key.
- Không import Supabase service-role/admin client vào Client Component.
- Không gọi AI provider trực tiếp từ browser.
- Không đưa `exercise_solutions` hoặc dữ liệu chỉ dành cho server ra client.
- Không bypass authentication, authorization hay RLS.
- Không dùng TypeScript `any` hoặc tắt rule để che lỗi.
- Không ghi đè thay đổi không liên quan của người dùng.
- Không thực hiện thao tác phá hủy hoặc khó phục hồi ngoài phạm vi yêu cầu.

## 6. Điều kiện BLOCKED

Chỉ báo `BLOCKED` sau khi đã kiểm tra các phương án an toàn trong phạm vi, khi:

- Thiếu quyết định sản phẩm quan trọng và không thể suy ra từ source of truth.
- Contract hoặc tài liệu mâu thuẫn theo cách ảnh hưởng đáng kể đến hành vi.
- Cần quyền ghi, dependency hoặc dịch vụ bên ngoài chưa có.
- Required gate thất bại do lỗi ngoài phạm vi task và không thể khắc phục an toàn.
- Có nguy cơ rò rỉ secret hoặc dữ liệu bảo mật.

Blocker phải ghi rõ nguyên nhân, bằng chứng, phần đã hoàn thành và hành động cần thiết tiếp theo.

## 7. Báo cáo

Kết quả task phải có:

- Outcome và trạng thái cuối.
- Files changed.
- Quality gates và kết quả thực tế.
- Review verdict và findings đã xử lý.
- Commit hash nếu đã commit.
- Rủi ro, giới hạn hoặc blocker còn lại.

Không tuyên bố command đã pass nếu chưa chạy. Không nhắc người dùng chuyển công việc sang Gemini hay agent khác.

## 8. Note

nếu muốn dùng lệnh ghép thì dùng ";" thay vì "&&"
When inspecting files on Windows PowerShell:

- Do not combine Git commands and file-search commands into one long semicolon-separated command.
- Do not redirect probe output to temporary files unless necessary.
- Run git grep and Select-String as separate commands.
- Treat git grep exit code 1 as "no matches", not as a command failure.
- Print an explicit completion marker with Write-Output.
- Do not retry a completed search command automatically.