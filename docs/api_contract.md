# API Contract

## Topic research and multi-source Course-import API — implemented

All new/extended routes require an active Admin, use the existing `{ success, data|error }`
envelope, and set `Cache-Control: no-store`. The surfaces are stateless
`POST /api/admin/course-research`; URL and staged-file ingestion; atomic ordered-set
`POST /api/admin/course-imports`; staged removal; job-scoped source list/attach/detach; and
job-wide outline generation. `{file}` retains legacy immediate initialization while
`{file,idempotencyKey}` stages without a job.

Stable errors include `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `INVALID_SOURCE_REFERENCE` (400), `SOURCE_LIMIT_EXCEEDED`, `SOURCE_CONFLICT`,
`SOURCE_MUTATION_LOCKED`, `STALE_OUTLINE` (409), `PAYLOAD_TOO_LARGE` (413),
`UNSUPPORTED_MEDIA_TYPE` (415), `INVALID_SOURCE`, `FETCH_FAILED`, `EXTRACTION_ERROR`,
`EXTRACTION_FAILED` (422), `RATE_LIMITED` (429 with `Retry-After`), recoverable
`SEARCH_PROVIDER_*` (503), and `PUBLICATION_FAILED` (500, safe to retry). Error envelopes expose
only approved public details (`retryAfterSeconds`, `sourceDocumentId`). Complete schemas are
normative in `specs/001-topic-course-research/contracts/openapi.yaml`.

## TASK-056 Admin course management endpoints

- `GET /api/admin/courses` requires an active Admin and returns
  `{ success: true, data: { items: AdminCourseSummary[] } }`. Archived courses are omitted.
- Archived courses are also omitted from Admin content-target choices and pending Course
  draft review batches.
- `DELETE /api/admin/courses/:courseId` requires an active Admin and atomically archives
  the course, returning `{ success: true, data: { courseId, archivedAt, auditLogId } }`.
- `PATCH /api/admin/users/:userId/status` with `{ isActive: false }` remains the
  authoritative learner-removal endpoint; the Admin UI presents it as “Đuổi học viên”.
- Invalid IDs return `400`, missing/already archived courses return `404`, unauthenticated
  callers return `401`, and non-Admin/inactive-Admin callers return `403`.

## AI Course and AI Exercise contract — target behavior

Contract này thay thế semantics TASK-055 trong đó một lần gọi AI tạo đồng thời Course
metadata và full content của mọi Lesson. Hai pipeline không dùng chung review action.

### Course import state

```ts
type CourseImportStatus =
  | "uploaded"
  | "processing"
  | "outline_review"
  | "generating_content"
  | "content_review"
  | "ready_to_publish"
  | "published"
  | "failed"
  | "rejected";
```

Tên lưu trong database có thể khác, nhưng API phải map về đúng semantics trên. Mọi
mutation trả state đã persist; client không được tự chuyển state hoặc tự loại item khỏi
queue khi server chưa resolve thành công.

### Course import endpoints

- `POST /api/admin/content-sources` upload source riêng tư và trả source/import identity.
- `POST /api/admin/content-sources/:id/extract` extract/normalize server-side.
- `POST /api/admin/content-sources/:id/course-outline` chỉ sinh outline; response không
  chứa full Lesson content hoặc exercise.
- `GET /api/admin/course-drafts` mặc định chỉ trả actionable items ở outline/content
  review hoặc retryable `failed`; published/rejected không quay lại pending queue sau reload.
- `PATCH /api/admin/course-drafts/:jobId/outline` sửa Course metadata, add,
  remove hoặc reorder Lesson outline. Server validate toàn outline sau mutation.
- `POST /api/admin/course-drafts/:jobId/outline/regenerate` regenerate outline
  và tạo revision mới; không sinh Lesson content.
- `POST /api/admin/course-drafts/:jobId/lessons/generate` là action Continue:
  khóa approved outline revision và sinh content cho các Lesson thuộc revision đó.
- `PATCH /api/admin/lesson-drafts/:id` sửa content của một Lesson draft.
- `POST /api/admin/course-drafts/:jobId/lessons/:outlineLessonId/regenerate` chỉ regenerate Lesson được chọn từ
  normalized source, Course metadata, approved outline và source references liên quan.
- `POST /api/admin/course-drafts/:jobId/reviews` nhận
  `{ decision: "rejected" | "needs_revision", comment? }` để resolve/request revision,
  hoặc `{ decision: "published", comment? }` để publish Course + Lessons atomically.

`published` chỉ hợp lệ từ `ready_to_publish`; response thành công trả
`{ sourceDocumentId, courseId, status: "published", lessonIds }`. Nếu bất kỳ Course,
Chapter, Lesson, publication marker hoặc audit write nào lỗi, request thất bại và không
record nào được public.

### Outline DTO

```ts
interface CourseOutlineDraft {
  title: string;
  description: string;
  learningObjectives: string[];
  lessons: Array<{
    clientKey: string;
    title: string;
    summary: string;
    learningObjectives: string[];
    sourceChunkIndexes: number[];
  }>;
}
```

`clientKey` là identity ổn định trong một outline revision để edit/reorder trước khi
official Lesson tồn tại. Unknown fields, empty objective, duplicate key, invalid source
reference và mọi field `exercise|quiz|answer|solution` đều bị từ chối.

### Exercise endpoints

`POST /api/ai/exercises/generate` nhận đúng một `lessonId`, difficulty và learning objective;
Exercise type do provider chọn từ Lesson title, summary, objectives và content,
không do client ép buộc. Server lấy Lesson title/summary/objectives/content làm context
chính và trả đúng một `generatedExercise` ở trạng thái `pending` có cùng `lessonId`.
Provider JSON phải chứa `type` đúng một lần và chỉ chứa các root field của nhánh type đã
chọn. Provider không được trả `difficulty`: application sở hữu giá trị request này và persist
nó độc lập, trong khi server persist `exercise_type` từ generated `content.type` đã validate.
Review/edit/publish tiếp tục dùng `/api/moderation/generated-exercises/**`; Course draft
API không được đọc, approve hoặc publish generated exercise.

### TASK-057 implementation status

Admin default flow now implements the two-stage endpoints and persisted state above through
migration `025_pdf_to_course_pipeline.sql`. The historical
`POST /api/admin/content-sources/:id/generate` behavior remains compatibility-only for old
data/workflows; the Admin PDF-to-Course UI does not call it.

## Separated content destinations (TASK-050; supersedes TASK-049 UI flow)

`GET /api/admin/content-targets` additionally returns `courses`, containing
`{ courseId, courseTitle }` options for the existing-course branch.

After the source document has been uploaded, `POST /api/admin/content-curriculum`
accepts one of two explicit bodies:

```json
{ "mode": "new", "courseTitle": "Toán ứng dụng", "sourceDocumentId": 42 }
```

```json
{ "mode": "existing", "courseId": 7, "sourceDocumentId": 42 }
```

The server derives the chapter and initial lesson title from the source document's
original filename without its final extension. New mode atomically creates an
unpublished course/chapter/lesson. Existing mode atomically appends an unpublished
chapter/lesson to the selected course. Both return `201` with a `ContentTarget`.
Only an active Admin may mutate; validation errors return `400`, missing source/course
returns `404`, and unexpected persistence failures return `500` in the standard JSON
envelope.

## Document-to-Lesson target extension (TASK-046)

`GET /api/admin/content-targets` returns the standard envelope with both `items`
(existing lesson targets) and `chapters` (allowed parents for a new target). Active
Admin only; no-store.

`POST /api/admin/content-targets` accepts:

```json
{ "chapterId": 12, "title": "Vòng lặp while" }
```

It returns `201` with a `ContentTarget`. The lesson is unpublished and receives the
next available order in its chapter. Invalid input returns `400`; a missing chapter
returns `404`.

## 1. Mục tiêu

Tài liệu này quy định hợp đồng giao tiếp giữa giao diện, server và các module nghiệp vụ của hệ thống.

Mục tiêu:

- Frontend và backend dùng cùng cấu trúc dữ liệu.
- AI agent không tự đoán tên field hoặc endpoint.
- API có cách trả kết quả và lỗi thống nhất.
- Quyền truy cập được kiểm tra rõ ràng.
- Có thể mở rộng thêm khóa học, dạng bài tập và AI provider.
- Không làm API phức tạp hơn mức cần thiết cho MVP.

API được triển khai bằng:

- Next.js Route Handlers.
- Next.js Server Actions cho một số form nội bộ.
- Supabase Auth để xác thực.
- Supabase PostgreSQL để lưu dữ liệu.

Base path:

```text
/api
```

---

## 1.1 Phạm vi theo milestone

Contract được chia thành hai nhóm:

### Core Learning MVP

- Auth và profile cơ bản.
- Course list và course detail.
- Enrollment.
- Roadmap.
- Lesson detail và start lesson.
- Exercise detail.
- Submission, progress và unlock lesson.
- AI explanation.
- Basic health check.

### P1 / Operations Extension

- Course search.
- Submission history đầy đủ.
- AI explanation history.
- AI-generated exercise moderation.
- Admin user management.
- Audit log và monitoring nâng cao.

Endpoint P1 vẫn được định nghĩa để giữ hướng mở rộng, nhưng không được triển khai trước dependency trong `TASKS.md` và `ROADMAP.md`.

---

## 2. Nguyên tắc chung

- API sử dụng JSON.
- Tên field dùng `camelCase`.
- Database dùng `snake_case`.
- Service hoặc mapper chịu trách nhiệm chuyển đổi giữa database và API.
- Không trả trực tiếp raw Supabase row nếu cấu trúc đó không đúng contract.
- Không trả secret, password, token hoặc service role key.
- Không trả `correctAnswer` trước khi learner nộp bài.
- Mọi input phải được validate ở server.
- Mọi endpoint riêng tư phải kiểm tra session.
- Endpoint Moderator và Admin phải kiểm tra role ở server.
- Route Handler hoặc Server Action chỉ làm delivery logic mỏng: parse, validate, authentication, authorization, gọi feature service và map response.
- Business logic nằm trong feature service; truy vấn Supabase nằm trong feature repository hoặc RPC đã chốt.
- Không chỉ dựa vào việc ẩn nút trên giao diện để phân quyền.

---

## 3. Authentication

API sử dụng Supabase Auth session.

Client gửi session thông qua cookie do Supabase SSR quản lý.

Server phải lấy user từ session:

```ts
const user = await requireUser();
```

Không tin tưởng:

```json
{
  "userId": "client-provided-id"
}
```

User ID phải được lấy từ session đã xác thực.

Các trạng thái:

| Trạng thái | Ý nghĩa |
|---|---|
| Guest | Chưa đăng nhập |
| Learner | Người học |
| Moderator | Người kiểm duyệt nội dung |
| Admin | Người quản trị |

---

## 4. Kiểu dữ liệu dùng chung

## 4.1 UserRole

```ts
type UserRole = "learner" | "moderator" | "admin";
```

---

## 4.2 ProgressStatus

```ts
type ProgressStatus =
  | "locked"
  | "unlocked"
  | "inProgress"
  | "completed";
```

Database mapping:

```text
locked       → locked
unlocked     → unlocked
inProgress   → in_progress
completed    → completed
```

---

## 4.3 ExerciseType

```ts
type ExerciseType =
  | "multipleChoice"
  | "trueFalse"
  | "shortAnswer"
  | "ordering"
  | "matching"
  | "scenario"
  | "fixTheBug"
  | "predictOutput";
```

Database mapping:

```text
fixTheBug      → fix_the_bug
predictOutput  → predict_output
multipleChoice → multiple_choice
trueFalse      → true_false
shortAnswer    → short_answer
ordering       → ordering
matching       → matching
scenario       → scenario
```

---

## 4.4 DifficultyLevel

```ts
type DifficultyLevel =
  | "easy"
  | "medium"
  | "hard";
```

---

## 4.5 GeneratedExerciseStatus

```ts
type GeneratedExerciseStatus =
  | "pending"
  | "needsRevision"
  | "approved"
  | "rejected"
  | "published";
```

---

## 5. Cấu trúc response chuẩn

## 5.1 Thành công

```ts
interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}
```

Ví dụ:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Python for Beginners"
  }
}
```

---

## 5.2 Thất bại

```ts
interface ApiFailure {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

`details` chỉ chứa lỗi validation an toàn hoặc metadata đã lọc. Không đưa raw Supabase error, SQL, stack trace, file path hoặc provider response vào field này.
```

Ví dụ:

```json
{
  "success": false,
  "error": {
    "code": "LESSON_LOCKED",
    "message": "Bạn cần hoàn thành bài học trước."
  }
}
```

---

## 5.3 Metadata

```ts
interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  requestId?: string;
}
```

---

## 6. Error codes

```ts
type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "LESSON_LOCKED"
  | "COURSE_NOT_ENROLLED"
  | "EXERCISE_NOT_AVAILABLE"
  | "INVALID_EXERCISE_ANSWER"
  | "AI_PROVIDER_ERROR"
  | "AI_RESPONSE_INVALID"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";
```

HTTP mapping:

| HTTP Status | Error code |
|---|---|
| 400 | VALIDATION_ERROR |
| 401 | UNAUTHENTICATED |
| 403 | FORBIDDEN |
| 404 | NOT_FOUND |
| 409 | CONFLICT |
| 423 | LESSON_LOCKED |
| 429 | RATE_LIMITED |
| 500 | DATABASE_ERROR, INTERNAL_ERROR |
| 502 | AI_PROVIDER_ERROR, AI_RESPONSE_INVALID |

Không trả stack trace cho client.

---

## 7. Pagination

Danh sách lớn dùng query:

```text
?page=1&pageSize=20
```

Giới hạn:

```text
page >= 1
1 <= pageSize <= 100
```

Response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

# 8. Auth API

Theo kiến trúc hiện tại, các mutation Auth được triển khai qua Next.js Route Handler hoặc Server Action để giữ validation, error mapping và session handling thống nhất.

Browser SDK chỉ được dùng cho thao tác session-safe đã được task cho phép rõ. Khi endpoint trong contract này tồn tại, frontend phải dùng endpoint đó thay vì tạo một auth flow song song.

## 8.1 Register

```text
POST /api/auth/register
```

Access:

```text
Guest
```

Request:

```ts
interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}
```

Ví dụ:

```json
{
  "email": "learner@example.com",
  "password": "StrongPassword123!",
  "username": "learner01"
}
```

Validation:

- Email hợp lệ.
- Username được trim và dài từ 3 đến 50 ký tự.
- Password tuân theo policy của Supabase.
- Username là display name và không bắt buộc unique trong MVP.
- Email trùng được xử lý qua Supabase Auth và trả thông báo an toàn, không lộ chi tiết nội bộ.

Response:

```ts
interface RegisterResponse {
  user: {
    id: string;
    email: string;
    username: string;
    role: "learner";
  };
  requiresEmailConfirmation: boolean;
}
```

---

## 8.2 Login

```text
POST /api/auth/login
```

Access:

```text
Guest
```

Request:

```ts
interface LoginRequest {
  email: string;
  password: string;
}
```

Response:

```ts
interface LoginResponse {
  user: CurrentUser;
}
```

Cookie session phải được thiết lập an toàn.

---

## 8.3 Logout

```text
POST /api/auth/logout
```

Access:

```text
Authenticated user
```

Request body:

```json
{}
```

Response:

```json
{
  "success": true,
  "data": {
    "loggedOut": true
  }
}
```

---

## 8.4 Current user

```text
GET /api/auth/me
```

Access:

```text
Authenticated user
```

Response:

```ts
interface CurrentUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
}
```

---

## 8.5 Forgot password

```text
POST /api/auth/forgot-password
```

Access:

```text
Guest
```

Request:

```ts
interface ForgotPasswordRequest {
  email: string;
}
```

Ví dụ:

```json
{
  "email": "learner@example.com"
}
```

Validation:

- Email hợp lệ.

Response (luôn trả về nội dung giống nhau bất kể email có tồn tại hay không để chống account enumeration):

```ts
interface ForgotPasswordResponse {
  submitted: true;
}
```

```json
{
  "success": true,
  "data": {
    "submitted": true
  }
}
```

Error codes:

| HTTP Status | Error code |
|---|---|
| 400 | VALIDATION_ERROR |
| 429 | RATE_LIMITED |

Quy tắc:

- Server gọi `supabase.auth.resetPasswordForEmail` với redirect URL là `<app origin>/reset-password` (origin lấy từ `NEXT_PUBLIC_SITE_URL`).
- Không trả về thông tin email có tồn tại hay không; user bị vô hiệu hóa cũng nhận response generic giống hệt.
- Không có endpoint server-side cho bước đặt mật khẩu mới. Bước đó dùng Supabase recovery session và client-side `supabase.auth.updateUser` tại `/reset-password` (xem ADR-024).

---

# 9. Profile API

## 9.1 Get current profile

```text
GET /api/profile
```

Access:

```text
Authenticated user
```

Response:

```ts
interface ProfileResponse {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: string;
}
```

---

## 9.2 Update profile

```text
PATCH /api/profile
```

Access:

```text
Authenticated user
```

Request:

```ts
interface UpdateProfileRequest {
  username?: string;
}
```

Không cho phép client cập nhật:

- role.
- isActive.
- id.
- email nếu chưa có use case riêng.

Response:

```ts
interface UpdateProfileResponse {
  id: string;
  username: string;
  updatedAt: string;
}
```

---

# 10. Course API

## 10.1 List published courses

```text
GET /api/courses
```

Access:

```text
Guest hoặc authenticated user
```

Query Core MVP:

```text
?page=1&pageSize=20
```

Query P1 khi `F-COURSE-02` được triển khai:

```text
?search=python&page=1&pageSize=20
```

Server không được tự bật search nếu feature và test tương ứng chưa được triển khai.

Response item:

```ts
interface CourseSummary {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  language: string;
  level: string;
  isEnrolled: boolean;
  completionPercentage: number | null;
}
```

Guest:

```text
isEnrolled = false
completionPercentage = null
```

---

## 10.2 Get course details

```text
GET /api/courses/:courseId
```

Access:

```text
Guest hoặc authenticated user
```

Response:

```ts
interface CourseDetail {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  language: string;
  level: string;
  chapterCount: number;
  lessonCount: number;
  isEnrolled: boolean;
}
```

Chỉ trả course đã published cho Guest và Learner.

---

## 10.3 Enroll course

```text
POST /api/courses/:courseId/enroll
```

Access:

```text
Learner
```

Request:

```json
{}
```

Nghiệp vụ:

1. Kiểm tra course tồn tại và published.
2. Tạo `course_enrollments`.
3. Tạo progress cho tất cả lesson đã publish của course.
4. Lesson đầu tiên theo `chapter_order` và `lesson_order` là `unlocked`.
5. Các lesson published còn lại là `locked`.
6. Toàn bộ enrollment và progress initialization chạy trong một transaction hoặc RPC an toàn.

Response:

```ts
interface EnrollCourseResponse {
  enrollmentId: number;
  courseId: number;
  enrolledAt: string;
  firstLessonId: number | null;
}
```

Nếu đã enroll:

```text
409 CONFLICT
```

---

# 11. Roadmap API

## 11.1 Get learner roadmap

```text
GET /api/courses/:courseId/roadmap
```

Access:

```text
Learner đã enroll
```

Response:

```ts
interface RoadmapResponse {
  course: {
    id: number;
    title: string;
  };
  completionPercentage: number;
  chapters: RoadmapChapter[];
}

interface RoadmapChapter {
  id: number;
  title: string;
  order: number;
  lessons: RoadmapLesson[];
}

interface RoadmapLesson {
  id: number;
  title: string;
  order: number;
  status: ProgressStatus;
  estimatedMinutes: number | null;
}
```

Không trả nội dung đầy đủ của lesson trong roadmap.

---

# 12. Lesson API

## 12.1 Get lesson

```text
GET /api/lessons/:lessonId
```

Access:

```text
Learner đã enroll và lesson không locked
```

Response:

```ts
interface LessonDetail {
  id: number;
  chapterId: number;
  title: string;
  content: string | null;
  order: number;
  estimatedMinutes: number | null;
  status: ProgressStatus;
  exercises: ExerciseSummary[];
  nextLesson: {
    id: number;
    title: string;
  } | null;
}

interface ExerciseSummary {
  id: number;
  title: string;
  type: ExerciseType;
  difficulty: DifficultyLevel;
  order: number;
  isRequired: boolean;
}
```

Nếu locked:

```text
423 LESSON_LOCKED
```

---

## 12.2 Start lesson

```text
POST /api/lessons/:lessonId/start
```

Access:

```text
Learner
```

Request:

```json
{}
```

Nghiệp vụ:

- Nếu `unlocked`, chuyển thành `inProgress`.
- Nếu đã `inProgress` hoặc `completed`, trả trạng thái hiện tại.
- Nếu `locked` nhưng là bài published liền sau một bài mà learner đã có quyền truy cập trong
  cùng course, cho phép chuyển thẳng thành `inProgress`. Đây là thao tác “Tiếp theo”; bài trước
  không bị đánh dấu `completed`.
- Nếu `locked` và không thỏa điều kiện liền sau, từ chối để không cho phép nhảy cóc tùy ý.

Response:

```ts
interface StartLessonResponse {
  lessonId: number;
  status: ProgressStatus;
  startedAt: string | null;
}
```

---

# 13. Exercise API

## 13.1 Get exercise

```text
GET /api/exercises/:exerciseId
```

Access:

```text
Learner có quyền truy cập lesson chứa exercise
```

Response chung:

```ts
interface ExerciseBase {
  id: number;
  lessonId: number;
  title: string;
  description: string;
  exerciseType: ExerciseType;
  difficulty: DifficultyLevel;
  order: number;
  isRequired: boolean;
}
```

Predict Output:

```ts
interface PredictOutputExercise extends ExerciseBase {
  type: "predictOutput";
  codeSnippet: string | null;
  options: ExerciseOption[];
}
```

Fix the Bug:

```ts
interface FixTheBugExercise extends ExerciseBase {
  type: "fixTheBug";
  codeSnippet: string | null;
  options: ExerciseOption[];
}

interface ChoiceExercise extends ExerciseBase {
  type: "multipleChoice" | "trueFalse" | "scenario";
  options: ExerciseOption[];
}

interface ShortAnswerExercise extends ExerciseBase {
  type: "shortAnswer";
}

interface OrderingExercise extends ExerciseBase {
  type: "ordering";
  options: ExerciseOption[];
}

interface MatchingExercise extends ExerciseBase {
  type: "matching";
  options: Array<ExerciseOption & { metadata: { answerOptions: string[] } }>;
}
```

Option:

```ts
interface ExerciseOption {
  id: number;
  content: string;
  order: number;
  metadata?: Record<string, unknown>;
}
```

Không trả:

```text
correctAnswer
solution
isCorrect của option
```

---

## 13.2 Submit exercise

```text
POST /api/exercises/:exerciseId/submissions
```

Access:

```text
Learner
```

Request:

```ts
interface SubmitExerciseRequest {
  answer: ChoiceAnswer | ShortAnswer | OrderingAnswer | MatchingAnswer;
}

interface PredictOutputAnswer {
  selectedOptionId: number;
}

interface FixTheBugAnswer {
  selectedOptionId: number;
}

type ChoiceAnswer = PredictOutputAnswer | FixTheBugAnswer;
interface ShortAnswer { answerText: string }
interface OrderingAnswer { orderedOptionIds: number[] }
interface MatchingAnswer { matches: Array<{ optionId: number; answer: string }> }
```

Server phải validate answer theo exercise type.

Trong MVP, `fixTheBug` chỉ nhận `selectedOptionId`. Trường `selectedSyntax` thuộc interaction kéo-thả P1 và chỉ được thêm sau khi `requirements.md`, `database.md`, contract và test được cập nhật cùng nhau.

Response:

```ts
interface SubmitExerciseResponse {
  submissionId: number;
  exerciseId: number;
  isCorrect: boolean;
  feedback: string;
  attemptNumber: number;
  lessonProgress: {
    lessonId: number;
    status: ProgressStatus;
    completionPercentage: number;
  };
  nextLesson?: {
    id: number;
    status: ProgressStatus;
  };
}
```

Không trả toàn bộ solution.

Có thể trả một explanation tĩnh ngắn sau khi nộp:

```ts
interface SubmitExerciseResponse {
  staticExplanation?: string;
}
```

Chỉ trả khi product requirement cho phép.

---

## 13.3 Get learner submissions

```text
GET /api/exercises/:exerciseId/submissions
```

Access:

```text
Learner
```

Query:

```text
?page=1&pageSize=20
```

Response item:

```ts
interface SubmissionSummary {
  id: number;
  exerciseId: number;
  answer: Record<string, unknown>;
  isCorrect: boolean;
  attemptNumber: number;
  submittedAt: string;
}
```

Chỉ trả submission của user hiện tại.

---

# 14. Progress API

## 14.1 Get course progress

```text
GET /api/courses/:courseId/progress
```

Access:

```text
Learner đã enroll
```

Response:

```ts
interface CourseProgressResponse {
  courseId: number;
  completedLessons: number;
  totalLessons: number;
  completionPercentage: number;
  lastAccessedLessonId: number | null;
}
```

---

## 14.2 Get lesson progress

```text
GET /api/lessons/:lessonId/progress
```

Access:

```text
Learner
```

Response:

```ts
interface LessonProgressResponse {
  lessonId: number;
  status: ProgressStatus;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;
}
```

Client không được có endpoint tự đặt lesson thành completed.

Trạng thái completed chỉ được cập nhật thông qua business logic sau khi submit exercise.

---

# 15. AI Mentor API

## 15.1 Explain submission

```text
POST /api/ai/explanations
```

Access:

```text
Learner
```

Request:

```ts
interface CreateAIExplanationRequest {
  submissionId: number;
  question?: string;
}
```

Validation:

- Submission phải thuộc user hiện tại.
- Submission phải tồn tại.
- Question tối đa theo giới hạn hệ thống.
- Có thể chỉ cho gọi khi submission sai.
- Áp dụng rate limit.

Server tự lấy:

- Lesson content.
- Exercise content.
- Learner answer.
- Correct solution.
- Exercise type.

Client không được gửi correct solution hoặc system prompt.

Response:

```ts
interface AIExplanationResponse {
  id: number;
  submissionId: number;
  explanation: string;
  example?: string;
  provider: string;
  model: string | null;
  createdAt: string;
}
```

Nếu AI lỗi:

```json
{
  "success": false,
  "error": {
    "code": "AI_PROVIDER_ERROR",
    "message": "Không thể tạo lời giải thích lúc này."
  }
}
```

---

## 15.2 Get explanation history

```text
GET /api/submissions/:submissionId/explanations
```

Access:

```text
Learner sở hữu submission
```

Response item:

```ts
interface AIExplanationHistoryItem {
  id: number;
  userQuestion: string | null;
  explanation: string;
  provider: string;
  model: string | null;
  createdAt: string;
}
```

Không trả raw prompt nếu không cần.

---

# 16. Moderator API

**Scope:** P1 / Operations Extension.

Không triển khai phần này trước AI generation, moderation schema, RLS và task tương ứng trong `TASKS.md`.

Tất cả endpoint phần này yêu cầu:

```text
role = moderator hoặc admin
```

## 16.1 List generated exercises

```text
GET /api/moderation/generated-exercises
```

Query:

```text
?status=pending&page=1&limit=20
```

Response item:

```ts
interface GeneratedExerciseSummary {
  id: number;
  lessonId: number;
  lessonTitle: string;
  title: string;
  exerciseType: ExerciseType;
  difficulty: DifficultyLevel;
  status: GeneratedExerciseStatus;
  provider: string;
  model: string | null;
  createdAt: string;
}
```

---

## 16.2 Get generated exercise details

```text
GET /api/moderation/generated-exercises/:id
```

Response:

```ts
interface GeneratedExerciseDetail {
  id: number;
  lessonId: number;
  title: string;
  description: string | null;
  type: ExerciseType;
  difficulty: DifficultyLevel;
  content: GeneratedExerciseContent;
  status: GeneratedExerciseStatus;
  provider: string;
  model: string | null;
  reviews: ExerciseReviewSummary[];
  publishedExerciseId: number | null;
  publishedAt: string | null;
  createdAt: string;
}

interface GeneratedExerciseBase {
  type: ExerciseType;
  title: string;
  description: string;
  explanation: string;
}

type GeneratedExerciseContent =
  | (GeneratedExerciseBase & { type: "multipleChoice"; options: string[]; correctAnswer: string })
  | (GeneratedExerciseBase & { type: "trueFalse"; correctAnswer: boolean })
  | (GeneratedExerciseBase & { type: "shortAnswer"; expectedAnswer: string })
  | (GeneratedExerciseBase & { type: "ordering"; items: string[]; correctOrder: string[] })
  | (GeneratedExerciseBase & { type: "matching"; pairs: Array<{ prompt: string; answer: string }> })
  | (GeneratedExerciseBase & { type: "scenario"; scenario: string; options: string[]; correctAnswer: string })
  | (GeneratedExerciseBase & { type: "predictOutput" | "fixTheBug"; codeSnippet: string; options: string[]; correctAnswer: string });

interface GeneratedExerciseDraft {
  title: string;
  description: string;
  exerciseType: ExerciseType;
  difficulty: DifficultyLevel;
  content: GeneratedExerciseContent;
}

interface ExerciseReviewSummary {
  id: number;
  reviewerId: string;
  status: "approved" | "rejected" | "needs_revision";
  feedback: string | null;
  createdAt: string;
}
```

Các field solution (`correctAnswer`, `expectedAnswer`, `correctOrder`, `pairs`) chỉ xuất hiện trong endpoint Moderator/Admin này sau khi server đã kiểm tra role. Khi publish, server ánh xạ chúng sang `exercise_solutions` server-only. Không reuse DTO này cho Learner UI.

---

## 16.3 Review generated exercise

```text
POST /api/moderation/generated-exercises/:id/reviews
```

Request:

```ts
interface ReviewGeneratedExerciseRequest {
  decision: "approved" | "rejected" | "needs_revision";
  comment?: string;
  editedDraft?: GeneratedExerciseDraft;
}
```

Response:

```ts
interface ExerciseReviewResponse {
  reviewId: number;
  generatedExerciseId: number;
  reviewerId: string;
  decision: "approved" | "rejected" | "needs_revision";
  status: GeneratedExerciseStatus;
  reviewedAt: string;
}
```

Nghiệp vụ:

- Chỉ review generated exercise chưa `published`.
- Nếu có `editedDraft`, validate toàn bộ common fields, discriminator và đúng các field riêng của modality; từ chối field thừa hoặc field coding trên modality không-code.
- Cập nhật generated exercise thành snapshot mới trong cùng transaction với review.
- Lưu full edited snapshot vào review history khi có chỉnh sửa.
- `approved` không đồng nghĩa đã publish.

---

## 16.4 Publish generated exercise

```text
POST /api/moderation/generated-exercises/:id/publish
```

Access:

```text
Moderator hoặc Admin
```

Request:

```json
{}
```

Điều kiện:

- Generated exercise phải ở trạng thái `approved`.
- Chưa được publish trước đó.
- Draft hiện tại hợp lệ.
- Lesson và parent content đã publish.
- Audit logging tối thiểu đã được cấu hình cho action publish.

Response:

```ts
interface PublishGeneratedExerciseResponse {
  generatedExerciseId: number;
  publishedExerciseId: number;
  status: "published";
  publishedAt: string;
}
```

Toàn bộ thao tác phải chạy trong transaction/RPC, tạo exercise, options, private solution, cập nhật `publishedExerciseId`, `publishedAt` và audit record.

Nếu request bị gửi lại sau khi đã publish:

```text
200 OK với cùng `publishedExerciseId` (idempotent retry)
```

---
# 17. Admin API

**Scope:** P1 / Operations Extension.

Các mutation Admin chỉ được bật sau khi audit log storage, server authorization và security tests đã hoàn thành.

Tất cả endpoint yêu cầu:

```text
role = admin
```

Email được lấy từ Supabase Auth phía server. Không lưu email hoặc password trong `profiles`.

## 17.1 List users

```text
GET /api/admin/users
```

Query:

```text
?search=learner&role=learner&page=1&pageSize=20
```

Response item:

```ts
interface AdminUserSummary {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}
```

---

## 17.2 Get user

```text
GET /api/admin/users/:userId
```

Response:

```ts
interface AdminUserDetail extends AdminUserSummary {
  enrollmentCount: number;
  completedLessonCount: number;
  lastActiveAt: string | null;
}
```

`lastActiveAt` là field dẫn xuất từ dữ liệu hoạt động được contract hóa, ưu tiên `max(user_progress.last_accessed_at)`. Không tự thêm cột database chỉ để phục vụ field này.

Không trả password, token, cookie hoặc raw auth metadata.

---

## 17.3 Change user role

```text
PATCH /api/admin/users/:userId/role
```

Request:

```ts
interface ChangeUserRoleRequest {
  role: UserRole;
}
```

Nghiệp vụ:

- Không cho Guest role.
- Không nhận actor ID từ client.
- Ghi `admin_logs` trong cùng use case.
- Chặn Admin tự hạ quyền nếu đó là active Admin cuối cùng, khi rule này được triển khai.
- Không cho client update trực tiếp `profiles.role`.

Response:

```ts
interface ChangeUserRoleResponse {
  userId: string;
  role: UserRole;
  updatedAt: string;
  auditLogId: number;
}
```

---

## 17.4 Activate or deactivate user

```text
PATCH /api/admin/users/:userId/status
```

Request:

```ts
interface ChangeUserStatusRequest {
  isActive: boolean;
}
```

Nghiệp vụ:

- Ưu tiên deactivate thay vì xóa user.
- Không cho Admin vô hiệu hóa active Admin cuối cùng.
- Ghi `admin_logs`.
- Session hiện có của user bị vô hiệu hóa phải bị từ chối ở request riêng tư tiếp theo.

Response:

```ts
interface ChangeUserStatusResponse {
  userId: string;
  isActive: boolean;
  updatedAt: string;
  auditLogId: number;
}
```

---

## 17.5 Admin-triggered password recovery

```text
POST /api/admin/users/:userId/recover
```

Request body: empty.

Rules:

- Only an active Admin may call the endpoint.
- The target must exist and be active. An Admin must use the self-service recovery flow for their own account.
- The server resolves the target email through Supabase Auth and sends a recovery email whose redirect is `<NEXT_PUBLIC_SITE_URL>/reset-password`.
- The endpoint never returns or logs a password, recovery token, or recovery link.
- Each Admin/target pair is limited to 5 requests per hour. Exceeding the limit returns `429 RATE_LIMITED` with `Retry-After`.
- The attempt is recorded in `admin_logs` with action `user.password_recovery_requested` before the external email request is sent.

Response:

```ts
interface SendPasswordRecoveryResponse {
  userId: string;
  email: string;
  requestedAt: string;
  auditLogId: number;
}
```

---
# 18. Health API

## 18.1 Basic health check

```text
GET /api/system/health
```

Access:

```text
Public
```

Response:

```ts
interface HealthResponse {
  status: "ok" | "degraded";
  database: "connected" | "unavailable";
  timestamp: string;
}
```

Không trả:

- Database URL.
- Secret.
- Provider API key.
- Stack trace.

---

# 19. Request validation schemas

Dùng Zod hoặc công cụ tương đương.

Route phải validate route params trước, sau đó service tải exercise và chọn answer schema theo `exercise_type`.

MVP:

```ts
import { z } from "zod";

export const selectedOptionAnswerSchema = z.object({
  selectedOptionId: z.number().int().positive(),
});

export const submitExerciseRequestSchema = z.object({
  answer: selectedOptionAnswerSchema,
});
```

Cả `predictOutput` và `fixTheBug` P0 đều dùng `selectedOptionId`. Không thêm `selectedSyntax` trước contract P1.

AI explanation:

```ts
export const createAIExplanationSchema = z.object({
  submissionId: z.number().int().positive(),
  question: z.string().trim().min(1).max(1000).optional(),
});
```

Pagination:

```ts
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
```

Validation client không thay thế validation server.

---
# 20. API mapper

Database field:

```text
created_at
exercise_type
is_published
```

API field:

```text
createdAt
type
isPublished
```

Mapper phải nằm ở service hoặc mapper file.

Ví dụ:

```ts
function mapCourseRow(row: CourseRow): CourseSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    language: row.language,
    level: row.level,
    isEnrolled: false,
    completionPercentage: null,
  };
}
```

Không trả database row trực tiếp từ Route Handler.

---

# 21. Idempotency

Các endpoint nên xử lý an toàn khi request bị gửi lại.

Ví dụ:

## Enroll course

Nếu đã enroll:

- Có thể trả `409 CONFLICT`, hoặc
- Trả enrollment hiện có nếu nhóm chọn idempotent behavior.

Phải chọn một cách và giữ thống nhất.

Contract hiện tại chọn:

```text
409 CONFLICT
```

## Publish generated exercise

Nếu đã publish:

```text
409 CONFLICT
```

Không tạo exercise trùng.

---

# 22. Rate limiting

Endpoint cần rate limit:

```text
POST /api/ai/explanations
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password
POST /api/admin/users/:userId/recover
POST /api/moderation/generated-exercises/:id/publish
```

Giới hạn cụ thể từng endpoint được ghi tại `docs/security.md` — Mục 9.
# Admin PDF-to-Course API

Mọi route dưới đây yêu cầu active Admin, trả envelope chuẩn và
`Cache-Control: no-store`.

| Method | Route | Request | Success |
|---|---|---|---|
| `POST` | `/api/admin/content-sources` | multipart `file` | `201 SourceDocument` |
| `POST` | `/api/admin/content-sources/:id/extract` | — | extraction summary |
| `POST` | `/api/admin/content-sources/:id/course-outline` | — | `201 CourseOutlineDraft` |
| `GET` | `/api/admin/course-drafts` | unresolved filter | `{ items: CourseDraft[] }` |
| `PATCH` | `/api/admin/course-drafts/:id/outline` | outline mutation | new outline revision |
| `POST` | `/api/admin/course-drafts/:id/outline/regenerate` | — | new outline revision |
| `POST` | `/api/admin/course-drafts/:id/lessons/generate` | — | per-Lesson generation states |
| `GET` | `/api/admin/lesson-drafts/:id` | — | content draft + citations |
| `PATCH` | `/api/admin/lesson-drafts/:id` | structured draft | new revision/status |
| `POST` | `/api/admin/lesson-drafts/:id/regenerate` | — | new content revision |
| `POST` | `/api/admin/course-drafts/:id/reviews` | Course decision | persisted state/publication |

Upload giới hạn 10 MiB và MIME theo `docs/document-to-lesson.md`. `409 INVALID_STATE`
được dùng khi gọi sai thứ tự pipeline; invalid input trả `400`; authentication/
authorization trả `401`/`403`.

Các endpoint `content-targets`, `content-curriculum`,
`content-sources/:id/generate { targetLessonId }` và one-Lesson review/publish là
compatibility surface lịch sử. Chúng không thuộc Admin PDF-to-Course default flow và
không được dùng để bỏ qua outline review hoặc tạo official curriculum trước Publish.
