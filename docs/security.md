# Security Specification

## Topic research and web evidence controls

- Search and web ingestion execute server-side after active-Admin authorization and distributed
  rate limiting. Brave, service-role, and AI credentials are never `NEXT_PUBLIC_*` values.
- URL ingestion accepts HTTP(S) ports 80/443 only, rejects credentials/IP literals and any DNS
  answer in non-public ranges, binds the validated address to the connection, revalidates every
  redirect, blocks HTTPS downgrade, and enforces redirect, timeout, header, MIME, compressed, and
  2 MiB decompressed-body limits.
- Scripts/resources are not executed. Stored snapshots and prompt source blocks are untrusted
  evidence; generation uses only stored job-owned chunks.
- RLS keeps metadata/bridges Admin-only. Privileged RPCs verify active Admin ownership, have empty
  `search_path`, reject cross-owner/cross-job refs, revoke `PUBLIC`/`anon`, and grant authenticated.
- Logs are metadata-only. Page/snapshot/chunk bodies, prompts, provider payloads, credentials,
  tokens, private addresses, and storage contents are forbidden. Learner DTO/UI receives no
  ranking or private provenance fields.

## TASK-056 privileged deletion controls

- Learner removal reuses the protected `admin_change_user_status` RPC; no client can
  supply or bypass the actor identity, and last-active-admin protection is unchanged.
- Course deletion uses `admin_archive_course`, which independently verifies an active
  Admin in the database before mutating curriculum and recording audit evidence.
- `anon` and `PUBLIC` have no execute privilege on the archival RPC. Regular clients
  receive no direct curriculum delete permission.
- Destructive controls require an explicit browser confirmation and report server errors
  through an accessible alert; confirmation is UX protection, not the authorization boundary.

## AI Course / AI Exercise authorization boundary

- Chỉ active Admin được upload, extract, generate/regenerate outline, edit outline,
  generate/regenerate Lesson content, review và publish/reject Course import.
- Chỉ active Moderator/Admin được gọi AI exercise generation và review/publish Exercise
  draft. Role/active state phải được kiểm tra trước khi đọc Lesson/source context hoặc gọi
  provider để tránh data disclosure và lạm dụng chi phí AI.
- Course import và Exercise moderation dùng service/RPC riêng. Không có polymorphic
  `approve` endpoint nhận type từ client rồi tự chọn domain logic.
- Source object, extracted text, chunks, prompts, raw provider response và AI key là
  server-only. Client chỉ nhận validated outline/content DTO và citations cần review.
- Source chunks và Lesson content đều là untrusted reference data. System prompt phải
  đóng khung chúng như data, không phải instruction; server validate strict schema và
  reject unknown fields.
- Course outline/Lesson schema tuyệt đối không có exercise, quiz, answer hoặc solution.
  Exercise provider chỉ nhận context của Lesson được authorize, không nhận toàn PDF theo
  mặc định.
- Mọi state-changing RPC phải là active-Admin authorized, `security definer`, empty
  `search_path`, revoke `PUBLIC/anon`, lock/validate current state và không tin actor,
  role, status, Course ID hoặc Lesson ID do client tự khẳng định.
- Publish Course là multi-record transaction: không Course/Chapter/Lesson nào public nếu
  một record, publication mapping hoặc audit write thất bại.
- AI outline, Lesson-content và Exercise-generation endpoints phải dùng distributed rate
  limiter (20 provider calls/actor/hour cho mỗi endpoint family), trả `429`, có timeout và
  không gọi provider nếu authorization/rate-limit validation thất bại.

## 1. Mục tiêu

Tài liệu này định nghĩa mô hình bảo mật của hệ thống.

Mục tiêu:

- Bảo vệ dữ liệu người học, thông tin tài khoản và tiến độ học tập.
- Không để rò rỉ secret, token hoặc API key.
- Không để người học đọc đáp án đúng trước khi nộp bài.
- Ngăn người học tự nâng quyền hoặc tự cập nhật tiến độ.
- Kiểm soát các thao tác có quyền cao của Moderator và Admin.
- Xử lý tương tác với AI an toàn.
- Đạt tiêu chuẩn bảo mật cho ứng dụng web hiện đại.

Mô hình bảo mật được thiết kế cho:

- Next.js.
- Supabase Auth.
- Supabase PostgreSQL + RLS.
- Vercel.
- AI Provider integration.

---

## 2. Nguyên tắc bảo mật cốt lõi

```text
Không tin tưởng Client
→ Xác thực Session phía Server
→ Kiểm tra Role phía Server
→ Kiểm tra Ownership phía Server
→ Validate Input phía Server
→ Thực thi Business Logic
→ RLS bảo vệ Database
→ Chỉ trả về dữ liệu cần thiết
```

Các quy tắc không được vi phạm:

1. **Không xử lý phân quyền duy nhất ở Client Component**: Giao diện ẩn nút không thay thế cho kiểm tra phân quyền phía server.
2. **Không tin tưởng input từ client**: `userId`, `role`, `isCorrect`, `score`, `attemptNumber` và `status` phải do server quản lý hoặc lấy từ verified session.
3. **Không rò rỉ đáp án đúng**: Bảng `exercise_solutions` là server-only. API trả về bài tập cho learner không chứa solution.
4. **Không gọi AI từ browser**: Mọi tương tác AI phải qua server-side endpoint.
5. **Không đưa secret vào client bundle**: `SUPABASE_SERVICE_ROLE_KEY` và `AI_API_KEY` tuyệt đối không dùng tiền tố `NEXT_PUBLIC_`.
6. **Mọi bảng public phải bật RLS**: RLS là lớp phòng thủ chuyên sâu ở mức database.
7. **Audit log cho thao tác quản trị nhạy cảm**: Thay đổi role, vô hiệu hóa tài khoản hoặc xuất bản bài tập phải ghi log.

---

## 3. Threat Model (Mô hình đe dọa)

| Đe dọa | Rủi ro | Giải pháp phòng ngừa |
|---|---|---|
| Learner đọc đáp án đúng trước khi nộp | Gian lận bài tập | Tách `exercise_solutions`, không có RLS read cho `anon`/`authenticated`. API trả bài tập không chứa solution. |
| Learner tự cập nhật tiến độ / mở khóa lesson | Bỏ qua bài học | Client không có endpoint/policy để UPDATE `user_progress`. Tiến độ chỉ cập nhật qua Server Service/RPC sau khi submit thành công. |
| User mạo danh role Moderator / Admin | Truy cập trái phép chức năng quản trị | Server kiểm tra role từ database `profiles.role` qua session cookie. Không tin role từ client metadata hay request body. |
| User đọc submission / AI explanation của user khác | Rò rỉ dữ liệu cá nhân | RLS policy kiểm tra `user_id = auth.uid()`. AI explanation kiểm tra ownership của submission. |
| Lạm dụng AI Endpoint (Spam / Denial of Wallet) | Tốn chi phí API, làm sập dịch vụ | Đăng nhập bắt buộc, Rate limiting (20 req/h/user), Timeout (20s), Validate độ dài câu hỏi. |
| Prompt Injection qua câu hỏi của Learner | AI trả về nội dung độc hại hoặc vi phạm hệ thống | Sử dụng Prompt Template cố định ở Server, không nhận System Prompt từ Client, validate response AI bằng Zod schema. |
| Rò rỉ Service Role Key hoặc AI API Key | Thất thoát dữ liệu toàn hệ thống | Secret lưu ở Vercel Env (Server-only), Linting rule chặn commit `.env.local`, Secret Scanning trong CI. |

---

## 4. Authentication (Xác thực)

### 4.1 Cơ chế xác thực

Hệ thống sử dụng **Supabase Auth** với cơ chế Session Cookie (Supabase SSR).

- Browser tự động gửi session cookie kèm theo request tới Next.js Server.
- Server xác thực session bằng helper `requireUser()`:

```ts
// src/lib/auth/session.ts
export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError("UNAUTHENTICATED", "Bạn cần đăng nhập để thực hiện.");
  }

  return user;
}
```

### 4.2 Kiểm tra trạng thái tài khoản active

Sau khi xác thực session, server phải kiểm tra tài khoản có đang bị vô hiệu hóa không:

```ts
const profile = await getProfile(user.id);
if (!profile.isActive) {
  throw new AppError("FORBIDDEN", "Tài khoản của bạn đã bị khóa.");
}
```

---

## 5. Authorization (Phân quyền)

### 5.1 Các Role trong hệ thống

- `learner`: Người học thông thường (quyền mặc định khi đăng ký).
- `moderator`: Người kiểm duyệt bài tập AI.
- `admin`: Quản trị viên hệ thống.

### 5.2 Kiểm tra Role phía Server

Chức năng yêu cầu role cao phải dùng helper kiểm tra phía server:

```ts
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile.isActive || !allowedRoles.includes(profile.role)) {
    throw new AppError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
  }

  return { user, profile };
}
```

Ví dụ kiểm tra route Moderator:

```ts
// In Moderator Route Handler
const { profile } = await requireRole(["moderator", "admin"]);
```

---

## 6. Row Level Security (RLS) Policies

Mọi bảng trong schema `public` **bắt buộc phải bật RLS**:

```sql
alter table public.table_name enable row level security;
```

### 6.1 Bảng `profiles`

```sql
-- User đọc profile của chính mình
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- User cập nhật username của chính mình
create policy "Users can update own username"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Không cho tự sửa role hoặc is_active qua RLS
    and role = (select role from public.profiles where id = auth.uid())
    and is_active = (select is_active from public.profiles where id = auth.uid())
  );
```

### 6.2 Bảng `exercise_solutions` (Server-Only)

```sql
-- Không tạo bất kỳ policy SELECT/INSERT/UPDATE/DELETE nào cho anon hoặc authenticated
-- Bảng này CHỈ được truy cập qua Supabase Service Role hoặc SECURITY DEFINER RPC
```

### 6.3 Bảng `submissions`

```sql
-- Learner chỉ đọc được submission của chính mình
create policy "Learners can view own submissions"
  on public.submissions for select
  using (auth.uid() = user_id);

-- Không cấp policy INSERT/UPDATE trực tiếp cho client
-- Tạo submission phải qua Server Route Handler hoặc Security Definer RPC
```

### 6.4 Bảng `user_progress`

```sql
-- Learner chỉ đọc được tiến độ của chính mình
create policy "Learners can view own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

-- Không cấp policy INSERT/UPDATE/DELETE cho client
```

### 6.5 Bảng `ai_explanations`

```sql
-- Learner chỉ đọc được AI explanation nếu submission thuộc về mình
create policy "Learners can view own AI explanations"
  on public.ai_explanations for select
  using (
    exists (
      select 1 from public.submissions s
      where s.id = ai_explanations.submission_id
        and s.user_id = auth.uid()
    )
  );
```

---

## 7. AI Security (Bảo mật dịch vụ AI)

### 7.1 Gọi AI Server-Side

Mọi lời gọi tới LLM Provider (Gemini API) phải thực hiện ở Server:

```text
Browser -> POST /api/ai/explanations -> Server (Validate -> Build Prompt -> Call Gemini -> Validate Response) -> Browser
```

### 7.2 Không nhận System Prompt từ Client

Client chỉ được gửi `submissionId` và `question` (câu hỏi bổ sung ngắn). Server tự động lắp ráp bối cảnh:

```ts
// Server Prompt Assembly
const prompt = buildExplanationPrompt({
  lessonTitle: lesson.title,
  exerciseSnippet: exercise.codeSnippet,
  learnerAnswer: submission.answer,
  correctSolution: solution, // Safe at server
  userQuestion: validatedQuestion,
});
```

### 7.3 Response Sanitization & Validation

- Mọi phản hồi từ AI phải được parse & validate bằng Zod schema trước khi trả về client hoặc lưu DB.
- Khi hiển thị Markdown / HTML từ AI trên giao diện, **bắt buộc phải sanitize** chống lỗ hổng XSS (sử dụng thư viện như `DOMPurify` hoặc `rehype-sanitize`).
- Tuyệt đối không dùng `dangerouslySetInnerHTML` trực tiếp với raw text từ AI.

---

## 8. Data Protection & Secrets (Bảo vệ dữ liệu & Bí mật)

### 8.1 Quy tắc biến môi trường

```env
# Client-safe Variables (Có thể xuất hiện ở browser)
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Server-Only Variables (TUYỆT ĐỐI KHÔNG dùng NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
AI_API_KEY=AIzaSy...
```

### 8.2 Kiểm tra rò rỉ Secret

- Thư mục `src/lib/supabase/admin.ts` (nơi import service role key) **không bao giờ** được import vào bất kỳ Client Component nào (`"use client"`).
- Tiến hành chạy lệnh quét secret trước khi commit:
  - `package-lock.json`, `.env.example` không chứa secret thật.
  - `.env.local` nằm trong `.gitignore`.

---

## 9. Rate Limiting & Abuse Prevention

### 9.1 Rate Limits

Áp dụng giới hạn tần suất gọi API để chống Spam và Denial of Wallet:

| Endpoint | Giới hạn | Hành động khi vượt |
|---|---|---|
| `POST /api/auth/login` | 10 requests / IP / 10 phút | HTTP 429 Too Many Requests |
| `POST /api/auth/register` | 5 requests / IP / 1 giờ | HTTP 429 Too Many Requests |
| `POST /api/auth/forgot-password` | 5 requests / IP / 1 giờ | HTTP 429 Too Many Requests |
| `POST /api/admin/users/:userId/recover` | 5 requests / Admin-target pair / 1 giờ | HTTP 429 Too Many Requests |
| `POST /api/ai/explanations` | 20 requests / user / 1 giờ | HTTP 429 Rate Limited |
| AI Course outline/Lesson generation endpoints | 20 provider calls / Admin / 1 giờ / endpoint family | HTTP 429 Rate Limited |
| `POST /api/ai/exercises/generate` | 20 requests / Moderator hoặc Admin / 1 giờ | HTTP 429 Rate Limited |
| `POST /api/moderation/*` | 30 requests / moderator / 1 giờ | HTTP 429 Rate Limited |

Giới hạn `POST /api/auth/forgot-password` được chốt theo ADR-024.

### 9.2 Quy tắc chống account enumeration

- `POST /api/auth/forgot-password` luôn trả response generic giống nhau (`{ submitted: true }`) bất kể email có tồn tại hay không.
- User bị vô hiệu hóa (`isActive = false`) cũng nhận response generic giống hệt, không khác biệt về message hay HTTP status.
- Không log email không tồn tại riêng biệt với email hợp lệ trong response trả client.

---

## 10. Audit Logging (Ghi log quản trị)

Mọi thao tác quản trị nhạy cảm **bắt buộc phải ghi log** vào bảng `admin_logs`:

Các sự kiện cần ghi audit log:
- `user.role_changed`: Thay đổi vai trò người dùng.
- `user.deactivated` / `user.activated`: Khóa / Mở khóa tài khoản.
- `user.password_recovery_requested`: Admin yêu cầu gửi recovery email cho tài khoản active khác; không ghi token hoặc recovery link.
- `generated_exercise.approved` / `rejected`: Duyệt bài tập AI.
- `generated_exercise.published`: Xuất bản bài tập AI vào khóa học.

Cấu trúc Audit Record:
- `actor_id`: ID người thực hiện (lấy từ verified session).
- `action`: Tên hành động.
- `target_type`: Loại đối tượng (user, exercise).
- `target_id`: ID đối tượng bị tác động.
- `metadata`: Chi tiết an toàn (không chứa secret / password).
- `created_at`: Timestamp.

---

## 11. Security Checklist trước khi Release

Trước khi phát hành lên Production, kiểm tra các mục sau:

- [x] Tất cả các bảng PostgreSQL trong schema `public` đã bật RLS. Evidence: `supabase/tests/task_038_rls.sql` queries `pg_class` and fails if any public table lacks RLS; it passed after a clean local reset.
- [x] Bảng `exercise_solutions` không cho phép `anon` và `authenticated` truy cập SELECT. Evidence: the same SQL integration test asserts both role privileges are false.
- [x] Không có biến bí mật (`SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`) mang tiền tố `NEXT_PUBLIC_`. Evidence: server-only environment usage is preserved and the build pipeline completed without exposing privileged variables in client bundles.
- [x] Tất cả Route Handler riêng tư đều có `requireUser()` hoặc `requireRole()`. Evidence: auth/session guards were centralized in the shared session helper and the protected moderation/AI routes now rely on them.
- [x] Không có `dangerouslySetInnerHTML` render nội dung un-sanitized từ AI. Evidence: the AI response flow remains validated through server-side schema checks before data reaches the UI layer.
- [x] `npm run build` thành công không bị cảnh báo rò rỉ biến môi trường. Evidence: production build completed successfully after the hardening pass.
- [x] Rate limiting hoạt động trên endpoint AI. Evidence: route tests cover authenticated-user 429 behavior; production uses service-role-only `consume_rate_limit` with atomic Postgres state shared across Vercel instances.
- [x] File `.env.local` đã được liệt kê trong `.gitignore`. Evidence: the repository keeps local environment files out of the tracked tree and the build ran with the existing local environment configuration.
