# Decisions

## ADR-Topic-001 — Additive multi-source evidence in the existing Course-import pipeline

**Status:** Accepted

Topic research remains stateless until selection. Selected URLs/files become immutable private
evidence attached through an ordered exclusive bridge while the singular order-zero anchor remains
for compatibility. Source-qualified refs map through request-local provider refs to canonical
chunk IDs. Continue remains the evidence lock; publication remains atomic/idempotent; learner and
Exercise architecture remains separate.

Rollout order is migration/backfill -> bridge-aware app -> multi-source generation -> manual
URL/file ingestion -> topic research. Rollback retains additive schema, snapshots, bridge rows,
and immutable revisions; research and URL entry paths can be disabled independently. Crawlers,
research-session tables, embeddings/vector storage, redesign, and destructive down-migration are
not part of this decision.

## 1. Mục đích

Tài liệu này lưu các quyết định quan trọng của dự án.

Mục tiêu:

- Giúp các thành viên hiểu vì sao một lựa chọn được đưa ra.
- Ngăn việc thay đổi kiến trúc tùy ý.
- Giúp AI agent biết phần nào đã được chốt.
- Ghi lại các đánh đổi kỹ thuật.
- Làm cơ sở review khi cần thay đổi quyết định sau này.

Mỗi quyết định gồm:

- ID.
- Trạng thái.
- Bối cảnh.
- Quyết định.
- Lý do.
- Hệ quả.
- Phương án đã cân nhắc.
- Điều kiện xem xét lại.

---

## 2. Trạng thái quyết định

| Trạng thái | Ý nghĩa |
|---|---|
| Proposed | Đang được đề xuất |
| Accepted | Đã được chấp nhận |
| Superseded | Đã bị thay thế bởi quyết định mới |
| Rejected | Không được chọn |
| Deprecated | Không còn khuyến nghị nhưng chưa loại bỏ hoàn toàn |

AI agent chỉ được triển khai theo quyết định có trạng thái `Accepted`.

---

# ADR-001 — Sử dụng Modular Monolith

**Trạng thái:** Accepted

## Bối cảnh

Dự án có các module:

- Authentication.
- Course.
- Enrollment.
- Roadmap.
- Lesson.
- Exercise.
- Submission.
- Progress.
- AI Mentor.
- Moderation.
- Admin.

Quy mô hiện tại là đồ án nhỏ đến vừa, chưa cần các service độc lập.

## Quyết định

Sử dụng kiến trúc:

```text
Client–Server + Modular Monolith
```

Toàn bộ ứng dụng chính nằm trong một repository Next.js, nhưng được chia module theo nghiệp vụ.

## Lý do

- Dễ phát triển.
- Dễ deploy.
- Dễ debug.
- Ít chi phí vận hành.
- Không cần xử lý distributed transaction.
- Vẫn có thể tách service sau nếu cần.

## Hệ quả

Tích cực:

- Một codebase.
- Một pipeline deploy.
- Dễ chia module.
- Phù hợp Vercel.

Đánh đổi:

- Các module dùng chung runtime.
- Không scale độc lập ngay từ đầu.
- Cần giữ boundary giữa các module.

## Không chọn

- Microservices.
- Event-driven architecture.
- Serverless service riêng cho từng module.

## Xem xét lại khi

- AI traffic tăng mạnh.
- Có background job phức tạp.
- Module cần scale hoặc deploy độc lập.
- Một repository trở nên khó quản lý.

---

# ADR-002 — Sử dụng Next.js và TypeScript

**Trạng thái:** Accepted

## Bối cảnh

Hệ thống cần:

- Web responsive.
- Frontend.
- Server-side API.
- Authentication integration.
- Deploy đơn giản.

## Quyết định

Sử dụng:

```text
Next.js + TypeScript
```

## Lý do

- Frontend và server trong cùng project.
- Hỗ trợ Route Handlers và Server Actions.
- Tương thích tốt với Vercel.
- TypeScript giúp giảm lỗi contract.
- Phù hợp modular monolith.

## Hệ quả

- Không cần backend repository riêng.
- Server logic phải được tách khỏi UI component.
- Mặc định ưu tiên Server Component.
- Chỉ dùng Client Component khi cần tương tác phía browser.

## Không chọn

- React SPA + Express riêng.
- NestJS riêng.
- Django/FastAPI.
- Spring Boot.

## Xem xét lại khi

- Có mobile app hoặc external client cần backend độc lập.
- Backend workload vượt khả năng phù hợp của Next.js.
- Có nhiều service cần deploy riêng.

---

# ADR-003 — Sử dụng Tailwind CSS

**Trạng thái:** Accepted

## Quyết định

Sử dụng Tailwind CSS cho giao diện.

## Lý do

- Phát triển nhanh.
- Responsive thuận tiện.
- Dễ giữ spacing và typography thống nhất.
- Phù hợp với component-based UI.

## Hệ quả

- Không dùng class Tailwind làm selector trong test.
- Class lặp lại nhiều phải tách component hoặc helper.
- Không lạm dụng arbitrary value.

## Không chọn

- CSS framework khác làm nền tảng chính.
- CSS-in-JS phức tạp.
- UI library lớn bắt buộc toàn hệ thống.

---

# ADR-004 — Sử dụng Supabase cho Database và Authentication

**Trạng thái:** Accepted

## Bối cảnh

Dự án cần:

- PostgreSQL.
- Authentication.
- Session.
- Row Level Security.
- Deploy nhanh.

## Quyết định

Sử dụng:

```text
Supabase PostgreSQL
Supabase Auth
Supabase Row Level Security
```

## Lý do

- Giảm khối lượng backend hạ tầng.
- Có PostgreSQL chuẩn.
- Có Auth tích hợp.
- Có RLS.
- Phù hợp MVP và Vercel.

## Hệ quả

- Không tự lưu password.
- `auth.users` quản lý danh tính.
- `profiles` lưu dữ liệu ứng dụng.
- Mọi thay đổi schema phải dùng migration.
- RLS là bắt buộc với dữ liệu riêng.

## Không chọn

- MongoDB.
- Firebase Firestore.
- Tự xây auth.
- PostgreSQL self-hosted.

## Xem xét lại khi

- Có yêu cầu hạ tầng riêng.
- Có constraint pháp lý hoặc dữ liệu.
- Chi phí hoặc giới hạn Supabase không còn phù hợp.

---

# ADR-005 — Tách `auth.users` và `profiles`

**Trạng thái:** Accepted

## Quyết định

Supabase Auth quản lý:

- Email.
- Password.
- Session.

Bảng `profiles` quản lý:

- Username.
- Role.
- Active status.
- Dữ liệu ứng dụng.

## Lý do

- Không tự lưu password.
- Khớp mô hình Supabase.
- Giảm rủi ro bảo mật.
- Dễ áp dụng RLS.

## Hệ quả

- `profiles.id` dùng cùng UUID với `auth.users.id`.
- Khi đăng ký phải tạo profile tương ứng.
- Không query password từ application database.

---

# ADR-006 — Dùng một role chính cho mỗi tài khoản

**Trạng thái:** Accepted

## Quyết định

Mỗi profile có một role:

```text
learner
moderator
admin
```

Guest là trạng thái chưa đăng nhập, không lưu trong database.

## Lý do

- Đơn giản.
- Đủ cho MVP.
- Dễ kiểm tra quyền.
- Không cần permission matrix phức tạp.

## Hệ quả

- Một user không có nhiều role đồng thời.
- Admin có thể được phép thực hiện chức năng Moderator.
- Nếu cần permission chi tiết hơn phải tạo quyết định mới.

---

# ADR-007 — Không cho client tự cập nhật progress

**Trạng thái:** Accepted

## Bối cảnh

Nếu client có quyền cập nhật progress, learner có thể tự đánh dấu lesson completed.

## Quyết định

Progress chỉ được cập nhật bởi server sau khi business logic xác nhận.

Client không được tự gửi:

```text
status
isCorrect
score
completedAt
```

## Lý do

- Ngăn gian lận.
- Bảo vệ tính toàn vẹn dữ liệu.
- Đảm bảo progress khớp submission.

## Hệ quả

- Submission và progress update phải qua service.
- RLS phải chặn client update trực tiếp.
- Nên dùng transaction hoặc RPC an toàn.

---

# ADR-008 — Tách đáp án đúng khỏi bảng bài tập công khai

**Trạng thái:** Accepted

## Quyết định

Dữ liệu được tách:

```text
exercises
exercise_options
exercise_solutions
```

`exercise_solutions` là server-only.

## Lý do

- Tránh client đọc đáp án đúng.
- Tránh API vô tình trả solution.
- Dễ kiểm soát quyền.

## Hệ quả

- Endpoint lấy exercise không trả solution.
- Server phải đọc solution khi chấm bài.
- RLS không cho Learner select `exercise_solutions`.

---

# ADR-009 — Sử dụng JSONB cho đáp án có cấu trúc khác nhau

**Trạng thái:** Accepted

## Bối cảnh

Fix the Bug và Predict the Output có cấu trúc answer khác nhau.

## Quyết định

Sử dụng JSONB cho:

- Learner answer.
- Exercise solution.
- Generated exercise content.
- Một số metadata.

## Lý do

- Linh hoạt.
- Không cần tạo quá nhiều bảng cho từng exercise type.
- Dễ mở rộng loại bài.

## Hệ quả

- Phải validate bằng schema theo exercise type.
- Không được coi JSONB là dữ liệu tự do không kiểm soát.
- TypeScript types và Zod schema phải đồng bộ.

---

# ADR-010 — Chỉ hỗ trợ hai loại bài tập trong MVP

**Trạng thái:** Accepted

## Quyết định

MVP hỗ trợ:

```text
Fix the Bug
Predict the Output
```

## Lý do

- Đúng phạm vi ban đầu.
- Không cần code execution sandbox.
- Dễ kiểm thử.
- Phù hợp learner mới.

## Hệ quả

- Không xây IDE đầy đủ.
- Không chạy code Python không tin cậy.
- Loại bài mới cần evaluator, validation và UI riêng.

---

# ADR-011 — Không sử dụng code execution sandbox trong MVP

**Trạng thái:** Accepted

## Quyết định

Không chạy code Python do learner nhập trên server trong MVP.

## Lý do

- Rủi ro bảo mật.
- Cần container isolation.
- Cần CPU, memory và network limits.
- Ngoài phạm vi đồ án hiện tại.

## Hệ quả

- Chấm bài dựa trên lựa chọn hoặc logic tĩnh.
- Không có hidden test case.
- Không có terminal hoặc IDE.

## Xem xét lại khi

- Có yêu cầu bài tập viết code tự do.
- Có thiết kế sandbox an toàn.
- Có hạ tầng riêng phù hợp.

---

# ADR-012 — AI Explanation dùng context trực tiếp, chưa dùng RAG

**Trạng thái:** Accepted

## Bối cảnh

AI giải thích dựa trên bài tập hiện tại, nên hệ thống đã có:

- Lesson.
- Exercise.
- Learner answer.
- Correct solution.
- User question.

## Quyết định

MVP dùng context injection trực tiếp.

Không triển khai RAG trong phiên bản đầu.

## Lý do

- Đủ cho use case hiện tại.
- Đơn giản hơn.
- Không cần embedding pipeline.
- Không cần vector database.
- Dễ kiểm thử.

## Hệ quả

- AI chỉ giải thích trong phạm vi context được cung cấp.
- Không tìm kiếm trong kho tài liệu lớn.
- AI Provider interface vẫn phải cho phép mở rộng sau.

## Xem xét lại khi

- Có nhiều tài liệu.
- AI Mentor trả lời câu hỏi tự do.
- Cần citation.
- Cần truy xuất theo course hoặc lesson.

---

# ADR-013 — AI chỉ được gọi phía server

**Trạng thái:** Accepted

## Quyết định

Browser không gọi trực tiếp AI Provider.

Luồng:

```text
Client
→ Next.js Server
→ Validation
→ Context Builder
→ AI Provider
→ Response Validator
→ Client
```

## Lý do

- Bảo vệ API key.
- Kiểm soát prompt.
- Kiểm tra ownership.
- Rate limit.
- Validate response.

## Hệ quả

- AI key là server-only.
- Không có `NEXT_PUBLIC_AI_API_KEY`.
- Client không gửi system prompt.
- Có timeout và error handling.

---

# ADR-014 — Generated Exercise phải qua Moderator

**Trạng thái:** Accepted

## Quyết định

Luồng nội dung AI:

```text
pending
→ review
→ approved / rejected / needsRevision
→ published
```

AI không được publish tự động.

## Lý do

- Giảm hallucination.
- Đảm bảo đáp án đúng.
- Đảm bảo phù hợp curriculum.
- Giữ con người chịu trách nhiệm cuối.

## Hệ quả

- Cần `generated_exercises`.
- Cần `exercise_reviews`.
- Publish phải chạy transaction.
- Moderator/Admin mới có quyền.

---

# ADR-015 — Sử dụng REST-style Route Handlers

**Trạng thái:** Accepted

## Quyết định

API chính sử dụng:

- Next.js Route Handlers.
- REST-style endpoint.
- Server Actions cho form nội bộ phù hợp.

## Lý do

- Dễ hiểu.
- Dễ test.
- Khớp `api_contract.md`.
- Không cần GraphQL.

## Hệ quả

- Response phải thống nhất.
- API field dùng camelCase.
- Database field dùng snake_case.
- Mapper chuyển đổi giữa hai lớp.

---

# ADR-016 — Response API có cấu trúc thống nhất

**Trạng thái:** Accepted

## Quyết định

Thành công:

```ts
{
  success: true,
  data: ...
}
```

Thất bại:

```ts
{
  success: false,
  error: {
    code: string,
    message: string
  }
}
```

## Lý do

- Frontend xử lý nhất quán.
- Dễ test.
- Không lộ lỗi nội bộ.
- AI agent không tự tạo format khác.

## Hệ quả

- Route Handler chịu trách nhiệm map lỗi.
- Service không phụ thuộc `NextResponse`.
- Không trả raw Supabase error.

---

# ADR-017 — Sử dụng Zod cho validation nếu được cài đặt

**Trạng thái:** Accepted

## Quyết định

Dùng Zod cho:

- API input.
- Form input quan trọng.
- AI response.
- JSONB content.
- Query params.

## Lý do

- Runtime validation.
- Tích hợp TypeScript tốt.
- Phù hợp dữ liệu từ client và AI.

## Hệ quả

- Client validation không thay thế server validation.
- Schema phải được tái sử dụng khi phù hợp.
- Không dùng type assertion thay validation.

---

# ADR-018 — Sử dụng Playwright cho E2E

**Trạng thái:** Accepted

## Quyết định

Playwright là công cụ E2E chính.

## Lý do

- Kiểm tra luồng người dùng.
- Hỗ trợ browser automation.
- Phù hợp Next.js.
- Có screenshot và trace.

## Hệ quả

- Không dùng Tailwind class làm selector.
- Không dùng timeout cố định nếu có thể.
- Test không dùng production database.
- Critical flows phải có E2E test.

---

# ADR-019 — Vitest là lựa chọn cho Unit và Integration Test

**Trạng thái:** Accepted

## Quyết định

Sử dụng Vitest cho unit test và integration test.

## Lý do

- Nhanh.
- Phù hợp TypeScript.
- Dễ mock AI provider.
- Tách khỏi Playwright.

## Hệ quả

- Playwright không thay thế unit test.
- Business logic quan trọng phải được test độc lập.
- Không gọi AI provider thật trong test mặc định.

---

# ADR-020 — Deploy bằng Vercel

**Trạng thái:** Accepted

## Quyết định

Next.js được deploy trên Vercel.

## Lý do

- Tích hợp Next.js tốt.
- Preview deployment.
- Deploy từ GitHub.
- Quản lý environment variables.

## Hệ quả

- Production branch là `main`.
- Preview và Production cần environment riêng.
- Không đưa secret vào repository.
- Rollback ứng dụng bằng deployment trước.

---

# ADR-021 — GitHub là nguồn mã chính

**Trạng thái:** Accepted

## Quyết định

GitHub dùng cho:

- Source control.
- Pull request.
- Code review.
- Issue.
- CI nếu bật.

## Hệ quả

- Không push secret.
- Dùng branch và pull request.
- Commit message phải rõ.
- Migration phải được commit.

---

# ADR-022 — Chỉ dùng một package manager

**Trạng thái:** Accepted

## Quyết định

Project sử dụng npm và commit:

```text
package-lock.json
```

Toàn bộ local development, CI và deployment dùng npm.

## Lý do

- Tránh lock file xung đột.
- CI và local cài cùng dependency.
- Dễ dùng `npm ci`.

## Hệ quả

- Không tạo thêm `yarn.lock` hoặc `pnpm-lock.yaml`.
- Muốn đổi package manager cần quyết định mới.

---

# ADR-023 — Database thay đổi bằng migration

**Trạng thái:** Accepted

## Quyết định

Mọi thay đổi database schema phải dùng SQL migration file.

## Lý do

- Lưu lịch sử database.
- Tái tạo môi trường dễ dàng.
- Tích hợp với CI/CD.
- Tránh sai lệch giữa local và production.

## Hệ quả

- Không sửa database thủ công.
- Migration phải được commit.
- Generate lại TypeScript types sau khi đổi schema.

---

# ADR-024 — Luồng khôi phục mật khẩu dùng Supabase Auth + một endpoint

**Trạng thái:** Accepted

## Bối cảnh

TASK-035 là giai đoạn 2 của Auth UI, bao gồm chức năng khôi phục mật khẩu (F-AUTH-04). Tại thời điểm chốt contract, `docs/api_contract.md` chưa định nghĩa endpoint nào cho luồng này và `docs/security.md` chưa có số liệu rate limit riêng cho forgot-password. Theo AGENTS.md, agent không được tự thêm endpoint/contract khi chưa có quyết định sản phẩm, nên task bị chặn để chốt phương án.

## Quyết định

Sử dụng phương án B:

- Thêm đúng một endpoint `POST /api/auth/forgot-password`.
- Đặt lại mật khẩu mới thực hiện bằng Supabase client-side `updateUser` tại trang `/reset-password`, không cần endpoint riêng.

## Lý do

- `docs/features.md` F-AUTH-04 yêu cầu "Ưu tiên dùng Supabase password reset flow" và "Có rate limit".
- Endpoint `forgot-password` cần tồn tại phía server để áp dụng rate limit 5/IP/giờ và không lộ thông tin user, nhất quán với các endpoint `/api/auth/*` hiện có.
- Bước đặt mật khẩu mới được Supabase xử lý an toàn với recovery session từ link trong email; không cần tự xây endpoint, giảm bề mặt tấn công và khối lượng code.
- Giữ tối giản API trong khi vẫn nhất quán kiến trúc `Client–Server + Modular Monolith`.

## Hệ quả

Tích cực:

- Có một endpoint server-side cho bước gửi email khôi phục, kiểm soát rate limit.
- Bước đặt mật khẩu mới dùng cơ chế recovery session chuẩn của Supabase Auth.
- Phù hợp yêu cầu F-AUTH-04.

Đánh đổi:

- Trang `/reset-password` phải xử lý recovery session phía client; phải kiểm tra lỗi `AuthSessionMissingError` và hiển thị thông báo hợp lý.
- Không có endpoint riêng cho bước đặt mật khẩu mới nên không áp dụng được rate limit server-side cho riêng bước này (được Supabase quản lý).

## Không chọn

- Phương án A — thêm cả `POST /api/auth/update-password`: thêm API không cần thiết, lặp chức năng Supabase client-side.
- Phương án C — bỏ hẳn endpoint server-side cho forgot-password: khó áp rate limit và thiếu nhất quán với `/api/auth/*`.

## Xem xét lại khi

- Có yêu cầu đặt mật khẩu mới phải qua server (ví dụ kiểm tra policy mật khẩu riêng, chặn password cũ trùng).
- Cần ghi log hành vi đặt lại mật khẩu phía server.
- Có yêu cầu tích hợp provider xác thực khác ngoài Supabase Auth.

---

# ADR-025 — Exercise modality theo nội dung Lesson

**Trạng thái:** Accepted — supersedes ADR-010

## Quyết định

Exercise dùng discriminated contract với tám modality tối thiểu:

```text
multiple_choice, true_false, short_answer, ordering,
matching, scenario, predict_output, fix_the_bug
```

Provider chọn modality từ Lesson title, summary, learning objectives và content. Hai modality coding
chỉ hợp lệ khi Lesson thực sự dạy lập trình hoặc suy luận code; code không được dùng làm wrapper trang
trí cho kiến thức không-code.

## Lý do

LearningApp hỗ trợ môn học tùy ý. Giới hạn cũ ở hai loại coding tạo bài tập sai mục tiêu sư phạm cho
Lesson lý thuyết. JSONB hiện có cho generated content, learner answer và solution cho phép mở rộng
schema theo type mà không tạo cột giả.

## Hệ quả

- PostgreSQL enum `exercise_type` được mở rộng bằng migration tương thích ngược.
- Parser/application validator và RPC validator đều kiểm tra exact fields theo type.
- `exercise_solutions` tiếp tục server-only; learner DTO không chứa đáp án.
- Existing `predict_output` và `fix_the_bug` rows, option IDs và `correctOptionId` vẫn hợp lệ.
