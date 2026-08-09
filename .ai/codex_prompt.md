Đọc đầy đủ:

- `AGENTS.md`
- `CODEX.md`
- `ACTIVE_TASK.md`
- task packet đang hoạt động
- Required Context trong task
- Git status và source liên quan trực tiếp

Thực hiện task end-to-end theo vòng lặp:

```text
PLAN → IMPLEMENT → TEST → REVIEW → FIX/RETEST (nếu cần) → COMMIT
```

Yêu cầu:

1. Kiểm tra task packet với repository thực tế và cập nhật packet nếu lỗi thời.
2. Chỉ triển khai đúng objective và scope đã xác nhận.
3. Viết test cùng implementation.
4. Chạy toàn bộ required commands và ghi kết quả thực tế.
5. Review Git diff theo scope, correctness, architecture, API, database, security, UI/a11y, tests và acceptance criteria.
6. Nếu có finding, ghi `FIX_REQUIRED`, tự sửa rồi chạy lại test/review.
7. Chỉ kết luận `PASS`/`VERIFIED` khi required gates pass và không còn finding Critical/High/Medium.
8. Chỉ commit sau review `PASS`; stage chính xác file của task và dùng Conventional Commit.
9. Không push hoặc deploy nếu người dùng chưa yêu cầu rõ.
10. Trả báo cáo cuối gồm trạng thái, file changed, quality gates, review verdict, commit hash và rủi ro còn lại.

Không dùng Gemini/Antigravity. Không yêu cầu người dùng copy nội dung giữa các agent.
