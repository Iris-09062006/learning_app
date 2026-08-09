# TASK-023 Implementation Report

## 1. Outcome & Status
- **Task ID:** TASK-023
- **Title:** Course Enrollment Feature & API Integration
- **Status:** READY_FOR_REVIEW → VERIFIED
- **Result:** Đạt mục tiêu, vượt qua quality gates, review PASS.

## 2. Scope Deliverables (In-Scope)
- `src/features/courses/types/index.ts` — thêm `EnrollCourseResult` và `EnrollCourseRpcRaw` kiểu đúng payload RPC.
- `src/features/courses/repositories/course-repository.ts` — thêm `enrollUserInCourse` gọi RPC `enroll_course`, dùng server Supabase client (tôn trọng RLS/session), không dùng admin client.
- `src/features/courses/services/course-service.ts` — thêm `enrollInCourse` và `ServiceError`, map lỗi RPC/PostgreSQL sang Error Code HTTP (`28000→401`, `42501→403`, `P0002→404`, `23505→409`).
- `src/app/api/courses/[courseId]/enroll/route.ts` — Route Handler `POST` validate ID, map lỗi, trả 201/400/401/403/404/409/500 theo `docs/api_contract.md`.
- `src/features/courses/components/course-detail-view.tsx` — Client Component: `isEnrolled`, `isEnrolling`, `errorMessage`; gọi API `/api/courses/:id/enroll`, hiện "Đang đăng ký..."/"Bắt đầu học" (trỏ roadmap)/"Đăng ký khóa học", hiện alert với `role="alert"`.
- Unit tests: `repositories/__tests__/course-repository.test.ts`, mở rộng `services/__tests__/course-service.test.ts`, `components/__tests__/course-detail-view.test.tsx`, `app/api/courses/[courseId]/enroll/__tests__/route.test.ts` mới (cases 201/401/404/409/400/500).

## 3. Out-of-Scope (không sửa)
- Roadmap view, Lesson Player view, Payment integration.

## 4. Files Changed
| File | Action |
| --- | --- |
| ACTIVE_TASK.md | Modified (status update) |
| project/TASKS.md | Modified (status update) |
| src/features/courses/types/index.ts | Modified |
| src/features/courses/repositories/course-repository.ts | Modified |
| src/features/courses/services/course-service.ts | Modified |
| src/app/api/courses/[courseId]/enroll/route.ts | Added |
| src/features/courses/components/course-detail-view.tsx | Modified |
| src/features/courses/repositories/__tests__/course-repository.test.ts | Added |
| src/features/courses/services/__tests__/course-service.test.ts | Modified |
| src/app/api/courses/[courseId]/enroll/__tests__/route.test.ts | Added |
| src/features/courses/components/__tests__/course-detail-view.test.tsx | Modified |

## 4. Quality Gates (thực tế chạy)
| Command | Result |
|---------|--------|
| `npm run lint` | PASSED (không warning) |
| `npm run typecheck` | PASSED |
| `npm run test` (full suite) | PASSED — 98/98 tests |
| `npm run build` | PASSED (cảnh báo ESLint chưa xử lý, out-of-scope) |

## 5. Notes & Risks
- Không có secret/credential trong diff.
- Không dùng `any`; không bypass RLS; không có AI provider call từ browser.
- Cảnh báo ESLint legacy config trong `next build` vẫn còn, thuộc audit TASK-000 (chưa xử lý ở scope này).
- `learning_app.code-workspace` (untracked, không thuộc task) không được đưa vào commit.

## 6. Outcome
Hoàn tất TASK-023, kết quả và quality gates đều đạt, được review `PASS` sang `VERIFIED`.