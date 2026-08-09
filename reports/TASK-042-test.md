# TASK-042 Test Report

## Quality gates

| Command | Result |
|---|---|
| `npx vitest run src/lib/supabase/middleware.test.ts src/components/layout/app-navigation.test.tsx src/app/page.test.tsx` | PASS — 3 files, 21 tests |
| `npm run lint` | PASS — exit 0, không warning |
| `npm run typecheck` | PASS — exit 0 |
| `npm run test` | PASS — 62 files, 360 tests |
| `npm run build` | PASS — exit 0, 19 routes generated |
| `PLAYWRIGHT_BROWSER_EXECUTABLE_PATH=<system Chrome>; npm run test:e2e` | PASS — 2/2 Chromium tests |
| `git diff --check` | PASS |

`next build` vẫn in cảnh báo tích hợp lint nội bộ `Invalid Options: useEslintrc, extensions`; command exit 0 và gate authoritative `npm run lint` pass. Đây là warning tooling hiện hữu, không che lỗi lint.

## HTTP smoke evidence

Dev server tại cổng test tạm trả:

- `GET /` → `200 text/html`.
- `GET /register` → `200 text/html`, không `Location`.
- `POST /api/auth/login` với body validation rỗng → `400 application/json`, không redirect.
- `GET /api/system/health` → `503 application/json`, không redirect; degraded vì database không khả dụng.
- `GET /dashboard` khi guest → `307` tới `/login?next=%2Fdashboard`.

## Browser evidence

- Landing heading, product pillars và CTA render thành công.
- Không có Next.js error overlay hoặc console error.
- CTA “Bắt đầu học” điều hướng tới `/register`; form đăng ký render.
- App icon loại bỏ resource 404.

## Environment-limited checks

- Migration integration test với Supabase local: NOT RUN. Docker API không truy cập được và local Postgres/Supabase không chạy.
- Supabase CLI discovery qua `npx supabase --version`: NOT RUN thành công vì package không có trong npm cache và network sandbox bị hạn chế.
- Admin privileged/AI provider integration: NOT RUN vì thiếu `SUPABASE_SERVICE_ROLE_KEY` và `AI_API_KEY` thật.

Các giới hạn này không làm giả kết quả pass và không ảnh hưởng regression middleware/UI đã xác minh.
