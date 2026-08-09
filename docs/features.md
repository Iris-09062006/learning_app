# Features Specification

## 1. Mục tiêu

Tài liệu này định nghĩa chi tiết toàn bộ tính năng của hệ thống.

Mục tiêu:

- AI agent hiểu đúng yêu cầu từng tính năng.
- Phân định rõ phạm vi MVP và các tính năng nâng cao.
- Xác định rõ Actor, Input, Flow, Business Rules và Output.
- Làm căn cứ viết Task, Test cases và Acceptance Criteria.

---

## 2. Danh sách Module và Feature ID

| Module | Feature ID | Tên tính năng | Ưu tiên |
|---|---|---|---|
| Authentication | F-AUTH-01 | Đăng ký tài khoản | P0 |
| | F-AUTH-02 | Đăng nhập | P0 |
| | F-AUTH-03 | Đăng xuất | P0 |
| | F-AUTH-04 | Khôi phục mật khẩu | P1 |
| Course Catalog | F-COURSE-01 | Xem danh sách khóa học | P0 |
| | F-COURSE-02 | Tìm kiếm khóa học | P1 |
| | F-COURSE-03 | Xem chi tiết khóa học | P0 |
| Enrollment | F-ENROLL-01 | Đăng ký học (Enroll) | P0 |
| Roadmap | F-ROADMAP-01 | Xem lộ trình bài học | P0 |
| | F-ROADMAP-02 | Theo dõi tiến độ lộ trình | P0 |
| Lesson | F-LESSON-01 | Xem nội dung bài học | P0 |
| | F-LESSON-02 | Bắt đầu bài học | P0 |
| Exercise | F-EXERCISE-01 | Xem bài tập Predict Output | P0 |
| | F-EXERCISE-02 | Xem bài tập Fix the Bug (MVP) | P0 |
| | F-EXERCISE-03 | Xem bài tập Fix the Bug (Drag-and-Drop) | P1 |
| | F-EXERCISE-04 | Chấm bài tập tĩnh | P0 |
| Submission | F-SUBMISSION-01 | Nộp bài tập | P0 |
| | F-SUBMISSION-02 | Xem lịch sử nộp bài | P1 |
| Progress | F-PROGRESS-01 | Cập nhật tiến độ học | P0 |
| | F-PROGRESS-02 | Tự động mở khóa bài học tiếp theo | P0 |
| AI Mentor | F-AI-01 | Giải thích đáp án sai / bài tập | P0 |
| | F-AI-02 | Xem lịch sử giải thích | P1 |
| | F-AI-03 | Đề xuất bước học tiếp theo | P2 |
| AI Generation | F-AIGEN-01 | Tạo bài tập bằng AI | P1 |
| Moderation | F-MOD-01 | Xem hàng đợi bài tập AI | P1 |
| | F-MOD-02 | Review bài tập AI | P1 |
| | F-MOD-03 | Publish bài tập đã duyệt | P1 |
| Profile | F-PROFILE-01 | Xem hồ sơ cá nhân | P0 |
| | F-PROFILE-02 | Cập nhật username | P1 |
| Admin | F-ADMIN-01 | Xem danh sách người dùng | P1 |
| | F-ADMIN-02 | Thay đổi role người dùng | P1 |
| | F-ADMIN-03 | Kích hoạt / Vô hiệu hóa tài khoản | P1 |
| | F-ADMIN-04 | Đặt lại mật khẩu người dùng | P2 |
| | F-ADMIN-05 | Xem trạng thái hệ thống | P2 |
| System | F-SYSTEM-01 | Health check API | P1 |
| | F-SYSTEM-02 | Audit log hệ thống | P1 |

---

# 3. Authentication Module

## F-AUTH-01 — Đăng ký tài khoản

**Mức ưu tiên:** P0  
**Actor:** Guest

### Input

- Username.
- Email.
- Password.
- Confirm password.

### Luồng chính

1. Guest nhập thông tin đăng ký.
2. Client validate cơ bản.
3. Client gửi request đăng ký.
4. Server validate định dạng email, password và username.
5. Supabase Auth tạo tài khoản.
6. Trigger database tự động tạo record trong `profiles` với role `learner`.
7. Hệ thống đăng nhập tự động hoặc yêu cầu xác nhận email tùy cấu hình.
8. Trả về thông tin user an toàn.

### Quy tắc nghiệp vụ

- Email phải duy nhất trong hệ thống Supabase Auth.
- Password phải tuân thủ chính sách mật khẩu (tối thiểu 6 hoặc 8 ký tự tùy config).
- Username dài 3–50 ký tự, tự động trim khoảng trắng đầu cuối.
- User mới đăng ký luôn có role `learner` và trạng thái `is_active = true`.
- Không cho phép người dùng chọn role khi đăng ký.
- Nếu email đã tồn tại, trả về thông báo lỗi an toàn, không làm rò rỉ chi tiết hệ thống.

### API liên quan

```text
POST /api/auth/register
```

### Tiêu chí hoàn thành

- Tạo được user trong Supabase Auth và record trong `profiles`.
- Không tạo được user nếu input không hợp lệ.
- User mới có role `learner`.

---

## F-AUTH-02 — Đăng nhập

**Mức ưu tiên:** P0  
**Actor:** Guest

### Input

- Email.
- Password.

### Luồng chính

1. Guest nhập email và password.
2. Server gửi yêu cầu xác thực tới Supabase Auth.
3. Supabase Auth kiểm tra và trả về session / JWT cookie.
4. Server đọc `profiles` để lấy role và trạng thái `is_active`.
5. Nếu `is_active = false`, từ chối đăng nhập và xóa session.
6. Trả về thông tin user và chuyển hướng đến trang tương ứng với role.

### Quy tắc nghiệp vụ

- Không tiết lộ rõ email hay password sai (thông báo chung: "Thông tin đăng nhập không hợp lệ").
- Tài khoản bị vô hiệu hóa (`is_active = false`) không được phép đăng nhập.
- Khóa session an toàn bằng HttpOnly Cookie qua Supabase SSR.

### API liên quan

```text
POST /api/auth/login
```

---

## F-AUTH-03 — Đăng xuất

**Mức ưu tiên:** P0  
**Actor:** Authenticated user

### Luồng chính

1. User chọn Đăng xuất.
2. Client gửi request đăng xuất tới server.
3. Server hủy session Supabase Auth và xóa cookie.
4. Chuyển hướng người dùng về trang chủ hoặc trang đăng nhập.

### API liên quan

```text
POST /api/auth/logout
```

---

## F-AUTH-04 — Khôi phục mật khẩu

**Mức ưu tiên:** P1  
**Actor:** Guest / User quên mật khẩu

### Luồng chính

1. User nhập email yêu cầu reset mật khẩu.
2. Server gọi Supabase Auth gửi email khôi phục.
3. User nhấn link trong email, chuyển tới trang đặt lại mật khẩu.
4. User nhập mật khẩu mới.
5. Supabase Auth cập nhật mật khẩu.

---

# 4. Course Catalog Module

## F-COURSE-01 — Xem danh sách khóa học

**Mức ưu tiên:** P0  
**Actor:** Guest, Learner

### Input

- Query params: `page`, `pageSize`.

### Luồng chính

1. User truy cập trang Danh sách khóa học.
2. Server truy vấn bảng `courses` với điều kiện `is_published = true`.
3. Nếu user đã đăng nhập, hợp nhất thông tin `course_enrollments` để biết trạng thái đã đăng ký chưa.
4. Trả về danh sách khóa học kèm metadata (tiêu đề, mô tả, ngôn ngữ, mức độ, số bài học).

### Quy tắc nghiệp vụ

- Guest và Learner chỉ thấy khóa học đã xuất bản (`is_published = true`).
- Danh sách có phân trang.

### API liên quan

```text
GET /api/courses
```

---

## F-COURSE-02 — Tìm kiếm khóa học

**Mức ưu tiên:** P1  
**Actor:** Guest, Learner

### Input

- Search term (`search`).

### Quy tắc nghiệp vụ

- Tìm kiếm tương đối theo `title` hoặc `description`.
- Chỉ tìm trên các khóa học đã xuất bản.

---

## F-COURSE-03 — Xem chi tiết khóa học

**Mức ưu tiên:** P0  
**Actor:** Guest, Learner

### Input

- `courseId` hoặc `slug`.

### Luồng chính

1. User chọn một khóa học.
2. Server lấy thông tin khóa học, danh sách chapter và lesson đã xuất bản.
3. Nếu Learner đã đăng nhập, kiểm tra trạng thái enrollment và phần trăm hoàn thành.
4. Trả về dữ liệu chi tiết khóa học.

### API liên quan

```text
GET /api/courses/:courseId
```

---

# 5. Enrollment Module

## F-ENROLL-01 — Đăng ký học (Enroll)

**Mức ưu tiên:** P0  
**Actor:** Learner

### Input

- `courseId`.

### Luồng chính

1. Learner nhấn nút "Bắt đầu học" hoặc "Enroll".
2. Server kiểm tra Learner đã đăng nhập chưa.
3. Server kiểm tra khóa học có tồn tại và đã `is_published = true` không.
4. Server kiểm tra Learner đã enroll khóa này chưa.
5. Tạo record trong `course_enrollments`.
6. Khởi tạo toàn bộ `user_progress` cho các lesson đã xuất bản trong khóa học:
   - Lesson đầu tiên (theo `chapter_order` và `lesson_order`) có trạng thái `unlocked`.
   - Các lesson còn lại có trạng thái `locked`.
7. Trả về kết quả thành công và ID của lesson đầu tiên.

### Quy tắc nghiệp vụ

- Việc tạo enrollment và khởi tạo `user_progress` phải nằm trong 1 Transaction / RPC nguyên tử.
- Nếu đã enroll trước đó, trả về lỗi `409 CONFLICT` hoặc trả về thông tin enrollment hiện tại.
- Guest không thể enroll (yêu cầu chuyển hướng đăng nhập).

### API liên quan

```text
POST /api/courses/:courseId/enroll
```

---

# 6. Roadmap Module

## F-ROADMAP-01 — Xem lộ trình bài học

**Mức ưu tiên:** P0  
**Actor:** Learner (đã enroll)

### Input

- `courseId`.

### Luồng chính

1. Learner mở trang Roadmap của khóa học.
2. Server lấy cấu trúc Chapter -> Lesson của khóa học.
3. Server lấy `user_progress` tương ứng với `user_id` hiện tại.
4. Trả về cây lộ trình gồm thông tin từng bài học và trạng thái học tập (`locked`, `unlocked`, `in_progress`, `completed`).

### Quy tắc nghiệp vụ

- Chỉ hiển thị bài học thuộc các chapter đã xuất bản.
- Trạng thái từng bài học phản ánh chính xác dữ liệu trong `user_progress`.

### API liên quan

```text
GET /api/courses/:courseId/roadmap
```

---

## F-ROADMAP-02 — Theo dõi tiến độ lộ trình

**Mức ưu tiên:** P0  
**Actor:** Learner

### Nội dung

- Hiển thị tổng số bài học, số bài học đã hoàn thành.
- Hiển thị thanh phần trăm tiến độ (% completed).
- Đánh dấu rõ bài học tiếp theo cần học.

---

# 7. Lesson Module

## F-LESSON-01 — Xem nội dung bài học

**Mức ưu tiên:** P0  
**Actor:** Learner (đã enroll và bài học không bị `locked`)

### Input

- `lessonId`.

### Luồng chính

1. Learner nhấn chọn một bài học từ Roadmap.
2. Server kiểm tra `user_progress`:
   - Nếu lesson có trạng thái `locked` -> từ chối truy cập (`423 LESSON_LOCKED`).
   - Nếu `unlocked`, `in_progress`, hoặc `completed` -> cho phép.
3. Server lấy nội dung bài học (nội dung lý thuyết Markdown) và danh sách bài tập kèm theo.
4. Trả về thông tin bài học (không chứa đáp án đúng của bài tập).

### API liên quan

```text
GET /api/lessons/:lessonId
```

---

## F-LESSON-02 — Bắt đầu bài học

**Mức ưu tiên:** P0  
**Actor:** Learner

### Input

- `lessonId`.

### Luồng chính

1. Khi Learner mở bài học lần đầu (trạng thái đang là `unlocked`).
2. Client gửi request thông báo bắt đầu bài học.
3. Server cập nhật `user_progress.status = 'in_progress'` và ghi nhận `started_at`, `last_accessed_at`.
4. Trả về trạng thái mới.

### Quy tắc nghiệp vụ

- Nếu bài học đã ở trạng thái `in_progress` hoặc `completed`, giữ nguyên status và chỉ cập nhật `last_accessed_at`.

### API liên quan

```text
POST /api/lessons/:lessonId/start
```

---

# 8. Exercise Module

## F-EXERCISE-01 — Xem bài tập Predict Output

**Mức ưu tiên:** P0  
**Actor:** Learner

### Nội dung

- Đoạn code Python mẫu (`code_snippet`).
- Câu hỏi/mô tả.
- Danh sách các lựa chọn đầu ra (options).

### Quy tắc nghiệp vụ

- API trả về danh sách options không được chứa cờ đánh dấu đáp án đúng.

---

## F-EXERCISE-02 — Xem bài tập Fix the Bug (MVP)

**Mức ưu tiên:** P0  
**Actor:** Learner

### Nội dung trong MVP

- Đoạn code có lỗi (`code_snippet`).
- Vị trí lỗi hoặc mô tả lỗi.
- Danh sách các lựa chọn đoạn code sửa đúng (trắc nghiệm chọn đoạn code đúng để thay thế).

### Quy tắc nghiệp vụ

- MVP ưu tiên giao diện chọn lựa chọn thay vì kéo thả phức tạp để đảm bảo ổn định và dễ kiểm thử.

---

## F-EXERCISE-03 — Xem bài tập Fix the Bug (Drag-and-Drop)

**Mức ưu tiên:** P1  
**Actor:** Learner

### Nội dung

- Các mảnh code (code blocks) có thể kéo thả vào vị trí trống.
- Đây là cải tiến UI P1, backend vẫn nhận ID lựa chọn hoặc chuỗi code kết quả.

---

## F-EXERCISE-04 — Chấm bài tập tĩnh

**Mức ưu tiên:** P0  
**Actor:** System / Server

### Luồng chính

1. Server nhận câu trả lời của Learner.
2. Server truy vấn bảng `exercise_solutions` (server-only).
3. So sánh đáp án của Learner với `solution`:
   - Với Predict Output: So sánh `selectedOptionId` với `correctOptionId`.
   - Với Fix the Bug (MVP): So sánh `selectedOptionId` với `correctOptionId`.
4. Xác định kết quả `is_correct` (true/false).
5. Chuẩn bị feedback tương ứng.

### Quy tắc nghiệp vụ

- Việc chấm bài diễn ra hoàn toàn ở Server.
- Không đưa logic chấm bài xuống Client.
- Bảng `exercise_solutions` không có RLS read cho Learner.

---

# 9. Submission Module

## F-SUBMISSION-01 — Nộp bài tập

**Mức ưu tiên:** P0  
**Actor:** Learner

### Input

- `exerciseId`.
- `answer` (JSON object chứa `selectedOptionId`).

### Luồng chính

1. Learner chọn đáp án và nhấn "Nộp bài".
2. Server lấy `user_id` từ session.
3. Server kiểm tra Learner có quyền làm bài tập này không (bài học không bị `locked`).
4. Server tính số lần thử (`attempt_number = count + 1`).
5. Server thực hiện chấm bài (F-EXERCISE-04).
6. Server lưu kết quả vào bảng `submissions`.
7. Nếu kết quả **ĐÚNG** (`is_correct = true`):
   - Kiểm tra xem Learner đã hoàn thành tất cả bài tập bắt buộc trong bài học chưa.
   - Nếu đã hoàn thành đủ -> Cập nhật `user_progress` của bài học hiện tại thành `completed` và tự động `unlocked` bài học tiếp theo (F-PROGRESS-02).
8. Trả về kết quả cho Client: `is_correct`, `feedback`, `attemptNumber`, thông tin tiến độ bài học.

### Quy tắc nghiệp vụ

- Toàn bộ bước 4-7 phải nằm trong 1 Transaction / RPC duy nhất để đảm bảo tính nguyên tử.
- Không trả về toàn bộ đáp án đúng trong response nếu làm sai.

### API liên quan

```text
POST /api/exercises/:exerciseId/submissions
```

---

## F-SUBMISSION-02 — Xem lịch sử nộp bài

**Mức ưu tiên:** P1  
**Actor:** Learner

### Input

- `exerciseId`.

### Luồng chính

1. Learner xem lại danh sách các lần đã nộp bài tập đó.
2. Server trả về danh sách submissions của chính Learner đó.

---

# 10. Progress Module

## F-PROGRESS-01 — Cập nhật tiến độ học

**Mức ưu tiên:** P0  
**Actor:** System

### Quy tắc nghiệp vụ

- Trạng thái bài học gồm: `locked` -> `unlocked` -> `in_progress` -> `completed`.
- Bài học chuyển sang `completed` khi và chỉ khi Learner nộp đúng tất cả các bài tập có `is_required = true` trong bài học đó.
- Bài học đã `completed` sẽ không bị hạ xuống trạng thái khác dù Learner có làm lại bài tập và sai.

---

## F-PROGRESS-02 — Tự động mở khóa bài học tiếp theo

**Mức ưu tiên:** P0  
**Actor:** System

### Luồng chính

1. Khi bài học hiện tại chuyển sang `completed`.
2. Server tìm bài học tiếp theo trong khóa học dựa trên thứ tự:
   - Cùng chapter: `lesson_order` tiếp theo.
   - Hết chapter: `chapter_order` tiếp theo, `lesson_order` đầu tiên.
3. Nếu tìm thấy bài học tiếp theo và trạng thái của nó đang là `locked`:
   - Cập nhật `user_progress` của bài học đó thành `unlocked`.
4. Nếu tất cả bài học trong khóa học đã `completed`:
   - Cập nhật `course_enrollments.status = 'completed'` và ghi nhận `completed_at`.

---

# 11. AI Mentor Module

## F-AI-01 — Giải thích đáp án sai / bài tập

**Mức ưu tiên:** P0  
**Actor:** Learner

### Input

- `submissionId`.
- `question` (tùy chọn, câu hỏi thêm của Learner).

### Luồng chính

1. Learner nhấn "Nhờ AI giải thích" tại trang kết quả bài tập.
2. Server kiểm tra `submissionId` thuộc về đúng `user_id` hiện tại.
3. Server thu thập context phía Server:
   - Tiêu đề & nội dung bài học.
   - Nội dung bài tập & các lựa chọn.
   - Đáp án Learner đã chọn.
   - Đáp án đúng (lấy từ `exercise_solutions`).
   - Câu hỏi của Learner (nếu có).
4. Server gọi Prompt Builder tạo prompt.
5. Server gửi prompt tới AI Provider (Gemini / LLM).
6. Server nhận response, truyền qua Response Validator để kiểm tra cấu trúc JSON.
7. Server lưu kết quả vào bảng `ai_explanations`.
8. Server trả kết quả giải thích cho Learner.

### Context tối thiểu

- Lesson title hoặc content liên quan.
- Exercise type.
- Code snippet.
- Learner answer.
- Correct solution.
- User question.

### Quy tắc nghiệp vụ

- Không cần RAG trong MVP.
- Không cho client gửi system prompt.
- Không gọi AI từ browser.
- Có timeout.
- Có rate limit.
- Không gửi email hoặc secret đến provider.
- Không thực thi code AI trả về.

### API liên quan

```text
POST /api/ai/explanations
```

### Tiêu chí hoàn thành

- Explanation đúng schema.
- Provider lỗi được xử lý an toàn.
- User không dùng submission của người khác.
- Không lộ raw prompt hoặc API key.

---

## F-AI-02 — Xem lịch sử giải thích

**Mức ưu tiên:** P1  
**Actor:** Learner

### API liên quan

```text
GET /api/submissions/:submissionId/explanations
```

### Quy tắc nghiệp vụ

- Chỉ chủ submission được xem.
- Không trả raw prompt nếu không cần.

---

## F-AI-03 — Đề xuất bước học tiếp theo

**Mức ưu tiên:** P2  
**Actor:** Learner

### Gợi ý triển khai đơn giản

Không cần AI trong MVP.

Có thể dùng rule-based:

- Nếu lesson hiện tại chưa completed, đề xuất tiếp tục lesson đó.
- Nếu completed, đề xuất lesson unlocked tiếp theo.
- Nếu sai nhiều lần, đề xuất xem lại lesson hiện tại.

Chỉ dùng AI recommendation khi có yêu cầu rõ ràng sau.

---

# 13. AI Exercise Generation Module

## F-AIGEN-01 — Tạo bài tập bằng AI

**Mức ưu tiên:** P1  
**Actor:** Moderator hoặc System task được kiểm soát

### Input

- Lesson ID.
- Exercise type.
- Difficulty.
- Learning objective.
- Số lượng option.

### Luồng chính

1. Moderator yêu cầu tạo bài.
2. Server kiểm tra role.
3. Lấy lesson context.
4. Prompt Builder tạo prompt.
5. AI Provider trả structured response.
6. Response validator kiểm tra schema.
7. Lưu vào `generated_exercises` với trạng thái pending.
8. Không publish tự động.

### Quy tắc nghiệp vụ

- Chỉ hỗ trợ hai exercise type của MVP.
- Correct solution phải có.
- Generated content phải qua review.
- Provider response sai schema bị từ chối.

---

# 14. Content Moderation Module

## F-MOD-01 — Xem hàng đợi bài tập AI

**Mức ưu tiên:** P1  
**Actor:** Moderator, Admin

### Nội dung

- Generated exercise.
- Lesson liên quan.
- Type.
- Difficulty.
- Provider.
- Status.
- Created at.

### API liên quan

```text
GET /api/moderation/generated-exercises
```

---

## F-MOD-02 — Review bài tập AI

**Mức ưu tiên:** P1  
**Actor:** Moderator, Admin

### Quyết định

- Approved.
- Rejected.
- Needs Revision.

### Có thể chỉnh sửa

- Title.
- Description.
- Code snippet.
- Options.
- Solution.
- Explanation.
- Difficulty.

### Quy tắc nghiệp vụ

- Edited content phải validate lại.
- Mỗi review tạo lịch sử.
- Learner không truy cập được.
- Không review exercise đã published.

### API liên quan

```text
POST /api/moderation/generated-exercises/:id/reviews
```

---

## F-MOD-03 — Publish bài tập đã duyệt

**Mức ưu tiên:** P1  
**Actor:** Moderator, Admin

### Điều kiện trước

- Generated exercise ở trạng thái approved.
- Chưa publish.
- Lesson tồn tại.
- Content hợp lệ.

### Luồng chính

1. Tạo record trong `exercises`.
2. Tạo `exercise_options`.
3. Tạo `exercise_solutions`.
4. Liên kết `publishedExerciseId`.
5. Chuyển generated exercise thành published.
6. Ghi review/audit log.

### Quy tắc nghiệp vụ

- Thực hiện trong transaction.
- Không tạo exercise trùng.
- Pending hoặc rejected không được publish.

---

# 15. Profile Module

## F-PROFILE-01 — Xem hồ sơ cá nhân

**Mức ưu tiên:** P0  
**Actor:** Learner, Moderator, Admin

### Nội dung

- Username.
- Email.
- Role.
- Ngày tạo tài khoản.
- Thống kê học tập cơ bản nếu là Learner.

### Quy tắc nghiệp vụ

- User chỉ xem profile của mình qua endpoint thông thường.
- Admin dùng endpoint riêng khi quản lý user.

---

## F-PROFILE-02 — Cập nhật username

**Mức ưu tiên:** P1  
**Actor:** Authenticated user

### Quy tắc nghiệp vụ

- Username đúng validation.
- Username không bắt buộc unique trong MVP.
- Không update role.
- Không update active status.
- Không update user ID.

---

# 16. Admin Module

## F-ADMIN-01 — Xem danh sách người dùng

**Mức ưu tiên:** P1  
**Actor:** Admin

### Chức năng

- Pagination.
- Search theo email hoặc username.
- Filter theo role.
- Filter theo active status.

### API liên quan

```text
GET /api/admin/users
```

---

## F-ADMIN-02 — Thay đổi role

**Mức ưu tiên:** P1  
**Actor:** Admin

### Quy tắc nghiệp vụ

- Role hợp lệ:
  - learner.
  - moderator.
  - admin.
- Không có role Guest.
- Ghi audit log.
- Có thể ngăn hạ quyền admin cuối cùng.

### API liên quan

```text
PATCH /api/admin/users/:userId/role
```

---

## F-ADMIN-03 — Kích hoạt hoặc vô hiệu hóa tài khoản

**Mức ưu tiên:** P1  
**Actor:** Admin

### Quy tắc nghiệp vụ

- Ưu tiên deactivate thay vì xóa.
- Inactive user không truy cập route private.
- Ghi audit log.

### API liên quan

```text
PATCH /api/admin/users/:userId/status
```

---

## F-ADMIN-04 — Đặt lại mật khẩu

**Mức ưu tiên:** P2  
**Actor:** Admin hoặc chính user qua Supabase flow

### Lưu ý

Không tự tạo hoặc hiển thị password mới trong database ứng dụng.

Ưu tiên dùng Supabase password reset flow.

---

## F-ADMIN-05 — Xem trạng thái hệ thống

**Mức ưu tiên:** P2  
**Actor:** Admin

### Nội dung tối thiểu

- Database connected/unavailable.
- Application status.
- AI provider status nếu kiểm tra riêng.
- Timestamp.

Không hiển thị secret hoặc lỗi nội bộ chi tiết.

---

# 17. System Module

## F-SYSTEM-01 — Health check

**Mức ưu tiên:** P1  
**Actor:** System, Developer

### API liên quan

```text
GET /api/health
```

### Response

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

### Quy tắc nghiệp vụ

- Không trả database URL.
- Không trả API key.
- Không gọi AI provider ở basic health check.

---

## F-SYSTEM-02 — Audit log

**Mức ưu tiên:** P1  
**Actor:** System, Admin

### Sự kiện cần log

- Change role.
- Activate/deactivate account.
- Approve/reject exercise.
- Publish exercise.
- Tác vụ dùng service role có ảnh hưởng dữ liệu.

### Quy tắc nghiệp vụ

- Log được ghi server-side.
- User thường không được tạo, sửa hoặc xóa log.
- Mỗi log có actor, action, target, metadata an toàn và timestamp.
- Không lưu password, token, cookie, API key hoặc secret.
- Admin mutation và publish không được bật nếu audit storage bắt buộc chưa tồn tại.

---

# 18. Feature dependencies

```text
Authentication
  └── Profile

Course Catalog
  └── Enrollment
        └── Roadmap
              └── Lesson
                    └── Exercise
                          └── Submission
                                ├── Progress
                                └── AI Explanation

AI Exercise Generation
  └── Moderation
        └── Publish Exercise

Authentication
  └── Role Authorization
        ├── Moderator
        └── Admin
```

AI agent phải triển khai theo dependency.

Ví dụ:

- Không làm Roadmap trước khi có Enrollment và Progress model.
- Không làm AI Explanation trước khi có Submission.
- Không làm Publish trước khi có Generated Exercise và Review.
- Không làm Admin role change trước khi có server-side authorization.

---

# 19. MVP scope

## 19.1 Bắt buộc

- Register.
- Login.
- Logout.
- Profile cơ bản.
- Course list.
- Course detail.
- Enrollment.
- Roadmap.
- Lesson content.
- Predict the Output.
- Fix the Bug.
- Submission.
- Correct/Incorrect feedback.
- Retry sau đáp án sai.
- Progress.
- Unlock next lesson.
- AI explanation.
- Role authorization.
- RLS.
- Deployment cơ bản.
- Playwright cho critical flow.

## 19.2 Operations Extension / Nên có

- Search course.
- Submission history.
- AI explanation history.
- AI exercise generation.
- Moderator review.
- Publish generated exercise.
- Admin user management.
- Audit log.
- Health check.

## 19.3 Ngoài MVP

- Mobile native app.
- Offline learning.
- Payment.
- Subscription.
- Nhiều ngôn ngữ lập trình.
- Code execution sandbox.
- IDE hoàn chỉnh.
- Social network.
- Leaderboard phức tạp.
- Real-time multiplayer.
- RAG.
- Automatic AI publishing.
- Microservices.
- Advanced analytics.

---

# 20. Feature implementation template

Gemini/Antigravity không giao trực tiếp toàn bộ feature lớn cho Codex nếu feature chưa đủ nhỏ.

Task packet phải dùng mẫu:

```markdown
# TASK-XXX — Tên task

## Status
READY

## Owner
Codex

## Reviewer
Gemini / Antigravity

## Feature ID
F-...

## Objective
Một mục tiêu duy nhất và có thể kiểm tra.

## Dependencies
- TASK-...

## Required context
- `AGENTS.md`
- `CODEX.md`
- `docs/features.md`
- Các tài liệu chuyên biệt liên quan

## Current state
Code hoặc contract hiện có liên quan.

## In scope
- ...

## Out of scope
- ...

## Files allowed to change
- ...

## Files not allowed to change
- ...

## Implementation requirements
- ...

## API requirements
- ...

## Database requirements
- ...

## Security requirements
- ...

## UI requirements
- ...

## Tests required
- ...

## Acceptance criteria
- [ ] ...

## Required commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Expected handoff
- Implementation Report
- Files changed
- Commands executed
- Test results
- Known limitations
```

Các mục không liên quan ghi `Not applicable`.

Codex không được bắt đầu nếu thiếu:

- Objective.
- Files allowed to change.
- Acceptance criteria.
- Required commands.

Feature có database change phải xác định migration, generated types, RLS và test trước khi chuyển `READY`.

---

# 21. Definition of Done chung

Codex chỉ được chuyển implementation sang `READY_FOR_REVIEW` khi:

- Đúng feature/task objective.
- Không thêm chức năng ngoài In scope.
- Chỉ sửa `Files allowed to change`.
- UI đúng `ui.md` và design reference đã duyệt.
- API đúng `api_contract.md`.
- Database đúng `database.md`.
- Phân quyền đúng `security.md`.
- Code đúng `coding_standards.md`.
- Có test đúng `testing.md`.
- Có loading, empty và error state khi phù hợp.
- Không lộ secret.
- Không lộ solution.
- TypeScript không lỗi.
- Lint thành công.
- Unit/integration test liên quan thành công.
- Build thành công.
- E2E thành công nếu task yêu cầu.
- Documentation được cập nhật nếu behavior hoặc contract thay đổi.
- Implementation Report ghi đúng command và kết quả thật.

Gemini/Antigravity chỉ đánh dấu `VERIFIED` khi:

- Review diff thực tế.
- Không có thay đổi ngoài scope.
- Không còn finding Critical, High hoặc Medium.
- Required commands được chạy độc lập hoặc có bằng chứng đầy đủ.
- Acceptance criteria đều đạt.

Task chỉ chuyển `DONE` sau khi đã `VERIFIED` và được người dùng chấp nhận hoặc merge.

---

# 22. Quy tắc dành cho AI Agent

## 22.1 Context theo task

Mọi agent phải đọc:

```text
AGENTS.md
file theo vai trò: CODEX.md hoặc GEMINI.md
task packet đang hoạt động
Required context
source file liên quan trực tiếp
```

Không bắt buộc đọc toàn bộ tài liệu cho mọi task.

Planner phải đưa `features.md` vào context khi task thay đổi hành vi nghiệp vụ.

## 22.2 Workflow thủ công

Codex được dùng dưới dạng extension độc lập.

Không có automation bridge giữa Gemini và Codex.

```text
Gemini tạo task packet
→ người dùng chuyển task sang Codex
→ Codex implement + test + report
→ người dùng yêu cầu Gemini review
→ Gemini trả PASS hoặc FIX_REQUIRED
```

Gemini không được giả vờ đã tự gửi task cho Codex.

Codex không được tự chọn task tiếp theo.

## 22.3 Planner

Gemini/Antigravity phải:

1. Chọn đúng feature ID.
2. Kiểm tra dependency.
3. Chia feature thành task nhỏ.
4. Xác định Required context.
5. Khóa In scope và Out of scope.
6. Khóa Files allowed to change.
7. Xác định acceptance criteria và test.
8. Dừng nếu API, database hoặc business rule chưa rõ.

## 22.4 Implementer

Codex phải:

1. Chỉ làm một task `READY`.
2. Không tự thêm role, table, endpoint, enum hoặc status.
3. Không tự đổi tên field.
4. Không đổi kiến trúc để tiện code.
5. Không làm P1/P2 nếu task chỉ yêu cầu P0.
6. Không bỏ validation, authentication, authorization hoặc ownership check.
7. Không trả exercise solution cho client.
8. Không gọi AI từ browser.
9. Không dùng production database cho test.
10. Viết test cùng implementation.
11. Báo file, command, kết quả và giới hạn.
12. Chỉ trả `READY_FOR_REVIEW`, `FIXED_FOR_REVIEW` hoặc `BLOCKED`.

## 22.5 Reviewer/Tester

Gemini/Antigravity phải:

1. Review diff thực tế.
2. Kiểm tra scope, architecture, API, database, security, UI và test.
3. Không tự sửa code trong cùng vòng review.
4. Ghi finding cụ thể.
5. Chạy quality gate khi môi trường cho phép.
6. Chỉ trả PASS khi không còn finding chặn.

## 22.6 MCP

- `context`: tìm file và symbol.
- `context7`: tra API đúng package/version.
- `StitchMCP`: tạo reference theo `ui.md`, không quyết định business rule.
- `supabase`: ưu tiên local/read-only; schema change phải có migration.
- `playwright`: reproduce và review UI; không thay thế E2E test được commit.
- `github-mcp-server`: mặc định read-only; không tự merge, push hoặc thay settings.

Nếu thiếu quyết định quan trọng, agent phải trả `BLOCKED`, không tự phát minh.

---

# 23. Thứ tự triển khai gợi ý

Thứ tự task chi tiết được quản lý trong `TASKS.md`.

## Phase 0 — Documentation và Agent Workflow

- Khóa requirements, architecture và feature scope.
- Khóa database, API và security contract.
- Khóa `AGENTS.md`, `CODEX.md`, `GEMINI.md`.
- Khóa `ui.md`, `TASKS.md`, `ROADMAP.md`.
- Cross-document review.

## Phase 1 — Project Foundation

- Bootstrap Next.js.
- TypeScript strict.
- ESLint và Prettier.
- Vitest.
- Playwright.
- Supabase local.
- Environment validation.
- CI quality gates.
- API result và error foundation.

Chưa triển khai feature nghiệp vụ trong phase này.

## Phase 2 — Database và Auth Foundation

- Database migrations.
- Constraints và indexes.
- RLS policies.
- Transaction/RPC foundation.
- Seed.
- Generated Supabase types.
- Browser/server Supabase clients.
- Session, `requireUser` và role helpers.

## Phase 3 — Authentication và Learning Core

- F-AUTH-01.
- F-AUTH-02.
- F-AUTH-03.
- F-PROFILE-01.
- F-COURSE-01.
- F-COURSE-03.
- F-ENROLL-01.
- F-ROADMAP-01.
- F-LESSON-01.
- F-LESSON-02.

## Phase 4 — Exercise, Submission và Progress

- F-EXERCISE-01.
- F-EXERCISE-02.
- F-EXERCISE-03.
- F-EXERCISE-04.
- F-SUBMISSION-01.
- F-PROGRESS-01.
- F-PROGRESS-02.
- F-ROADMAP-02.

## Phase 5 — AI Mentor

- AI provider interface và mock provider.
- Prompt builder.
- Response validator.
- Timeout, rate limit và fallback.
- F-AI-01.
- F-AI-02 nếu được chọn.

## Phase 6 — Operations Extension

- F-AIGEN-01.
- F-MOD-01.
- F-MOD-02.
- F-MOD-03.
- F-ADMIN-01.
- F-ADMIN-02.
- F-ADMIN-03.
- F-SYSTEM-01.
- F-SYSTEM-02.

Operations Extension chỉ triển khai sau Core Learning MVP và khi người dùng xác nhận scope.

## Phase 7 — Hardening và Deployment

- Full RLS/security regression.
- Critical-flow Playwright.
- Accessibility review.
- Performance review.
- Preview deployment.
- Production checklist.
- Production deploy chỉ khi người dùng yêu cầu rõ.

---

# 24. Kết luận

Các feature được tổ chức theo module độc lập nhưng có dependency rõ ràng.
