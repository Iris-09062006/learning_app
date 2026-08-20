# UI Specification

## Topic and source review on the Admin Course screen

The Admin may keep the legacy file-only path or start with a topic. Research results are candidates
only; explicit checkboxes select at most eight, Research More preserves selection, and confirmation
alone starts selected-source ingestion. Manual URL and optional file attempts coexist with
discovered sources.

Each attempt shows Admin provenance/scores, status, source-specific failure, Retry, and Remove.
Partial success remains usable; all-failed state blocks outline generation. A source change before
Continue marks the outline stale and requires a replacement revision. Continue locks evidence,
then the existing Lesson generation/content review/publication UI continues unchanged and links to
the separate per-Lesson Exercise flow.

Topic, selection, loading, partial-failure, retry, stale, and locked states preserve labels, native
keyboard controls, visible focus, disabled/loading semantics, live status, and alert errors. No
learner citation UI, score, or private provenance UI is added.

## TASK-056 Admin deletion controls

- `/admin/users` labels deactivation of an active Learner as “Đuổi học viên”, explains
  that the account will be disabled, and asks for confirmation before sending the mutation.
- `/admin/courses` lists every non-archived Course (published or draft) for active Admins.
  “Xóa khóa học” confirms that catalog visibility/content publication will be removed while
  learning history remains, then removes the archived row from the table on success.
- Success uses `role=status`; failures use `role=alert`; buttons expose loading state.

## AI Course / AI Exercise Admin states

`/admin/content` trình bày Pipeline A theo stepper server-backed:

1. Upload và extract PDF.
2. Outline review: edit Course metadata, add/remove/reorder Lesson, regenerate, reject,
   Continue. Chưa hiển thị editor full content hoặc action Exercise.
3. Lesson generation progress: status/retry riêng theo Lesson.
4. Course review: edit/regenerate riêng Lesson, reject hoặc Publish.
5. Published confirmation: link official Course; item không còn trong pending queue sau
   reload.

Mỗi state có loading/empty/error/retry, `aria-live`, keyboard reorder alternative và
text label không phụ thuộc màu. UI không chuyển bước trước response persisted thành công.

Action Generate Exercises nằm trong context của một Published/Approved Lesson (Lesson
detail hoặc Admin Lesson row), không phải nút cấp Course/PDF. Kết quả dẫn sang moderation
Exercise riêng và nói rõ Exercise đang pending, chưa hiển thị cho learner.

## 1. Mục tiêu

Tài liệu này định nghĩa ngôn ngữ thiết kế, thiết kế hệ thống component, layout các màn hình và quy tắc trải nghiệm người dùng (UX) cho dự án **LearningApp**.

Mục tiêu:

- Tạo giao diện hiện đại, truyền cảm hứng học tập, lấy cảm hứng từ các nền tảng học lập trình hàng đầu (LearningVN, Duolingo, Exercism).
- Đảm bảo tính nhất quán về màu sắc, font chữ, khoảng cách và thành phần UI.
- Đáp ứng tốt trên các kích thước màn hình (Mobile, Tablet, Desktop).
- Đạt chuẩn truy cập (Accessibility - a11y).
- Cung cấp Hướng dẫn thiết kế chi tiết để AI Agent (Antigravity/Gemini/Codex) và StitchMCP triển khai UI chính xác mà không phải tự suy đoán.

---

## 2. Hướng thiết kế tổng thể (Design Direction)

- **Phong cách:** Modern EdTech / Clean / Friendly AI Learning.
- **Cảm giác mang lại:** Rõ ràng, không áp lực, khuyến khích tiến bộ từng bước, bài học ngắn gọn.
- **Màu sắc chủ đạo:**
  - Violet / Deep Indigo (Tri thức, Hiện đại, Công nghệ).
  - Bright Cyan / Mint (Điểm nhấn AI, Tiến độ, Năng động).
  - Emerald Green (Thành công, Nộp bài đúng, Hoàn thành).
  - Cool Gray (Nền trang, Thẻ bài học, Đường nối Lộ trình).

---

## 3. Design Tokens (Bộ mã thiết kế)

### 3.1 Bảng màu (Color Palette)

Sử dụng cấu hình Tailwind CSS chuẩn hoặc CSS Variables:

```text
--color-primary: #6366F1 (Indigo 500)
--color-primary-hover: #4F46E5 (Indigo 600)
--color-primary-light: #EEF2FF (Indigo 50)

--color-ai-accent: #06B6D4 (Cyan 500)
--color-ai-bg: #ECFEFF (Cyan 50)

--color-success: #10B981 (Emerald 500)
--color-success-bg: #D1FAE5 (Emerald 100)

--color-error: #EF4444 (Red 500)
--color-error-bg: #FEE2E2 (Red 100)

--color-warning: #F59E0B (Amber 500)
--color-warning-bg: #FEF3C7 (Amber 100)

--color-bg-main: #F8FAFC (Slate 50)
--color-surface: #FFFFFF (White)
--color-surface-border: #E2E8F0 (Slate 200)

--color-text-main: #0F172A (Slate 900)
--color-text-muted: #64748B (Slate 500)
--color-code-bg: #1E293B (Slate 800 - Code block tối)
```

### 3.2 Font chữ & Typography

- **Font thân bài (Body & UI):** `Inter`, `Roboto`, hoặc System Font sans-serif.
- **Font Code (Monospace):** `Fira Code`, `JetBrains Mono`, hoặc `ui-monospace`.

Cỡ chữ chuẩn:
- **H1 (Tiêu đề trang):** 28px - 32px / Bold (Font-weight: 700)
- **H2 (Tiêu đề Section / Chapter):** 20px - 24px / SemiBold (Font-weight: 600)
- **H3 (Tiêu đề Bài học / Card):** 16px - 18px / Medium (Font-weight: 500)
- **Body (Nội dung chính):** 14px - 16px / Normal (Font-weight: 400)
- **Small / Caption:** 12px - 13px / Normal

### 3.3 Bo góc (Border Radius) & Spacing

- Card / Modal / Drawer: `rounded-2xl` (16px) hoặc `rounded-xl` (12px).
- Nút bấm (Button) / Input: `rounded-lg` (8px).
- Badges / Status Pills: `rounded-full` (9999px).
- Spacing chuẩn: Bội số của 4px (4, 8, 12, 16, 24, 32, 48px).

---

## 4. Bố cục khung ứng dụng (App Shell Layout)

Hệ thống sử dụng bố cục khung chung gồm Navigation Sidebar (Desktop) và Bottom Bar (Mobile).

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Top Bar: Brand Logo | Course Selector | Progress Summary | User Profile │
├──────────────┬──────────────────────────────────────────────────────────┤
│ Sidebar      │ Main Content Area                                        │
│ - Dashboard  │ (Course Catalog / Roadmap / Lesson / Exercise)           │
│ - Roadmap    │                                                          │
│ - Profile    │                                                          │
│ - Admin/Mod  │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

- **Desktop (>= 1024px):** Sidebar cố định bên trái (Chiều rộng 240px - 260px).
- **Mobile (< 768px):** Navigation bar cố định dưới chân màn hình (Bottom Navigation Bar với 4 icon chính).

---

## 5. Màn hình Lộ trình bài học (Roadmap Page - Visual Learning Path)

Màn hình Roadmap là màn hình trung tâm, thể hiện hành trình học tập trực quan của người học.

```text
               [ Chapter 1: Biến & Kiểu dữ liệu ]
                               │
                    (Bài 1: Khai báo biến)  <-- [Completed] (Green Check)
                               │
                    (Bài 2: Kiểu số & Chuỗi) <-- [In Progress / Current] (Indigo Highlight)
                               │
                    (Bài 3: Bài tập tổng hợp) <-- [Locked] (Gray Lock Icon)
                               │
               [ Chapter 2: Cấu trúc điều kiện ]
                               │
                    (Bài 4: Câu lệnh If Else) <-- [Locked]
```

### Quy tắc thiết kế Roadmap:
- Mỗi Chapter là một thẻ Card bao bọc danh sách các bài học.
- Bài học được nối với nhau bằng đường nối thẳng đứng (Vertical Timeline Path).
- **4 Trạng thái nút Bài học (Lesson Nodes):**
  1. `Completed`: Viền/Nền xanh Emerald + Icon Check `✓` + Đã hoàn thành.
  2. `In Progress / Unlocked`: Viền Indigo sáng + Icon Play `▶` + Đang học / Sẵn sàng.
  3. `Locked`: Nền xám mờ + Icon Ổ khóa `🔒` + Chưa mở khóa (Không bấm được).
  4. `Selected`: Đang chọn để xem chi tiết.

---

## 6. Màn hình Bài tập & Chấm bài (Exercise Shell & Feedback)

Màn hình làm bài tập được chia thành 2 cột trên Desktop để tối ưu không gian đọc code và làm bài.

```text
┌──────────────────────────────────────┬──────────────────────────────────┐
│ Cột trái: Đề bài & Đoạn code mẫu     │ Cột phải: Khu vực nộp đáp án     │
│ - Tiêu đề bài tập & Mô tả            │ - Các lựa chọn (Radio Options)   │
│ - Code Block (Tối, Highlight syntax) │ - Nút [Nộp đáp án]               │
│                                      │ - Khung Phản hồi (Đúng/Sai)      │
│                                      │ - Nút [Hỏi AI Mentor]            │
└──────────────────────────────────────┴──────────────────────────────────┘
```

### 6.1 Trạng thái Phản hồi (Feedback Panel)
- **Khi nộp Đúng (`is_correct = true`):**
  - Khung màu xanh lá nhẹ (`--color-success-bg`).
  - Icon Chúc mừng + Dòng chữ "Chính xác! Bạn đã hoàn thành bài tập."
  - Nút bấm chính: `[Tiếp tục bài học]` (Màu xanh Emerald).
- **Khi nộp Sai (`is_correct = false`):**
  - Khung màu đỏ nhẹ (`--color-error-bg`).
  - Icon Thử lại + Dòng chữ "Chưa chính xác. Hãy kiểm tra lại đoạn code."
  - Nút bấm chính: `[Thử lại]`
  - Nút bấm phụ: `[Nhờ AI Mentor giải thích]` (Có icon AI ✨).

---

## 7. Giao diện Trợ lý AI (AI Mentor Drawer / Bottom Sheet)

AI Mentor xuất hiện dưới dạng một Slide-over Drawer từ bên phải (Desktop) hoặc Bottom Sheet (Mobile) khi người học yêu cầu.

```text
┌───────────────────────────────────────────┐
│ AI Mentor ✨                     [Đóng X] │
├───────────────────────────────────────────┤
│ Bối cảnh: Bài 2 - Biến trong Python       │
│                                           │
│ 🤖 AI Mentor:                             │
│ "Trong Python, bạn không thể cộng một     │
│ chuỗi với một số nguyên trực tiếp mà      │
│ chưa ép kiểu..."                          │
│                                           │
│ 💡 Gợi ý thử nghiệm:                       │
│ `print("Tuổi: " + str(20))`               │
├───────────────────────────────────────────┤
│ [ Nhập câu hỏi thêm cho AI...    ] [Gửi]  │
└───────────────────────────────────────────┘
```

### Quy tắc AI UI:
- Hiển thị rõ nhãn **"AI Content - Có thể chứa sai sót"** nhỏ ở chân trang.
- Có trạng thái Loading mượt mà khi chờ AI phản hồi (Typing indicator / Skeleton).
- Đoạn code do AI đưa ra phải nằm trong khung Code Block tối có nút Copy.

---

## 8. Hướng dẫn thiết kế cho StitchMCP (Stitch Prompts)

Khi Gemini/Antigravity yêu cầu StitchMCP tạo giao diện, phải tuân theo mẫu Prompt chuẩn sau:

```text
Design a modern, clean, responsive web interface for [TÊN MÀN HÌNH].
Target User: [Learner / Moderator / Admin].
Style: Friendly EdTech learning platform inspired by LearningVN.
Color Palette: Indigo primary (#6366F1), Cyan AI accent (#06B6D4), Emerald success (#10B981), Slate background (#F8FAFC).
Key Elements:
- Clean card layouts with 16px rounded corners.
- Clear status indicators (Icon + Text + Color).
- Dark theme code blocks (#1E293B) for Python code.
- Fully responsive (Desktop sidebar, Mobile bottom navigation).
- High contrast and accessible focus states.
```

---

## 9. Danh sách các màn hình chính trong hệ thống

1. `Public Landing Page` (`/`): Giới thiệu nền tảng & các khóa học.
2. `Auth Pages` (`/login`, `/register`): Đăng nhập & Đăng ký.
3. `Learner Dashboard` (`/dashboard`): Tổng quan khóa học đang học & Tiến độ.
4. `Course Catalog` (`/courses`): Danh sách các khóa học Python.
5. `Learning Roadmap` (`/courses/:id/roadmap`): Lộ trình bài học trực quan.
6. `Lesson Page` (`/lessons/:id`): Đọc lý thuyết bài học.
7. `Exercise Page` (`/exercises/:id`): Giao diện làm bài tập Predict Output / Fix Bug.
8. `Moderator Queue` (`/moderator/queue`): Hàng đợi duyệt bài tập AI.
9. `Admin User Management` (`/admin/users`): Quản lý người dùng & phân quyền.
# Admin PDF-to-Course screen

Route `/admin/content` dành riêng cho Admin, gồm các vùng responsive:

1. Upload/extraction và import-job status.
2. Outline queue/editor với Course metadata, add/remove/reorder Lesson, regenerate,
   reject và Continue.
3. Lesson generation status + retry riêng cho từng Lesson.
4. Course/Lesson content editor có citation, per-Lesson regenerate, reject và atomic
   Publish.

Mọi input có label, status pipeline dùng `aria-live`, lỗi dùng `role="alert"`, button có
loading/disabled state và focus ring. Citation hiển thị cạnh section tương ứng. Nút
Publish chỉ bật khi job ở `ready_to_publish`; UI vẫn không thay thế server/RLS. Không có
nút generate Exercise ở cấp PDF/Course; action đó chỉ xuất hiện trong Lesson context.
