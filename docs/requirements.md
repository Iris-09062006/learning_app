# Product Requirements Document (PRD)

## 1. Tổng quan dự án

- **Tên dự án:** LearningApp (Nền tảng học lập trình Python tương tác tích hợp AI).
- **Mục tiêu:** Xây dựng nền tảng học lập trình Python ngắn gọn, trực quan, theo lộ trình rõ ràng, kết hợp bài tập tương tác và trợ lý AI (AI Mentor) giải thích đáp án giúp người mới bắt đầu tiến bộ nhanh chóng.
- **Đối tượng sử dụng:**
  - **Learner (Người học):** Người mới bắt đầu học Python, muốn học qua lộ trình bài học ngắn và thực hành bài tập ngay.
  - **Moderator (Người kiểm duyệt):** Kiểm duyệt nội dung bài tập do AI khởi tạo trước khi xuất bản.
  - **Admin (Quản trị viên):** Quản lý người dùng, phân quyền và theo dõi trạng thái hệ thống.

---

## 2. Phạm vi sản phẩm (Product Scope)

### 2.1 Thuộc phạm vi MVP (In Scope for Core MVP)

1. **Tài khoản & Phân quyền:**
   - Đăng ký, đăng nhập, đăng xuất (Supabase Auth).
   - Phân quyền theo vai trò (Learner, Moderator, Admin).
2. **Khóa học & Lộ trình (Catalog & Roadmap):**
   - Danh sách khóa học công khai.
   - Lộ trình bài học (Roadmap) trực quan dạng các chặng/bài học.
   - Đăng ký học (Enrollment) và tự động mở khóa bài học đầu tiên.
3. **Bài học & Bài tập (Lesson & Exercises):**
   - Đọc nội dung bài học.
   - Bài tập **Predict the Output** (Dự đoán kết quả đoạn code - Trắc nghiệm).
   - Bài tập **Fix the Bug** (Sửa lỗi đoạn code - Chọn cú pháp đúng).
4. **Nộp bài & Tiến độ (Submission & Progress):**
   - Chấm bài tập tĩnh phía Server.
   - Phản hồi Đúng/Sai ngay lập tức.
   - Tự động mở khóa bài học tiếp theo khi hoàn thành tất cả bài tập bắt buộc trong bài học hiện tại.
5. **AI Mentor:**
   - Hỗ trợ giải thích lý do đáp án sai dựa trên bối cảnh bài tập và bài nộp của người học.
   - Xử lý hoàn toàn ở Server, không lộ API Key, có timeout và fallback an toàn khi AI lỗi.

### 2.2 Thuộc phạm vi mở rộng P1 (Operations Extension)

1. **Quản lý & Kiểm duyệt nội dung AI:**
   - Sinh bài tập bằng AI (AI Exercise Generation).
   - Hàng duyệt bài tập AI cho Moderator (Approve / Reject / Needs Revision).
   - Xuất bản bài tập đã duyệt vào khóa học.
2. **Quản trị người dùng (Admin):**
   - Xem danh sách người dùng, tìm kiếm, lọc theo vai trò.
   - Thay đổi vai trò người dùng (Learner <-> Moderator <-> Admin).
   - Kích hoạt / Vô hiệu hóa tài khoản người dùng.
   - Ghi Log quản trị (Audit Log).

### 2.3 Ngoài phạm vi MVP (Out of Scope)

- Ứng dụng di động native (iOS / Android).
- Thanh toán / Đăng ký gói trả phí (Subscription / Payment).
- Trình soạn thảo IDE đầy đủ / Chạy code Python trực tiếp trên server (Code Execution Sandbox).
- Mạng xã hội / Bảng xếp hạng thi đấu phức tạp.
- Kỹ thuật RAG phức tạp (MVP sử dụng Direct Context Injection).

---

## 3. MVP Boundary (Ranh giới MVP)

Để đảm bảo tính khả thi và chất lượng dự án, ranh giới MVP được quy định rõ:

| Tính năng | Trong MVP (P0) | Mở rộng (P1) | Không làm (Out of Scope) |
|---|---|---|---|
| Dạng bài tập | Predict Output & Fix Bug (Chọn lựa chọn) | Fix Bug (Kéo thả) | Code Execution tự do |
| Chấm bài | So sánh đáp án tĩnh ở Server | - | Sandbox đếm thời gian thực thi |
| Trợ lý AI | Giải thích đáp án sai theo bối cảnh | Lưu lịch sử giải thích chi tiết | RAG trên toàn bộ tài liệu |
| Tạo bài tập AI | - | Sinh bài tập + Hàng chờ duyệt | Tự động xuất bản bài tập AI |
| Phân quyền | RLS + Session + Service checks | Quản lý User + Audit Log | Quản lý permission matrix phức tạp |
