# Implementation Report — TASK-015

## Status
READY_FOR_REVIEW

## Task
TASK-015: Apply and Verify Supabase Core Database via Supabase MCP

## Summary of Changes
- Đã kết nối Supabase MCP tới project Development được người dùng xác nhận.
- Đã apply nguyên trạng 9 migrations `001_create_enums` đến `009_create_rpc_functions` theo đúng thứ tự.
- Đã bỏ qua seed theo Task Packet vì `supabase/seed.sql` không tồn tại và seed không bắt buộc cho TASK-015.
- Đã xác minh live 11 bảng Core MVP, 7 enums, RLS, policy/grant của `exercise_solutions`, và cấu hình 3 RPC.
- Đã sinh lại `src/generated/database.types.ts` trực tiếp từ schema live bằng Supabase MCP.
- Đã chạy Supabase security/performance advisors và ghi nhận các cảnh báo cần Reviewer đánh giá.

## Environment
- Environment Name: **Development** (được người dùng xác nhận trong Task Packet).
- Project Reference: `yzucdzlgaucmduoghjft`.
- Project URL: `https://yzucdzlgaucmduoghjft.supabase.co`.
- Production: Không thao tác.

## Files Changed
- `src/generated/database.types.ts`: đồng bộ trực tiếp từ live schema; bổ sung metadata PostgREST 14.5 và generated helper types/constants.
- `tasks/TASK-015.md`: chuyển trạng thái và acceptance checklist sang `READY_FOR_REVIEW`.
- `project/TASKS.md`: cập nhật trạng thái/handoff TASK-015 và đồng bộ tiêu chí seed tùy chọn.
- `ACTIVE_TASK.md`: chuyển trạng thái sang `READY_FOR_REVIEW`.
- `reports/TASK-015-implementation.md`: ghi log thực thi và xác minh.

## Migration Execution Results
| Order | Migration | Supabase version | Result |
|---:|---|---|---|
| 1 | `001_create_enums` | `20260802060334` | SUCCESS |
| 2 | `002_create_profiles` | `20260802060354` | SUCCESS |
| 3 | `003_create_curriculum_tables` | `20260802060359` | SUCCESS |
| 4 | `004_create_learning_tables` | `20260802060405` | SUCCESS |
| 5 | `005_create_ai_explanation_table` | `20260802060410` | SUCCESS |
| 6 | `006_create_indexes` | `20260802060415` | SUCCESS |
| 7 | `007_create_triggers` | `20260802060421` | SUCCESS |
| 8 | `008_create_rls_policies` | `20260802060430` | SUCCESS |
| 9 | `009_create_rpc_functions` | `20260802060435` | SUCCESS |

- Seed: SKIPPED — `supabase/seed.sql` không tồn tại; Task Packet đã miễn bước seed.

## Schema Verification
- Table count: 11/11.
- Tables: `profiles`, `courses`, `chapters`, `lessons`, `exercises`, `exercise_options`, `exercise_solutions`, `course_enrollments`, `user_progress`, `submissions`, `ai_explanations`.
- Tất cả 11 bảng có `relrowsecurity = true`.
- Enum count: 7/7.
- Enums: `user_role`, `enrollment_status`, `exercise_type`, `difficulty_level`, `exercise_source`, `progress_status`, `ai_response_status`.
- Generated TypeScript types: đồng bộ thành công từ live schema.

## Security Verification
### exercise_solutions
- RLS enabled: YES.
- RLS policies: `[]` (không có policy).
- `anon` có SELECT privilege: FALSE.
- `authenticated` có SELECT privilege: FALSE.
- Kết luận: đáp ứng tiêu chí không cho client đọc `exercise_solutions`.

### Core RPC configuration
| Function | SECURITY DEFINER | Configuration | Authenticated EXECUTE |
|---|---:|---|---:|
| `enroll_course(bigint)` | YES | `search_path=public` | YES |
| `has_role(user_role)` | YES | `search_path=public` | YES |
| `submit_exercise(bigint,jsonb)` | YES | `search_path=public` | YES |

### ACL finding
- Supabase live ACL cấp trực tiếp `EXECUTE` cho `anon`, `authenticated`, và `service_role` trên ba Core RPC dù migrations chỉ grant tường minh cho `authenticated` sau `REVOKE ... FROM public`.
- Security Advisor cũng cảnh báo `anon` có thể gọi bốn SECURITY DEFINER functions: `enroll_course`, `has_role`, `submit_exercise`, và `handle_new_user`.
- `enroll_course` và `submit_exercise` vẫn kiểm tra `auth.uid()` và từ chối anonymous; `has_role` trả false khi không có authenticated profile. Tuy vậy ACL rộng hơn ý định của migration và cần Reviewer quyết định migration hardening tiếp theo.
- Không sửa ACL thủ công vì Task Packet cấm thay đổi schema/security ngoài migrations đã review.
- Remediation reference: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Advisor Results
- Security:
  - INFO mong đợi: `exercise_solutions` bật RLS và không có policy.
  - WARN: anonymous/authenticated SECURITY DEFINER executability như ghi ở phần ACL finding.
- Performance:
  - INFO: foreign key `submissions_exercise_id_fkey` chưa có covering index riêng.
  - WARN: các policy dùng `auth.uid()` trực tiếp có thể tạo init-plan kém tối ưu.
  - INFO: các index mới chưa được sử dụng vì database hiện chưa có seed/data.
- Không áp dụng thay đổi ngoài scope cho các advisor findings.

## Quality Gates Results
- `npm run lint`: PASS — 0 warning, 0 error.
- `npm run typecheck`: PASS.
- `npm run test`: PASS — 6 test files, 32 tests.
- `npm run build`: PASS — Next.js production build hoàn tất.
- Lần chạy test đầu trong sandbox bị `spawn EPERM`; chạy lại ngoài sandbox thành công. Đây là giới hạn môi trường, không phải lỗi test.

## Tests Added / Updated
- Không thêm test source; TASK-015 là database execution/verification task.
- Toàn bộ 32 test hiện có đã pass sau khi sync generated types.

## Known Limitations / Risks
- Database chưa có seed/data vì `supabase/seed.sql` không tồn tại và task đã miễn bước seed.
- ACL `anon EXECUTE` trên SECURITY DEFINER functions cần Reviewer đánh giá; không được tự sửa bằng DDL ngoài migrations đã duyệt.
- Advisor performance findings chưa được xử lý vì nằm ngoài Files Allowed to Change và cần migration riêng.

## Next Action
Nhờ Gemini/Antigravity review database verification, generated types diff và ACL advisor finding của TASK-015.
