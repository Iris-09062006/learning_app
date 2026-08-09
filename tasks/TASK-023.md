# TASK-023: Course Enrollment Feature & API Integration (Status: VERIFIED)

## 1. Objective
- Triển khai tính năng Enroll vào Course dựa trên Supabase RPC `enroll_course`.
- Đảm bảo API route POST `/api/courses/:courseId/enroll` tuân thủ strict API contract, trả về 409 nếu đã enroll, 201 nếu success.
- Cập nhật Repository, Service, API route và giao diện Course Detail View để hỗ trợ flow enrollment.
- Chỉ support Role Learner như RPC yêu cầu.

## 2. Scope & Dependencies
- **In-Scope**:
  - `src/features/courses/repositories/course-repository.ts` (thêm `enrollInCourse` sử dụng RPC).
  - `src/features/courses/services/course-service.ts` (thêm wrapper logic, auth boundary nếu cần).
  - `src/app/api/courses/[courseId]/enroll/route.ts` (Route handler xử lý POST, error mapping).
  - `src/features/courses/components/course-detail-view.tsx` (Thêm Client Action cho nút Enroll/Start).
  - Unit/Integration test tương ứng cho repository, service, route và component.
- **Out-of-Scope**:
  - Roadmap view, Lesson Player view, Payment integration (đang là Free).
- **Dependencies**:
  - TASK-022 hoàn tất (Course Details đã sẵn sàng).
  - Migration 009 (RPC `enroll_course`) đã apply.

## 3. Implementation Steps
- [x] **Repository Layer**: Thêm method `enrollInCourse(courseId, supabaseClient)` gọi `rpc('enroll_course', { p_course_id })`.
- [x] **Service Layer**: Hàm `enrollCourse` nhận context auth hoặc inject supabase client, xử lý Error Code của PostgreSQL (23505 cho 409, 28000 cho 401, P0002 cho 404).
- [x] **API Route**: Triển khai `POST /api/courses/[courseId]/enroll`. Bọc try-catch, map error trả đúng HTTP status code dựa theo contract.
- [x] **UI Component**:
  - Thêm client state (`isEnrolling`).
  - Update `CourseDetailView` component để sử dụng state này khi user click "Enroll".
  - Nếu đã enroll, thay đổi text thành "Start Learning" (trỏ tới `/courses/courseId/roadmap`).
- [x] **Testing**:
  - Mock Supabase RPC trong Repository test.
  - Test Service error mapping.
  - Test Route Handler cho cases 201, 401, 404, 409.
  - Update Component tests `course-detail-view.test.tsx` (nếu cần).

## 4. Expected Outcomes
- Chạy qua các test cases, đạt coverage chuẩn.
- API tuân thủ đúng API contract `docs/api_contract.md`.
- Vượt qua vòng lặp REVIEW và TEST không lỗi.