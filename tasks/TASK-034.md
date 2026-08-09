# TASK-034 — Course Catalog Search

## Status
`VERIFIED`

## Verification
- Focused tests: 5 files, 37 tests passed.
- Required gates: lint, typecheck, full test suite, and production build passed.
- Review verdict: `PASS` with no remaining Critical, High, or Medium findings.

## Feature ID
`F-COURSE-02`

## Objective
Cho phép Guest và Learner tìm tương đối theo `title` hoặc `description` trong catalog đã publish, đồng thời giữ nguyên pagination và enrollment metadata hiện có.

## Dependencies
- `TASK-022` verified.
- Existing `GET /api/courses` pagination contract.

## Required Context
- `docs/requirements.md`
- `docs/features.md` — F-COURSE-01, F-COURSE-02
- `docs/api_contract.md` — §10.1
- `docs/database.md` — course indexes/search guidance
- `docs/security.md`

## In Scope
- Thêm query `search` đã trim/validate vào `GET /api/courses`.
- Chỉ search course `is_published = true`.
- Search không phân biệt hoa thường trên title/description.
- Đồng bộ URL query, pagination reset và empty/error/loading state của `/courses`.
- Unit/route/component tests cho query hợp lệ, query rỗng, ký tự đặc biệt và published filtering.

## Out of Scope
- Search chapter/lesson/exercise.
- Full-text ranking, autocomplete hoặc analytics.
- Migration `pg_trgm` nếu chưa có bằng chứng dữ liệu/performance cần thiết.

## Expected File Scope
- `src/features/courses/**`
- `src/app/api/courses/route.ts`
- `src/app/(main)/courses/page.tsx`
- Tests tương ứng
- Task/report/status artifacts

## Acceptance Criteria
- `GET /api/courses?search=...&page=...&pageSize=...` trả đúng contract hiện tại.
- Course chưa publish không xuất hiện trong mọi trường hợp.
- Query được parameterize; wildcard/control input không làm vỡ filter.
- Thay search trên UI đưa pagination về trang 1 và URL có thể reload/share.
- Không làm sai `isEnrolled` hoặc `completionPercentage`.

## Required Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
