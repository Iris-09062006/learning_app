# API Contract

## Topic research and multi-source Course-import API â€” implemented

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
  authoritative learner-removal endpoint; the Admin UI presents it as â€œÄuá»•i há»c viÃªnâ€.
- Invalid IDs return `400`, missing/already archived courses return `404`, unauthenticated
  callers return `401`, and non-Admin/inactive-Admin callers return `403`.

## AI Course and AI Exercise contract â€” target behavior

Contract nÃ y thay tháº¿ semantics TASK-055 trong Ä‘Ã³ má»™t láº§n gá»i AI táº¡o Ä‘á»“ng thá»i Course
metadata vÃ  full content cá»§a má»i Lesson. Hai pipeline khÃ´ng dÃ¹ng chung review action.

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

TÃªn lÆ°u trong database cÃ³ thá»ƒ khÃ¡c, nhÆ°ng API pháº£i map vá» Ä‘Ãºng semantics trÃªn. Má»i
mutation tráº£ state Ä‘Ã£ persist; client khÃ´ng Ä‘Æ°á»£c tá»± chuyá»ƒn state hoáº·c tá»± loáº¡i item khá»i
queue khi server chÆ°a resolve thÃ nh cÃ´ng.

### Course import endpoints

- `POST /api/admin/content-sources` upload source riÃªng tÆ° vÃ  tráº£ source/import identity.
- `POST /api/admin/content-sources/:id/extract` extract/normalize server-side.
- `POST /api/admin/content-sources/:id/course-outline` chá»‰ sinh outline; response khÃ´ng
  chá»©a full Lesson content hoáº·c exercise.
- `GET /api/admin/course-drafts` máº·c Ä‘á»‹nh chá»‰ tráº£ actionable items á»Ÿ outline/content
  review hoáº·c retryable `failed`; published/rejected khÃ´ng quay láº¡i pending queue sau reload.
- `PATCH /api/admin/course-drafts/:jobId/outline` sá»­a Course metadata, add,
  remove hoáº·c reorder Lesson outline. Server validate toÃ n outline sau mutation.
- `POST /api/admin/course-drafts/:jobId/outline/regenerate` regenerate outline
  vÃ  táº¡o revision má»›i; khÃ´ng sinh Lesson content.
- `POST /api/admin/course-drafts/:jobId/lessons/generate` lÃ  action Continue:
  khÃ³a approved outline revision vÃ  sinh content cho cÃ¡c Lesson thuá»™c revision Ä‘Ã³.
- `PATCH /api/admin/lesson-drafts/:id` sá»­a content cá»§a má»™t Lesson draft.
- `POST /api/admin/course-drafts/:jobId/lessons/:outlineLessonId/regenerate` chá»‰ regenerate Lesson Ä‘Æ°á»£c chá»n tá»«
  normalized source, Course metadata, approved outline vÃ  source references liÃªn quan.
- `POST /api/admin/course-drafts/:jobId/reviews` nháº­n
  `{ decision: "rejected" | "needs_revision", comment? }` Ä‘á»ƒ resolve/request revision,
  hoáº·c `{ decision: "published", comment? }` Ä‘á»ƒ publish Course + Lessons atomically.

`published` chá»‰ há»£p lá»‡ tá»« `ready_to_publish`; response thÃ nh cÃ´ng tráº£
`{ sourceDocumentId, courseId, status: "published", lessonIds }`. Náº¿u báº¥t ká»³ Course,
Chapter, Lesson, publication marker hoáº·c audit write nÃ o lá»—i, request tháº¥t báº¡i vÃ  khÃ´ng
record nÃ o Ä‘Æ°á»£c public.

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

`clientKey` lÃ  identity á»•n Ä‘á»‹nh trong má»™t outline revision Ä‘á»ƒ edit/reorder trÆ°á»›c khi
official Lesson tá»“n táº¡i. Unknown fields, empty objective, duplicate key, invalid source
reference vÃ  má»i field `exercise|quiz|answer|solution` Ä‘á»u bá»‹ tá»« chá»‘i.

### Exercise endpoints

`POST /api/ai/exercises/generate` nháº­n Ä‘Ãºng má»™t `lessonId`, difficulty vÃ  learning objective;
Exercise type do provider chá»n tá»« Lesson title, summary, objectives vÃ  content,
khÃ´ng do client Ã©p buá»™c. Server láº¥y Lesson title/summary/objectives/content lÃ m context
chÃ­nh vÃ  tráº£ Ä‘Ãºng má»™t `generatedExercise` á»Ÿ tráº¡ng thÃ¡i `pending` cÃ³ cÃ¹ng `lessonId`.
Provider JSON pháº£i chá»©a `type` Ä‘Ãºng má»™t láº§n vÃ  chá»‰ chá»©a cÃ¡c root field cá»§a nhÃ¡nh type Ä‘Ã£
chá»n. Provider khÃ´ng Ä‘Æ°á»£c tráº£ `difficulty`: application sá»Ÿ há»¯u giÃ¡ trá»‹ request nÃ y vÃ  persist
nÃ³ Ä‘á»™c láº­p, trong khi server persist `exercise_type` tá»« generated `content.type` Ä‘Ã£ validate.
Review/edit/publish tiáº¿p tá»¥c dÃ¹ng `/api/moderation/generated-exercises/**`; Course draft
API khÃ´ng Ä‘Æ°á»£c Ä‘á»c, approve hoáº·c publish generated exercise.

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
{ "mode": "new", "courseTitle": "ToÃ¡n á»©ng dá»¥ng", "sourceDocumentId": 42 }
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
{ "chapterId": 12, "title": "VÃ²ng láº·p while" }
```

It returns `201` with a `ContentTarget`. The lesson is unpublished and receives the
next available order in its chapter. Invalid input returns `400`; a missing chapter
returns `404`.

## 1. Má»¥c tiÃªu

TÃ i liá»‡u nÃ y quy Ä‘á»‹nh há»£p Ä‘á»“ng giao tiáº¿p giá»¯a giao diá»‡n, server vÃ  cÃ¡c module nghiá»‡p vá»¥ cá»§a há»‡ thá»‘ng.

Má»¥c tiÃªu:

- Frontend vÃ  backend dÃ¹ng cÃ¹ng cáº¥u trÃºc dá»¯ liá»‡u.
- AI agent khÃ´ng tá»± Ä‘oÃ¡n tÃªn field hoáº·c endpoint.
- API cÃ³ cÃ¡ch tráº£ káº¿t quáº£ vÃ  lá»—i thá»‘ng nháº¥t.
- Quyá»n truy cáº­p Ä‘Æ°á»£c kiá»ƒm tra rÃµ rÃ ng.
- CÃ³ thá»ƒ má»Ÿ rá»™ng thÃªm khÃ³a há»c, dáº¡ng bÃ i táº­p vÃ  AI provider.
- KhÃ´ng lÃ m API phá»©c táº¡p hÆ¡n má»©c cáº§n thiáº¿t cho MVP.

API Ä‘Æ°á»£c triá»ƒn khai báº±ng:

- Next.js Route Handlers.
- Next.js Server Actions cho má»™t sá»‘ form ná»™i bá»™.
- Supabase Auth Ä‘á»ƒ xÃ¡c thá»±c.
- Supabase PostgreSQL Ä‘á»ƒ lÆ°u dá»¯ liá»‡u.

Base path:

```text
/api
```

---

## 1.1 Pháº¡m vi theo milestone

Contract Ä‘Æ°á»£c chia thÃ nh hai nhÃ³m:

### Core Learning MVP

- Auth vÃ  profile cÆ¡ báº£n.
- Course list vÃ  course detail.
- Enrollment.
- Roadmap.
- Lesson detail vÃ  start lesson.
- Exercise detail.
- Submission, progress vÃ  unlock lesson.
- AI explanation.
- Basic health check.

### P1 / Operations Extension

- Course search.
- Submission history Ä‘áº§y Ä‘á»§.
- AI explanation history.
- AI-generated exercise moderation.
- Admin user management.
- Audit log vÃ  monitoring nÃ¢ng cao.

Endpoint P1 váº«n Ä‘Æ°á»£c Ä‘á»‹nh nghÄ©a Ä‘á»ƒ giá»¯ hÆ°á»›ng má»Ÿ rá»™ng, nhÆ°ng khÃ´ng Ä‘Æ°á»£c triá»ƒn khai trÆ°á»›c dependency trong `TASKS.md` vÃ  `ROADMAP.md`.

---

## 2. NguyÃªn táº¯c chung

- API sá»­ dá»¥ng JSON.
- TÃªn field dÃ¹ng `camelCase`.
- Database dÃ¹ng `snake_case`.
- Service hoáº·c mapper chá»‹u trÃ¡ch nhiá»‡m chuyá»ƒn Ä‘á»•i giá»¯a database vÃ  API.
- KhÃ´ng tráº£ trá»±c tiáº¿p raw Supabase row náº¿u cáº¥u trÃºc Ä‘Ã³ khÃ´ng Ä‘Ãºng contract.
- KhÃ´ng tráº£ secret, password, token hoáº·c service role key.
- KhÃ´ng tráº£ `correctAnswer` trÆ°á»›c khi learner ná»™p bÃ i.
- Má»i input pháº£i Ä‘Æ°á»£c validate á»Ÿ server.
- Má»i endpoint riÃªng tÆ° pháº£i kiá»ƒm tra session.
- Endpoint Moderator vÃ  Admin pháº£i kiá»ƒm tra role á»Ÿ server.
- Route Handler hoáº·c Server Action chá»‰ lÃ m delivery logic má»ng: parse, validate, authentication, authorization, gá»i feature service vÃ  map response.
- Business logic náº±m trong feature service; truy váº¥n Supabase náº±m trong feature repository hoáº·c RPC Ä‘Ã£ chá»‘t.
- KhÃ´ng chá»‰ dá»±a vÃ o viá»‡c áº©n nÃºt trÃªn giao diá»‡n Ä‘á»ƒ phÃ¢n quyá»n.

---

## 3. Authentication

API sá»­ dá»¥ng Supabase Auth session.

Client gá»­i session thÃ´ng qua cookie do Supabase SSR quáº£n lÃ½.

Server pháº£i láº¥y user tá»« session:

```ts
const user = await requireUser();
```

KhÃ´ng tin tÆ°á»Ÿng:

```json
{
  "userId": "client-provided-id"
}
```

User ID pháº£i Ä‘Æ°á»£c láº¥y tá»« session Ä‘Ã£ xÃ¡c thá»±c.

CÃ¡c tráº¡ng thÃ¡i:

| Tráº¡ng thÃ¡i | Ã nghÄ©a |
|---|---|
| Guest | ChÆ°a Ä‘Äƒng nháº­p |
| Learner | NgÆ°á»i há»c |
| Moderator | NgÆ°á»i kiá»ƒm duyá»‡t ná»™i dung |
| Admin | NgÆ°á»i quáº£n trá»‹ |

---

## 4. Kiá»ƒu dá»¯ liá»‡u dÃ¹ng chung

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
locked       â†’ locked
unlocked     â†’ unlocked
inProgress   â†’ in_progress
completed    â†’ completed
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
fixTheBug      â†’ fix_the_bug
predictOutput  â†’ predict_output
multipleChoice â†’ multiple_choice
trueFalse      â†’ true_false
shortAnswer    â†’ short_answer
ordering       â†’ ordering
matching       â†’ matching
scenario       â†’ scenario
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

## 5. Cáº¥u trÃºc response chuáº©n

## 5.1 ThÃ nh cÃ´ng

```ts
interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}
```

VÃ­ dá»¥:

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

## 5.2 Tháº¥t báº¡i

```ts
interface ApiFailure {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

`details` chá»‰ chá»©a lá»—i validation an toÃ n hoáº·c metadata Ä‘Ã£ lá»c. KhÃ´ng Ä‘Æ°a raw Supabase error, SQL, stack trace, file path hoáº·c provider response vÃ o field nÃ y.
```

VÃ­ dá»¥:

```json
{
  "success": false,
  "error": {
    "code": "LESSON_LOCKED",
    "message": "Báº¡n cáº§n hoÃ n thÃ nh bÃ i há»c trÆ°á»›c."
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

KhÃ´ng tráº£ stack trace cho client.

---

## 7. Pagination

Danh sÃ¡ch lá»›n dÃ¹ng query:

```text
?page=1&pageSize=20
```

Giá»›i háº¡n:

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

Theo kiáº¿n trÃºc hiá»‡n táº¡i, cÃ¡c mutation Auth Ä‘Æ°á»£c triá»ƒn khai qua Next.js Route Handler hoáº·c Server Action Ä‘á»ƒ giá»¯ validation, error mapping vÃ  session handling thá»‘ng nháº¥t.

Browser SDK chá»‰ Ä‘Æ°á»£c dÃ¹ng cho thao tÃ¡c session-safe Ä‘Ã£ Ä‘Æ°á»£c task cho phÃ©p rÃµ. Khi endpoint trong contract nÃ y tá»“n táº¡i, frontend pháº£i dÃ¹ng endpoint Ä‘Ã³ thay vÃ¬ táº¡o má»™t auth flow song song.

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

VÃ­ dá»¥:

```json
{
  "email": "learner@example.com",
  "password": "StrongPassword123!",
  "username": "learner01"
}
```

Validation:

- Email há»£p lá»‡.
- Username Ä‘Æ°á»£c trim vÃ  dÃ i tá»« 3 Ä‘áº¿n 50 kÃ½ tá»±.
- Password tuÃ¢n theo policy cá»§a Supabase.
- Username lÃ  display name vÃ  khÃ´ng báº¯t buá»™c unique trong MVP.
- Email trÃ¹ng Ä‘Æ°á»£c xá»­ lÃ½ qua Supabase Auth vÃ  tráº£ thÃ´ng bÃ¡o an toÃ n, khÃ´ng lá»™ chi tiáº¿t ná»™i bá»™.

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

Cookie session pháº£i Ä‘Æ°á»£c thiáº¿t láº­p an toÃ n.

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

VÃ­ dá»¥:

```json
{
  "email": "learner@example.com"
}
```

Validation:

- Email há»£p lá»‡.

Response (luÃ´n tráº£ vá» ná»™i dung giá»‘ng nhau báº¥t ká»ƒ email cÃ³ tá»“n táº¡i hay khÃ´ng Ä‘á»ƒ chá»‘ng account enumeration):

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

Quy táº¯c:

- Server gá»i `supabase.auth.resetPasswordForEmail` vá»›i redirect URL lÃ  `<app origin>/reset-password` (origin láº¥y tá»« `NEXT_PUBLIC_SITE_URL`).
- KhÃ´ng tráº£ vá» thÃ´ng tin email cÃ³ tá»“n táº¡i hay khÃ´ng; user bá»‹ vÃ´ hiá»‡u hÃ³a cÅ©ng nháº­n response generic giá»‘ng há»‡t.
- KhÃ´ng cÃ³ endpoint server-side cho bÆ°á»›c Ä‘áº·t máº­t kháº©u má»›i. BÆ°á»›c Ä‘Ã³ dÃ¹ng Supabase recovery session vÃ  client-side `supabase.auth.updateUser` táº¡i `/reset-password` (xem ADR-024).

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

KhÃ´ng cho phÃ©p client cáº­p nháº­t:

- role.
- isActive.
- id.
- email náº¿u chÆ°a cÃ³ use case riÃªng.

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
Guest hoáº·c authenticated user
```

Query Core MVP:

```text
?page=1&pageSize=20
```

Query P1 khi `F-COURSE-02` Ä‘Æ°á»£c triá»ƒn khai:

```text
?search=python&page=1&pageSize=20
```

Server khÃ´ng Ä‘Æ°á»£c tá»± báº­t search náº¿u feature vÃ  test tÆ°Æ¡ng á»©ng chÆ°a Ä‘Æ°á»£c triá»ƒn khai.

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
Guest hoáº·c authenticated user
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

Chá»‰ tráº£ course Ä‘Ã£ published cho Guest vÃ  Learner.

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

Nghiá»‡p vá»¥:

1. Kiá»ƒm tra course tá»“n táº¡i vÃ  published.
2. Táº¡o `course_enrollments`.
3. Táº¡o progress cho táº¥t cáº£ lesson Ä‘Ã£ publish cá»§a course.
4. Lesson Ä‘áº§u tiÃªn theo `chapter_order` vÃ  `lesson_order` lÃ  `unlocked`.
5. CÃ¡c lesson published cÃ²n láº¡i lÃ  `locked`.
6. ToÃ n bá»™ enrollment vÃ  progress initialization cháº¡y trong má»™t transaction hoáº·c RPC an toÃ n.

Response:

```ts
interface EnrollCourseResponse {
  enrollmentId: number;
  courseId: number;
  enrolledAt: string;
  firstLessonId: number | null;
}
```

Náº¿u Ä‘Ã£ enroll:

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
Learner Ä‘Ã£ enroll
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

KhÃ´ng tráº£ ná»™i dung Ä‘áº§y Ä‘á»§ cá»§a lesson trong roadmap.

---

# 12. Lesson API

## 12.1 Get lesson

```text
GET /api/lessons/:lessonId
```

Access:

```text
Learner Ä‘Ã£ enroll vÃ  lesson khÃ´ng locked
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

Náº¿u locked:

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

Nghiá»‡p vá»¥:

- Náº¿u `unlocked`, chuyá»ƒn thÃ nh `inProgress`.
- Náº¿u Ä‘Ã£ `inProgress` hoáº·c `completed`, tráº£ tráº¡ng thÃ¡i hiá»‡n táº¡i.
- Náº¿u `locked` nhÆ°ng lÃ  bÃ i published liá»n sau má»™t bÃ i mÃ  learner Ä‘Ã£ cÃ³ quyá»n truy cáº­p trong
  cÃ¹ng course, cho phÃ©p chuyá»ƒn tháº³ng thÃ nh `inProgress`. ÄÃ¢y lÃ  thao tÃ¡c â€œTiáº¿p theoâ€; bÃ i trÆ°á»›c
  khÃ´ng bá»‹ Ä‘Ã¡nh dáº¥u `completed`.
- Náº¿u `locked` vÃ  khÃ´ng thá»a Ä‘iá»u kiá»‡n liá»n sau, tá»« chá»‘i Ä‘á»ƒ khÃ´ng cho phÃ©p nháº£y cÃ³c tÃ¹y Ã½.

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
Learner cÃ³ quyá»n truy cáº­p lesson chá»©a exercise
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

KhÃ´ng tráº£:

```text
correctAnswer
solution
isCorrect cá»§a option
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

Server pháº£i validate answer theo exercise type.

Trong MVP, `fixTheBug` chá»‰ nháº­n `selectedOptionId`. TrÆ°á»ng `selectedSyntax` thuá»™c interaction kÃ©o-tháº£ P1 vÃ  chá»‰ Ä‘Æ°á»£c thÃªm sau khi `requirements.md`, `database.md`, contract vÃ  test Ä‘Æ°á»£c cáº­p nháº­t cÃ¹ng nhau.

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

KhÃ´ng tráº£ toÃ n bá»™ solution.

CÃ³ thá»ƒ tráº£ má»™t explanation tÄ©nh ngáº¯n sau khi ná»™p:

```ts
interface SubmitExerciseResponse {
  staticExplanation?: string;
}
```

Chá»‰ tráº£ khi product requirement cho phÃ©p.

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

Chá»‰ tráº£ submission cá»§a user hiá»‡n táº¡i.

---

# 14. Progress API

## 14.1 Get course progress

```text
GET /api/courses/:courseId/progress
```

Access:

```text
Learner Ä‘Ã£ enroll
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

Client khÃ´ng Ä‘Æ°á»£c cÃ³ endpoint tá»± Ä‘áº·t lesson thÃ nh completed.

Tráº¡ng thÃ¡i completed chá»‰ Ä‘Æ°á»£c cáº­p nháº­t thÃ´ng qua business logic sau khi submit exercise.

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

- Submission pháº£i thuá»™c user hiá»‡n táº¡i.
- Submission pháº£i tá»“n táº¡i.
- Question tá»‘i Ä‘a theo giá»›i háº¡n há»‡ thá»‘ng.
- CÃ³ thá»ƒ chá»‰ cho gá»i khi submission sai.
- Ãp dá»¥ng rate limit.

Server tá»± láº¥y:

- Lesson content.
- Exercise content.
- Learner answer.
- Correct solution.
- Exercise type.

Client khÃ´ng Ä‘Æ°á»£c gá»­i correct solution hoáº·c system prompt.

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

Náº¿u AI lá»—i:

```json
{
  "success": false,
  "error": {
    "code": "AI_PROVIDER_ERROR",
    "message": "KhÃ´ng thá»ƒ táº¡o lá»i giáº£i thÃ­ch lÃºc nÃ y."
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
Learner sá»Ÿ há»¯u submission
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

KhÃ´ng tráº£ raw prompt náº¿u khÃ´ng cáº§n.

---

# 16. Moderator API

**Scope:** P1 / Operations Extension.

KhÃ´ng triá»ƒn khai pháº§n nÃ y trÆ°á»›c AI generation, moderation schema, RLS vÃ  task tÆ°Æ¡ng á»©ng trong `TASKS.md`.

Táº¥t cáº£ endpoint pháº§n nÃ y yÃªu cáº§u:

```text
role = moderator hoáº·c admin
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

CÃ¡c field solution (`correctAnswer`, `expectedAnswer`, `correctOrder`, `pairs`) chá»‰ xuáº¥t hiá»‡n trong endpoint Moderator/Admin nÃ y sau khi server Ä‘Ã£ kiá»ƒm tra role. Khi publish, server Ã¡nh xáº¡ chÃºng sang `exercise_solutions` server-only. KhÃ´ng reuse DTO nÃ y cho Learner UI.

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

Nghiá»‡p vá»¥:

- Chá»‰ review generated exercise chÆ°a `published`.
- Náº¿u cÃ³ `editedDraft`, validate toÃ n bá»™ common fields, discriminator vÃ  Ä‘Ãºng cÃ¡c field riÃªng cá»§a modality; tá»« chá»‘i field thá»«a hoáº·c field coding trÃªn modality khÃ´ng-code.
- Cáº­p nháº­t generated exercise thÃ nh snapshot má»›i trong cÃ¹ng transaction vá»›i review.
- LÆ°u full edited snapshot vÃ o review history khi cÃ³ chá»‰nh sá»­a.
- `approved` khÃ´ng Ä‘á»“ng nghÄ©a Ä‘Ã£ publish.

---

## 16.4 Publish generated exercise

```text
POST /api/moderation/generated-exercises/:id/publish
```

Access:

```text
Moderator hoáº·c Admin
```

Request:

```json
{}
```

Äiá»u kiá»‡n:

- Generated exercise pháº£i á»Ÿ tráº¡ng thÃ¡i `approved`.
- ChÆ°a Ä‘Æ°á»£c publish trÆ°á»›c Ä‘Ã³.
- Draft hiá»‡n táº¡i há»£p lá»‡.
- Lesson vÃ  parent content Ä‘Ã£ publish.
- Audit logging tá»‘i thiá»ƒu Ä‘Ã£ Ä‘Æ°á»£c cáº¥u hÃ¬nh cho action publish.

Response:

```ts
interface PublishGeneratedExerciseResponse {
  generatedExerciseId: number;
  publishedExerciseId: number;
  status: "published";
  publishedAt: string;
}
```

ToÃ n bá»™ thao tÃ¡c pháº£i cháº¡y trong transaction/RPC, táº¡o exercise, options, private solution, cáº­p nháº­t `publishedExerciseId`, `publishedAt` vÃ  audit record.

Náº¿u request bá»‹ gá»­i láº¡i sau khi Ä‘Ã£ publish:

```text
200 OK vá»›i cÃ¹ng `publishedExerciseId` (idempotent retry)
```

---
# 17. Admin API

**Scope:** P1 / Operations Extension.

CÃ¡c mutation Admin chá»‰ Ä‘Æ°á»£c báº­t sau khi audit log storage, server authorization vÃ  security tests Ä‘Ã£ hoÃ n thÃ nh.

Táº¥t cáº£ endpoint yÃªu cáº§u:

```text
role = admin
```

Email Ä‘Æ°á»£c láº¥y tá»« Supabase Auth phÃ­a server. KhÃ´ng lÆ°u email hoáº·c password trong `profiles`.

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

`lastActiveAt` lÃ  field dáº«n xuáº¥t tá»« dá»¯ liá»‡u hoáº¡t Ä‘á»™ng Ä‘Æ°á»£c contract hÃ³a, Æ°u tiÃªn `max(user_progress.last_accessed_at)`. KhÃ´ng tá»± thÃªm cá»™t database chá»‰ Ä‘á»ƒ phá»¥c vá»¥ field nÃ y.

KhÃ´ng tráº£ password, token, cookie hoáº·c raw auth metadata.

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

Nghiá»‡p vá»¥:

- KhÃ´ng cho Guest role.
- KhÃ´ng nháº­n actor ID tá»« client.
- Ghi `admin_logs` trong cÃ¹ng use case.
- Cháº·n Admin tá»± háº¡ quyá»n náº¿u Ä‘Ã³ lÃ  active Admin cuá»‘i cÃ¹ng, khi rule nÃ y Ä‘Æ°á»£c triá»ƒn khai.
- KhÃ´ng cho client update trá»±c tiáº¿p `profiles.role`.

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

Nghiá»‡p vá»¥:

- Æ¯u tiÃªn deactivate thay vÃ¬ xÃ³a user.
- KhÃ´ng cho Admin vÃ´ hiá»‡u hÃ³a active Admin cuá»‘i cÃ¹ng.
- Ghi `admin_logs`.
- Session hiá»‡n cÃ³ cá»§a user bá»‹ vÃ´ hiá»‡u hÃ³a pháº£i bá»‹ tá»« chá»‘i á»Ÿ request riÃªng tÆ° tiáº¿p theo.

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

KhÃ´ng tráº£:

- Database URL.
- Secret.
- Provider API key.
- Stack trace.

---

# 19. Request validation schemas

DÃ¹ng Zod hoáº·c cÃ´ng cá»¥ tÆ°Æ¡ng Ä‘Æ°Æ¡ng.

Route pháº£i validate route params trÆ°á»›c, sau Ä‘Ã³ service táº£i exercise vÃ  chá»n answer schema theo `exercise_type`.

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

Cáº£ `predictOutput` vÃ  `fixTheBug` P0 Ä‘á»u dÃ¹ng `selectedOptionId`. KhÃ´ng thÃªm `selectedSyntax` trÆ°á»›c contract P1.

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

Validation client khÃ´ng thay tháº¿ validation server.

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

Mapper pháº£i náº±m á»Ÿ service hoáº·c mapper file.

VÃ­ dá»¥:

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

KhÃ´ng tráº£ database row trá»±c tiáº¿p tá»« Route Handler.

---

# 21. Idempotency

CÃ¡c endpoint nÃªn xá»­ lÃ½ an toÃ n khi request bá»‹ gá»­i láº¡i.

VÃ­ dá»¥:

## Enroll course

Náº¿u Ä‘Ã£ enroll:

- CÃ³ thá»ƒ tráº£ `409 CONFLICT`, hoáº·c
- Tráº£ enrollment hiá»‡n cÃ³ náº¿u nhÃ³m chá»n idempotent behavior.

Pháº£i chá»n má»™t cÃ¡ch vÃ  giá»¯ thá»‘ng nháº¥t.

Contract hiá»‡n táº¡i chá»n:

```text
409 CONFLICT
```

## Publish generated exercise

Náº¿u Ä‘Ã£ publish:

```text
409 CONFLICT
```

KhÃ´ng táº¡o exercise trÃ¹ng.

---

# 22. Rate limiting

Endpoint cáº§n rate limit:

```text
POST /api/ai/explanations
POST /api/auth/login
POST /api/auth/register
POST /api/auth/forgot-password
POST /api/admin/users/:userId/recover
POST /api/moderation/generated-exercises/:id/publish
```

Giá»›i háº¡n cá»¥ thá»ƒ tá»«ng endpoint Ä‘Æ°á»£c ghi táº¡i `docs/security.md` â€” Má»¥c 9.
# Admin PDF-to-Course API

Má»i route dÆ°á»›i Ä‘Ã¢y yÃªu cáº§u active Admin, tráº£ envelope chuáº©n vÃ 
`Cache-Control: no-store`.

| Method | Route | Request | Success |
|---|---|---|---|
| `POST` | `/api/admin/content-sources` | multipart `file` | `201 SourceDocument` |
| `POST` | `/api/admin/content-sources/:id/extract` | â€” | extraction summary |
| `POST` | `/api/admin/content-sources/:id/course-outline` | â€” | `201 CourseOutlineDraft` |
| `GET` | `/api/admin/course-drafts` | unresolved filter | `{ items: CourseDraft[] }` |
| `PATCH` | `/api/admin/course-drafts/:id/outline` | outline mutation | new outline revision |
| `POST` | `/api/admin/course-drafts/:id/outline/regenerate` | â€” | new outline revision |
| `POST` | `/api/admin/course-drafts/:id/lessons/generate` | â€” | per-Lesson generation states |
| `GET` | `/api/admin/lesson-drafts/:id` | â€” | content draft + citations |
| `PATCH` | `/api/admin/lesson-drafts/:id` | structured draft | new revision/status |
| `POST` | `/api/admin/lesson-drafts/:id/regenerate` | â€” | new content revision |
| `POST` | `/api/admin/course-drafts/:id/reviews` | Course decision | persisted state/publication |

Upload giá»›i háº¡n 10 MiB vÃ  MIME theo `docs/document-to-lesson.md`. `409 INVALID_STATE`
Ä‘Æ°á»£c dÃ¹ng khi gá»i sai thá»© tá»± pipeline; invalid input tráº£ `400`; authentication/
authorization tráº£ `401`/`403`.

CÃ¡c endpoint `content-targets`, `content-curriculum`,
`content-sources/:id/generate { targetLessonId }` vÃ  one-Lesson review/publish lÃ 
compatibility surface lá»‹ch sá»­. ChÃºng khÃ´ng thuá»™c Admin PDF-to-Course default flow vÃ 
khÃ´ng Ä‘Æ°á»£c dÃ¹ng Ä‘á»ƒ bá» qua outline review hoáº·c táº¡o official curriculum trÆ°á»›c Publish.

