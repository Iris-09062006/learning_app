# Non-Functional Requirements (NFR)

## 1. Mục tiêu

Tài liệu này định nghĩa các yêu cầu phi chức năng nhằm đảm bảo hệ thống:

- Hoạt động nhanh và mượt mà.
- An toàn bảo mật.
- Đáng tin cậy.
- Dễ bảo trì và mở rộng.
- Dễ kiểm thử.
- Đạt trải nghiệm người dùng tốt.

---

## 2. Hiệu năng (Performance)

## NFR-PERF-01 — Thời gian phản hồi trang (Page Load Time)

- Các trang chính (Dashboard, Roadmap, Lesson, Catalog): Phản hồi nội dung chính trong thời gian < 2.0 giây trên mạng tiêu chuẩn.
- Giao diện phải hiển thị khung trang (shell/skeleton) ngay lập tức (< 500ms).

---

## NFR-PERF-02 — Thời gian phản hồi API (API Latency)

- API thông thường (lấy dữ liệu, xem lộ trình, xem bài học): 95% request có thời gian phản hồi < 500ms (không tính thời gian mạng).
- API nộp bài và chấm bài tập tĩnh: Thời gian xử lý phía server < 1.0 giây.

---

## NFR-PERF-03 — Thời gian phản hồi AI Mentor

- API giải thích bằng AI (`POST /api/ai/explanations`):
  - Mục tiêu thời gian phản hồi: 3 – 10 giây.
  - Timeout tối đa: 20 giây.
- Giao diện phải hiển thị trạng thái đang xử lý (loading state / skeleton) rõ ràng trong lúc chờ AI.
- Nếu vượt quá timeout (20s), hệ thống phải trả về lỗi thân thiện và cho phép người học bấm "Thử lại".

---

## NFR-PERF-04 — Tối ưu hóa truy vấn Database

- Không xảy ra lỗi N+1 query khi tải danh sách bài học hoặc lộ trình.
- Mọi bảng có tần suất truy vấn cao đều phải có Index phù hợp (xem `database.md`).
- Phải áp dụng phân trang (Pagination) cho tất cả các danh sách có khả năng tăng trưởng lớn (danh sách user, danh sách bài nộp, hàng đợi kiểm duyệt). Mỗi trang mặc định 20 items.

---

## 3. Độ tin cậy & Sẵn sàng (Reliability & Availability)

## NFR-REL-01 — Độ sẵn sàng của hệ thống (Availability)

- Mục tiêu độ sẵn sàng hệ thống: 99.0% thời gian hoạt động trong tháng (hoàn toàn khả thi với hạ tầng Vercel + Supabase).

---

## NFR-REL-02 — Khả năng chịu lỗi dịch vụ AI (AI Fallback)

- Lỗi từ nhà cung cấp AI (timeout, rate-limit, 5xx từ API bên ngoài) **không được làm sập ứng dụng**.
- Nếu dịch vụ AI gặp sự cố:
  - Hệ thống vẫn cho phép người học làm bài tập và nhận kết quả chấm bài bình thường.
  - Chức năng "Hỏi AI Mentor" sẽ hiển thị thông báo lỗi nhẹ nhàng: "AI Mentor hiện đang bận. Bạn vui lòng thử lại sau ít phút."

---

## NFR-REL-03 — Tính toàn vẹn dữ liệu tiến độ (Data Integrity)

- Tiến độ học tập của người dùng (`user_progress`) phải được cập nhật chính xác và nguyên tử (Atomic).
- Một bài học đã ở trạng thái `completed` sẽ **không bao giờ** bị tụt hạng trạng thái do các lỗi kỹ thuật hoặc do người học nộp lại bài tập sai.

---

## 4. Bảo mật (Security)

## NFR-SEC-01 — Quản lý khóa bí mật (Secret Management)

- Tuyệt đối không commit các khóa bí mật (`SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`, DB passwords) vào mã nguồn Git.
- Khóa bí mật chỉ được lưu trong biến môi trường của Vercel / server local `.env.local`.

---

## NFR-SEC-02 — Bảo vệ quyền riêng tư đáp án

- Đáp án đúng của bài tập (`exercise_solutions`) không bao giờ được gửi về trình duyệt người học trước khi họ nộp bài.
- Bảng `exercise_solutions` không có quyền đọc (SELECT) cho vai trò `anon` hoặc `authenticated` qua RLS.

---

## NFR-SEC-03 — Phân quyền chặt chẽ ở Server (Server Authorization)

- Mọi API endpoint riêng tư phải kiểm tra session người dùng ở phía Server (`requireUser`).
- Không tin tưởng bất kỳ thông tin nhận dạng người dùng (`userId`), vai trò (`role`), hay điểm số (`score`) do phía Client tự gửi lên trong request body.

---

## NFR-SEC-04 — Phòng chống các lỗ hổng phổ biến (OWASP Top 10)

- **SQL Injection**: Dùng Supabase Query Builder / Parameterized Queries cho mọi câu lệnh SQL.
- **XSS**: Validate và làm sạch (sanitize) mọi nội dung do người dùng nhập hoặc AI tạo ra trước khi hiển thị trên HTML. Không dùng `dangerouslySetInnerHTML` với dữ liệu chưa được làm sạch.
- **CSRF**: Sử dụng cơ chế cookie an toàn của Supabase SSR (SameSite, HttpOnly).

---

## NFR-SEC-05 — Giới hạn tần suất gọi API (Rate Limiting)

- API giải thích bằng AI (`/api/ai/explanations`): Giới hạn tối đa 20 request / user / giờ để tránh cạn kiệt ngân sách API và phòng chống abuse.
- API Đăng nhập / Đăng ký: Áp dụng rate limiting chống tấn công dò mật khẩu (Brute force).

---

## 5. Khả năng bảo trì (Maintainability)

## NFR-MAIN-01 — Tuân thủ chuẩn mã nguồn

- 100% mã nguồn tuân thủ các quy định trong `coding_standards.md`.
- Sử dụng TypeScript ở chế độ Strict Mode (`strict: true`). Không sử dụng kiểu `any` tùy tiện.

---

## NFR-MAIN-02 — Tự động hóa kiểm tra chất lượng (Quality Gates)

- Trước khi merge code vào branch `main`, hệ thống CI phải tự động chạy và pass 100%:
  - `npm run lint` (Linting)
  - `npm run typecheck` (Kiểm tra kiểu dữ liệu)
  - `npm run test` (Unit & Integration tests)
  - `npm run build` (Build ứng dụng)

---

## 6. Khả năng kiểm thử (Testability)

## NFR-TEST-01 — Kiểm thử tự động (Automated Testing)

- Các logic nghiệp vụ quan trọng (chấm bài tập, tính tiến độ, phân quyền, validate response AI) phải có Unit/Integration Test bao phủ.
- Luồng học tập cốt lõi của người học (Đăng ký -> Enroll -> Học bài -> Nộp bài -> Mở khóa bài tiếp) phải có ít nhất 1 kịch bản kiểm thử End-to-End (Playwright).

---

## NFR-TEST-02 — Khả năng giả lập (Mocking AI)

- Toàn bộ Unit và Integration Test mặc định phải dùng Mock AI Provider, **không gọi thật** tới API bên ngoài trong quá trình chạy test tự động.

---

## 7. Khả năng sử dụng & Khả năng truy cập (Usability & Accessibility)

## NFR-USA-01 — Thiết kế Responsive

- Giao diện hiển thị tốt và hoạt động đầy đủ chức năng trên 3 kích thước màn hình chính:
  - Mobile: chiều rộng 390px (iPhone / Android chuẩn).
  - Tablet: chiều rộng 768px (iPad / Android Tablet).
  - Desktop: chiều rộng >= 1280px.

---

## NFR-USA-02 — Hỗ trợ truy cập bằng bàn phím (Keyboard Navigation)

- Người dùng có thể sử dụng phím `Tab`, `Enter`, `Space`, `Escape` để điều hướng toàn bộ các chức năng chính trên trang (chọn lựa chọn bài tập, bấm nộp bài, mở AI Mentor, đóng dialog).
- Các phần tử có thể tương tác phải có chỉ báo con trỏ/focus rõ ràng (Visible Focus Ring).

---

## NFR-USA-03 — Thông báo phản hồi rõ ràng

- Mọi hành động của người dùng (Nộp bài, Đăng ký học, Đổi mật khẩu) đều phải có phản hồi thị giác ngay lập tức:
  - Nộp đúng: Hiển thị hiệu ứng/thông báo màu xanh chúc mừng + nút Tiếp tục.
  - Nộp sai: Hiển thị thông báo nhẹ nhàng + nút Thử lại + nút Hỏi AI.
  - Đang xử lý: Hiển thị hiệu ứng Loading trên nút bấm (Disable nút bấm để tránh nộp trùng).

---

## 8. Khả năng mở rộng (Scalability)

## NFR-SCA-01 — Kiến trúc mở rộng nội dung

- Hệ thống thiết kế sẵn sàng để bổ sung thêm các Khóa học mới, Chapter mới, Lesson mới thông qua database mà không cần phải thay đổi cấu trúc mã nguồn.
- Kiến trúc AI Integration sẵn sàng để chuyển đổi hoặc kết hợp giữa các nhà cung cấp (Google Gemini, OpenAI, Anthropic) bằng cách triển khai thêm Provider mới theo `AIProvider` interface.

---

## 9. Khả năng quan sát (Observability)

## NFR-OBS-01 — Ghi log hệ thống (Logging)

- Hệ thống phải ghi log các sự kiện quan trọng phía Server:
  - Lỗi API / Database.
  - Lỗi từ nhà cung cấp AI.
  - Các thao tác quản trị nhạy cảm (Đổi role, Vô hiệu hóa tài khoản, Publish bài tập AI).
- Log không được chứa mật khẩu, token, cookie hoặc thông tin nhạy cảm của người dùng.
