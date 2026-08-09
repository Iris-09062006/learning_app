# Report — Status Sync & Cleanup (Audit)

## Objective
Thực hiện tổng rà soát toàn bộ project để chẩn đoán độ lệch giữa tài liệu theo dõi tiến độ (project tracking docs) và bằng chứng thực tế trên Source Code / Git History.

## Khảo sát thực tế (Source of Truth)
- **Git History:** Xác nhận commit dọn dẹp các task cũ ở `ab64225` (docs: clean up task tracking and stale reports).
- **Test Suite:** `npm run test` pass 61/61 tests bao gồm `features/auth`, `lib/supabase`, `components/ui`. Hoàn toàn không có test nào cho tính năng `Course Catalog & Detail`.
- **Source Code (`src/`) & Migrations:** 
  - Schema DB (001–009) đã áp dụng (TASK-015).
  - Component UI (`badge`, `button`, `card`, `input`) có đủ (TASK-003).
  - Auth Service, Handlers, Pages (`/login`, `/register`) tồn tại (TASK-020, TASK-021).
  - Courses Feature (`src/features/courses/`): Chỉ chứa `types/index.ts` và `repositories/course-repository.ts`. Chưa có API route `/api/courses`, UI Components (`course-card`, `course-list`), Pages (`/courses`), Unit Tests. 

## Kết quả chẩn đoán và Hành động

1. **TASK-022 (Course Catalog & Detail):** 
   - *Lỗi:* Task packet và report tự đánh giá `VERIFIED` dù thiếu toàn bộ phần API, UI và Tests, không đáp ứng Acceptance Criteria.
   - *Khắc phục:* 
     - Xóa `reports/TASK-022-implementation.md` và `reports/TASK-022-review.md`.
     - Chỉnh `tasks/TASK-022.md` thành `IN_PROGRESS` (chưa hoàn thành), bỏ check các acceptance criteria không đạt.

2. **TASK-021 (Auth Pages):**
   - *Lỗi:* `project/TASKS.md` vẫn reference evidence đến các file report đã bị xóa (`reports/TASK-021-implementation.md` v.v.).
   - *Khắc phục:* Cập nhật TASKS.md để ghi nhận evidence dựa trên `git commit` (commit `5f4b7c8`).

3. **ACTIVE_TASK, TASKS.md, ROADMAP.md:**
   - *Lỗi:* ROADMAP và TASKS ghi TASK-022 là Verified, next là TASK-023. ACTIVE_TASK ghi next là TASK-022. 
   - *Khắc phục:* Viết lại đồng bộ:
     - `ROADMAP.md`: Phase 3 đang IN_PROGRESS, TASK-022 IN_PROGRESS. TASK-023 READY.
     - `TASKS.md`: Loại bỏ các references tới reports không tồn tại, list đúng trạng thái.
     - `ACTIVE_TASK.md`: Queued = TASK-023 (hoặc tùy thuộc vào việc hoàn thiện nốt TASK-022). Do TASK-022 chưa xong, Next Queued nên là tiếp tục TASK-022 để finish.

## Trạng thái Phase 3 (Authentication & Learning Core)
- TASK-020: VERIFIED
- TASK-021: VERIFIED 
- TASK-022: IN_PROGRESS
- TASK-023: READY

Dự án đã được clean up hoàn toàn, loại bỏ các false-positives từ quá trình sinh report trước đây. Mọi commit sắp tới bắt buộc phải dựa trên trạng thái source code thực sự.