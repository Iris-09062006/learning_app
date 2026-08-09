# Implementation Report: TASK-022 — Course Catalog & Course Detail Feature

## Status
`READY_FOR_REVIEW`

## Outcome
Toàn bộ tính năng Course Catalog (F-COURSE-01) và Course Detail (F-COURSE-03) đã được triển khai đầy đủ bao gồm service layer, API route handlers, UI components, Next.js pages và unit tests.

## Files Changed

### New Files (Untracked → Committed)

| File | Mô tả |
|---|---|
| `src/features/courses/services/course-service.ts` | Service: `getPublishedCourses`, `getCourseById`, `normalizePagination` |
| `src/app/api/courses/route.ts` | API Handler: `GET /api/courses?page=&pageSize=` |
| `src/app/api/courses/[courseId]/route.ts` | API Handler: `GET /api/courses/:courseId` |
| `src/features/courses/components/course-card.tsx` | Component: Card hiển thị tóm tắt khóa học |
| `src/features/courses/components/course-list.tsx` | Component: Grid danh sách khóa học |
| `src/features/courses/components/course-detail-view.tsx` | Component: View chi tiết khóa học với chapters |
| `src/app/(main)/courses/page.tsx` | Page: `/courses` — Danh sách khóa học |
| `src/app/(main)/courses/[courseId]/page.tsx` | Page: `/courses/[courseId]` — Chi tiết khóa học |
| `src/features/courses/services/__tests__/course-service.test.ts` | Unit tests cho service |
| `src/features/courses/components/__tests__/course-card.test.tsx` | Unit tests cho CourseCard |
| `src/features/courses/components/__tests__/course-list.test.tsx` | Unit tests cho CourseList |
| `src/features/courses/components/__tests__/course-detail-view.test.tsx` | Unit tests cho CourseDetailView |
| `src/app/api/courses/__tests__/route.test.ts` | Unit tests cho API route handlers |

### Modified Files
Không có file nào ngoài scope được chỉnh sửa. `tsconfig.json` bị modified nhẹ (whitespace/CRLF) — không staged.

## Implementation Details

### Service Layer (`course-service.ts`)
- `normalizePagination`: clamping page/pageSize, xử lý invalid input an toàn
- `getPublishedCourses`: delegate sang repository, trả `CourseListResult` với pagination meta
- `getCourseById`: validate courseId > 0, lọc `isPublished === false`, trả `null` thay vì 404 tại layer này

### API Route Handlers
- `GET /api/courses`: trả `{ success: true, data: CourseSummary[], meta: { page, pageSize, total, totalPages } }` — HTTP 200
- `GET /api/courses/:courseId`: trả `{ success: true, data: CourseDetail }` — HTTP 200; trả 400 khi courseId không hợp lệ, 404 khi không tìm thấy/chưa published, 500 khi lỗi DB
- Sử dụng `params: Promise<{...}>` — Next.js 15 async params pattern

### UI Components
- `CourseCard`: Link đến `/courses/:id`, hiển thị progress nếu enrolled, dark mode support
- `CourseList`: Responsive grid (1/2/3 cols), empty state, loading skeleton-ready
- `CourseDetailView`: Header, metadata badges, chapters accordion, enrollment status

### Pages
- `/courses`: Server Component, fetch `getPublishedCourses({})`, render `CourseList`
- `/courses/[courseId]`: Server Component với `generateMetadata`, `notFound()` khi course không tồn tại

### Unit Tests (82 tests, 16 test files — bao gồm từ tasks trước)
- Service tests: pagination normalization, published filter, error propagation
- API tests: mock service, 200/400/404/500 responses, proper JSON structure
- Component tests: render scenarios, enrolled/unenrolled states, empty/loading states

## Quality Gates

| Gate | Command | Result |
|---|---|---|
| lint | `npm run lint` | ✅ PASS |
| typecheck | `npm run typecheck` | ✅ PASS |
| test | `npm run test` | ✅ PASS (82 tests) |
| build | `npm run build` | ✅ PASS |

## Security Review
- Không hardcode secret hoặc credential
- Không dùng TypeScript `any`
- Không import service-role client vào Client Component
- Không expose exercise_solutions ra client
- RLS không bị bypass (repository dùng public/anon client đúng)
- Tất cả data fetch tại Server Component — không gọi AI/DB trực tiếp từ browser