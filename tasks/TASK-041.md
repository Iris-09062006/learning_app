# TASK-041 — Preview Deployment and Smoke Verification

## Status
`DRAFT`

## Phase
Phase 7

## Objective
Triển khai release candidate lên Preview và chạy smoke/security checks trên môi trường đó trước khi đề xuất Production.

## Dependencies and Authorization Gate
- `TASK-040` verified.
- Người dùng yêu cầu rõ việc push/deploy trong một turn tương lai.
- Preview project, Supabase staging, secrets và least-privilege access đã sẵn sàng.

Không được chuyển task này sang `IN_PROGRESS` chỉ dựa trên kế hoạch hiện tại. Yêu cầu hiện tại cấm push/deploy.

## Planned Scope
- Preflight branch/diff/secret/migration review.
- Push đúng branch và tạo Preview deployment theo workflow được phê duyệt.
- Xác minh environment separation và không dùng Production DB.
- Chạy smoke flows, health check và log review trên Preview.
- Ghi deployment URL/id, evidence và rollback path vào report.

## Out of Scope
- Production deployment hoặc promote traffic.
- Production migration.
- Bỏ qua failed gate để tạo Preview.

## Acceptance Criteria
- Mọi gate `TASK-040` vẫn pass trên release commit.
- Preview kết nối đúng staging resources; secrets không xuất hiện ở client/log/report.
- Critical smoke tests và rollback rehearsal/document review pass.
- Production vẫn ở trạng thái chưa deploy cho đến yêu cầu riêng.

## Required Commands
Được khóa lại trong task khi có authorization và biết chính xác provider/project; không chạy command external trong giai đoạn planning.
