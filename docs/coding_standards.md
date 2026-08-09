# Coding Standards

## 1. Mục tiêu

Tài liệu này quy định cách tổ chức và viết mã nguồn cho dự án.

Mục tiêu:

- Mã dễ đọc và dễ review.
- Các thành viên viết code thống nhất.
- Giảm lỗi khi tích hợp nhiều module.
- Giúp AI agent hiểu và sửa code chính xác hơn.
- Giữ kiến trúc đơn giản nhưng có thể mở rộng.

Các quy tắc áp dụng cho:

- Next.js.
- TypeScript.
- React.
- Tailwind CSS.
- Supabase.
- Playwright.

---

## 2. Nguyên tắc chung

- Ưu tiên code đơn giản và dễ hiểu.
- Không tối ưu sớm khi chưa có vấn đề thực tế.
- Mỗi file và mỗi hàm chỉ nên có một trách nhiệm chính.
- Không đặt toàn bộ logic trong page hoặc component.
- Không lặp lại logic ở nhiều nơi.
- Không thêm thư viện mới nếu chức năng có thể làm đơn giản bằng stack hiện tại.
- Không thay đổi kiến trúc hoặc database schema khi chưa được thống nhất.
- Không để code chưa dùng, comment thừa hoặc file tạm trong repository.
- Mọi thay đổi phải giữ cho project build được.

---

## 3. Ngôn ngữ và quy ước đặt tên

### 3.1 Ngôn ngữ

- Tên biến, hàm, class, type và file dùng tiếng Anh.
- Comment có thể dùng tiếng Anh hoặc tiếng Việt, nhưng phải thống nhất trong cùng một file.
- Nội dung hiển thị trên giao diện dùng theo ngôn ngữ sản phẩm đã thống nhất.
- Không dùng tên viết tắt khó hiểu.

Không nên:

```ts
const usr = getUsr();
const dt = fetchDt();
```

Nên:

```ts
const user = getUser();
const courseData = fetchCourseData();
```

---

### 3.2 Biến và hàm

Dùng `camelCase`.

```ts
const currentUser = await getCurrentUser();

function calculateCompletionPercentage() {
  // ...
}
```

Tên hàm nên bắt đầu bằng động từ:

```ts
getCourseById();
createSubmission();
updateProgress();
validateExerciseAnswer();
```

Boolean nên dùng tiền tố:

```ts
isCompleted;
isAuthenticated;
hasAdminRole;
canAccessLesson;
```

---

### 3.3 Type, Interface và Class

Dùng `PascalCase`.

```ts
type UserRole = "learner" | "moderator" | "admin";

interface ExerciseResult {
  isCorrect: boolean;
  feedback: string;
}

class GeminiProvider {
  // ...
}
```

Không thêm tiền tố `I` vào interface.

Không nên:

```ts
interface IUser {}
```

Nên:

```ts
interface User {}
```

---

### 3.4 Constant

Dùng `UPPER_SNAKE_CASE` cho hằng số dùng chung.

```ts
const MAX_AI_QUESTION_LENGTH = 1000;
const DEFAULT_PAGE_SIZE = 20;
```

Constant chỉ dùng trong một component có thể giữ `camelCase`.

---

### 3.5 Tên file và thư mục

Dùng `kebab-case`.

```text
course-card.tsx
exercise.service.ts
progress.schema.ts
ai-response.schema.ts
```

React component có thể export bằng `PascalCase`:

```tsx
export function CourseCard() {
  return <div />;
}
```

Tên route của Next.js dùng chữ thường và `kebab-case`.

```text
app/ai-mentor/
app/course-catalog/
app/admin/user-management/
```

---

## 4. Quy tắc TypeScript

### 4.1 Không dùng `any`

Không dùng `any` trừ trường hợp bắt buộc và phải có comment giải thích.

Không nên:

```ts
function handleData(data: any) {
  return data.value;
}
```

Nên:

```ts
interface ExerciseData {
  id: number;
  title: string;
}

function handleData(data: ExerciseData) {
  return data.title;
}
```

Nếu chưa biết kiểu dữ liệu, dùng `unknown` và validate.

```ts
function parseResponse(data: unknown) {
  // Validate before using
}
```

---

### 4.2 Khai báo kiểu rõ ràng ở ranh giới hệ thống

Phải khai báo type cho:

- API input.
- API output.
- Dữ liệu Supabase.
- Dữ liệu AI trả về.
- Props của component.
- Service result.

```ts
interface ExplainExerciseInput {
  exerciseId: number;
  learnerAnswer: string;
}

interface ExplainExerciseResult {
  explanation: string;
  example?: string;
}
```

---

### 4.3 Ưu tiên type inference bên trong hàm

Không cần khai báo type nếu TypeScript có thể suy luận rõ ràng.

```ts
const courseCount = courses.length;
```

Không cần:

```ts
const courseCount: number = courses.length;
```

---

### 4.4 Tránh ép kiểu không an toàn

Hạn chế dùng `as`.

Không nên:

```ts
const user = data as User;
```

Nên validate dữ liệu bằng schema trước.

```ts
const user = userSchema.parse(data);
```

---

### 4.5 Xử lý `null` và `undefined`

Phải xử lý rõ dữ liệu có thể không tồn tại.

```ts
const profile = await getProfile(userId);

if (!profile) {
  throw new Error("PROFILE_NOT_FOUND");
}
```

Không dùng non-null assertion nếu chưa chắc chắn.

Không nên:

```ts
profile!.role;
```

---

## 5. Quy tắc React và Next.js

### 5.1 Server Component và Client Component

Mặc định dùng Server Component.

Chỉ thêm `"use client"` khi component cần:

- State.
- Effect.
- Event handler phía client.
- Browser API.
- Thư viện chỉ chạy trên trình duyệt.

Không thêm `"use client"` cho toàn bộ page nếu chỉ một phần nhỏ cần tương tác.

Tách phần tương tác thành component riêng.

---

### 5.2 Component

Một component nên:

- Có một mục đích chính.
- Nhận props rõ ràng.
- Không chứa business logic phức tạp.
- Không trực tiếp gọi service role Supabase.
- Không gọi LLM trực tiếp.

```tsx
interface ProgressBarProps {
  percentage: number;
}

export function ProgressBar({ percentage }: ProgressBarProps) {
  return <div aria-label={`Progress: ${percentage}%`} />;
}
```

---

### 5.3 Page và Layout

Page chịu trách nhiệm:

- Đọc route params.
- Lấy dữ liệu cần thiết.
- Kiểm tra quyền truy cập ở mức route.
- Kết hợp các component.

Page không nên chứa:

- Logic chấm bài.
- Logic mở khóa lesson.
- Prompt AI.
- Query database phức tạp.

Các logic này phải được chuyển sang service hoặc feature module.

---

### 5.4 Server Actions và Route Handlers

Mọi Server Action hoặc Route Handler phải:

1. Xác thực session.
2. Kiểm tra quyền nếu cần.
3. Validate input.
4. Gọi service.
5. Trả kết quả thống nhất.
6. Không trả stack trace cho client.

```ts
export async function submitExercise(input: unknown) {
  const user = await requireUser();
  const validatedInput = submitExerciseSchema.parse(input);

  return exerciseService.submit({
    userId: user.id,
    ...validatedInput,
  });
}
```

---

### 5.5 Không truy cập database trực tiếp từ UI component

Không nên:

```tsx
export function ExerciseCard() {
  const data = supabase.from("exercises").select("*");
  // ...
}
```

Nên:

```tsx
const exercise = await exerciseService.getById(exerciseId);

return <ExerciseCard exercise={exercise} />;
```

---

## 6. Cấu trúc module

Source được tổ chức theo feature:

```text
src/
├── app/
├── components/
│   └── ui/
├── features/
├── lib/
├── shared/
└── generated/
```

Mỗi feature sở hữu UI, type, validation, repository, service và unit test của chính nó.

```text
src/features/exercises/
├── components/
│   ├── exercise-shell.tsx
│   └── exercise-option.tsx
├── exercise.types.ts
├── exercise.schema.ts
├── exercise.repository.ts
├── exercise.service.ts
└── exercise.service.test.ts
```

Trách nhiệm:

- `components/`: UI chỉ thuộc feature.
- `*.types.ts`: type nội bộ và public type của feature.
- `*.schema.ts`: Zod schema và runtime validation.
- `*.repository.ts`: truy cập Supabase hoặc RPC.
- `*.service.ts`: business logic và orchestration.
- `*.test.ts`: unit test đặt cạnh source.

Quy tắc bắt buộc:

- Không tạo `src/services/` dùng chung.
- Không đặt repository/service của feature trong `src/lib/`.
- `src/lib/` chỉ chứa infrastructure dùng chung như Supabase client, AI provider, auth helper và error mapping.
- Không import repository nội bộ của feature khác.
- Khi cần phối hợp module, gọi public service của module đó.
- Không tạo abstraction dùng chung khi mới chỉ có một nơi sử dụng.
- Không bắt buộc mọi feature có đủ tất cả file nếu task chưa cần.

---

## 7. Service và Repository

### 7.1 Service

Service chứa business logic.

Ví dụ:

- Kiểm tra lesson đã unlock.
- Chấm đáp án.
- Cập nhật progress.
- Kiểm tra quyền Moderator.
- Xây dựng dữ liệu gửi AI.

Service không nên chứa code giao diện.

---

### 7.2 Repository

Repository chứa code truy cập Supabase.

Ví dụ:

```ts
export const exerciseRepository = {
  async findById(exerciseId: number) {
    // Supabase query
  },

  async createSubmission(input: CreateSubmissionInput) {
    // Supabase insert
  },
};
```

Không đặt business logic vào repository.

Repository chỉ:

- Query.
- Insert.
- Update.
- Delete.
- Chuyển đổi lỗi database thành lỗi ứng dụng phù hợp.

---

## 8. Supabase Standards

### 8.1 Supabase clients

Tách client theo môi trường:

```text
src/lib/supabase/
├── client.ts
├── server.ts
└── admin.ts
```

- `client.ts`: dùng ở browser với anon key.
- `server.ts`: dùng ở server với session người dùng.
- `admin.ts`: dùng service role cho tác vụ đặc biệt.

Không import `admin.ts` vào Client Component.

---

### 8.2 Row Level Security

- Mọi bảng chứa dữ liệu riêng của người dùng phải bật RLS.
- Không dựa vào UI để bảo vệ dữ liệu.
- Policy phải được lưu trong migration.
- Người dùng chỉ được truy cập dữ liệu thuộc quyền của mình.
- Admin và Moderator chỉ có quyền đúng theo vai trò.

---

### 8.3 Migration

Mọi thay đổi database phải có migration.

Không được:

- Sửa bảng production thủ công rồi không ghi lại.
- Đổi tên cột mà không cập nhật code.
- Xóa cột khi chưa kiểm tra dữ liệu phụ thuộc.

Tên migration nên mô tả rõ:

```text
20260801_create_profiles_table.sql
20260802_add_exercise_status.sql
```

---

### 8.4 Query

- Chỉ select các cột cần thiết.
- Không dùng `select("*")` trong code production nếu không cần.
- Kiểm tra cả `data` và `error`.
- Dùng pagination với danh sách lớn.
- Thêm index cho trường thường xuyên tìm kiếm hoặc join.

Không nên:

```ts
const { data } = await supabase.from("profiles").select("*");
```

Nên:

```ts
const { data, error } = await supabase
  .from("profiles")
  .select("id, username, role")
  .eq("id", userId)
  .single();

if (error) {
  throw mapSupabaseError(error);
}
```

---

## 9. Validation

Dữ liệu từ các nguồn sau phải được xem là không tin cậy:

- Form.
- URL params.
- Search params.
- API request.
- Supabase response nếu kiểu dữ liệu không chắc chắn.
- AI response.

Dùng Zod hoặc validation tương đương.

```ts
import { z } from "zod";

export const submitExerciseSchema = z.object({
  exerciseId: z.number().int().positive(),
  answer: z.string().min(1).max(2000),
});
```

Không validate chỉ ở client. Dữ liệu phải được validate lại ở server.

---

## 10. AI Coding Standards

### 10.1 Gọi AI ở server

- Không gọi AI trực tiếp từ browser.
- Không để lộ API key.
- Không cho client tự gửi system prompt.
- Không gửi dữ liệu người dùng không cần thiết.
- Giới hạn độ dài input.
- Có timeout và xử lý lỗi.

---

### 10.2 Prompt

Prompt phải được tạo tại một nơi tập trung.

```text
src/lib/ai/prompt-builder.ts
```

Không viết prompt dài trực tiếp trong component hoặc Route Handler.

Prompt nên gồm:

- Vai trò của AI.
- Chủ đề bài học.
- Nội dung bài tập.
- Đáp án người học.
- Đáp án đúng.
- Yêu cầu định dạng đầu ra.

---

### 10.3 AI response

AI response phải:

- Có schema rõ ràng.
- Được validate trước khi dùng.
- Có fallback nếu parse thất bại.
- Không tự động được xem là chính xác.
- Không tự động xuất bản bài tập AI tạo ra.

```ts
const explanationSchema = z.object({
  explanation: z.string().min(1),
  example: z.string().optional(),
});
```

---

### 10.4 RAG

Phiên bản đầu chưa bắt buộc dùng RAG.

Nếu thêm RAG:

- Retrieval logic phải nằm trong AI Integration Layer.
- Không gọi vector search từ UI.
- Nội dung retrieved phải giới hạn theo course hoặc lesson phù hợp.
- Phải kiểm tra người dùng có quyền truy cập tài liệu.
- AI service vẫn dùng interface chung để có thể bật hoặc tắt RAG.

---

## 11. Tailwind CSS Standards

- Ưu tiên utility classes.
- Không lặp lại một chuỗi class dài ở nhiều nơi.
- Tách component nếu một nhóm style được dùng lại.
- Dùng responsive breakpoint có chủ đích.
- Không dùng giá trị tùy ý nếu Tailwind đã có utility tương ứng.
- Giữ giao diện nhất quán về spacing, typography và trạng thái.

Không nên:

```tsx
<div className="p-[13px] mt-[17px] text-[15px]">
```

Nên:

```tsx
<div className="mt-4 p-3 text-sm">
```

Với class có điều kiện, dùng helper thống nhất như `cn()`.

```tsx
className={cn(
  "rounded-md px-4 py-2",
  isCorrect && "border border-green-600",
)}
```

Không đưa business state phức tạp trực tiếp vào chuỗi class.

---

## 12. Error Handling

Lỗi ứng dụng nên có mã lỗi ổn định.

```ts
type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "LESSON_LOCKED"
  | "AI_PROVIDER_ERROR"
  | "DATABASE_ERROR";
```

Không hiển thị lỗi kỹ thuật trực tiếp cho người dùng.

Không nên:

```text
PostgrestError: relation exercises does not exist
```

Nên:

```text
Không thể tải bài tập. Vui lòng thử lại.
```

Server có thể ghi log chi tiết, nhưng client chỉ nhận thông báo an toàn.

---

## 13. Logging

Log nên chứa:

- Tên thao tác.
- Mã lỗi.
- User ID nếu phù hợp.
- Request ID nếu có.
- Thời gian.
- Provider AI nếu lỗi liên quan AI.

Không log:

- Password.
- Access token.
- Refresh token.
- Service role key.
- AI API key.
- Toàn bộ dữ liệu cá nhân không cần thiết.

---

## 14. Testing Standards

Test được viết cùng task, không dồn đến cuối dự án.

### 14.1 Vị trí test

```text
Unit test:
src/features/<feature>/*.test.ts
src/features/<feature>/components/*.test.tsx

Integration test:
tests/integration/

End-to-End test:
tests/e2e/

Shared fixtures/helpers:
tests/fixtures/
tests/helpers/
tests/setup/
```

Không tạo thêm `tests/unit/` vì unit test đã được đặt cạnh source.

### 14.2 Unit test

Unit test dùng Vitest và kiểm tra logic độc lập:

- Exercise evaluator.
- Progress calculation.
- Mapper.
- Validation.
- Permission helper.
- Prompt builder.
- AI response validator.

Unit test không gọi database thật, browser hoặc AI provider thật.

### 14.3 Integration test

Integration test dùng Vitest với Supabase local hoặc test project:

- Repository/service.
- Route Handler.
- Migration và constraint.
- RLS.
- Submission + progress transaction.
- Moderation publish transaction.

### 14.4 Playwright E2E

Playwright kiểm tra critical user flow:

- Đăng ký và đăng nhập.
- Enroll.
- Xem roadmap.
- Không mở lesson locked.
- Làm bài và nhận feedback.
- Cập nhật progress và unlock lesson tiếp theo.
- AI failure được xử lý an toàn.
- Moderator/Admin authorization.

Ví dụ:

```ts
test("learner completes required exercises and unlocks the next lesson", async ({
  page,
}) => {
  // ...
});
```

### 14.5 Test độc lập

- Không phụ thuộc thứ tự test.
- Không sử dụng production data.
- Dùng seed hoặc fixture rõ ràng.
- Reset dữ liệu khi cần.
- Không gọi AI provider thật trong test mặc định.
- Không xóa hoặc skip test để làm task pass.
- Bug fix phải có regression test khi phù hợp.
- Không dùng thời gian chờ cố định nếu có thể chờ điều kiện.

Không nên:

```ts
await page.waitForTimeout(5000);
```

Nên:

```ts
await expect(page.getByText("Chính xác!")).toBeVisible();
```

### 14.6 Selector

Ưu tiên:

1. Role.
2. Label.
3. Text ổn định.
4. `data-testid` khi không có semantic selector phù hợp.

```ts
page.getByRole("button", { name: "Nộp đáp án" });
page.getByLabel("Email");
```

Không dùng Tailwind class, DOM path dài hoặc `nth-child` làm selector mặc định.

---

## 15. Accessibility

- Dùng semantic HTML.
- Input phải có label.
- Button phải có tên rõ ràng.
- Không dùng `div` thay button.
- Hỗ trợ thao tác bằng bàn phím.
- Hình ảnh cần có `alt`.
- Trạng thái lỗi không chỉ phân biệt bằng màu.
- Component tương tác phải có focus state.

---

## 16. Import Standards

Ưu tiên alias thay vì đường dẫn tương đối quá dài.

Nên:

```ts
import { exerciseService } from "@/features/exercises/exercise.service";
```

Không nên:

```ts
import { exerciseService } from "../../../../features/exercises/exercise.service";
```

Thứ tự import:

1. Thư viện ngoài.
2. Internal modules.
3. Types.
4. Styles.

Không để import không sử dụng.

---

## 17. Comment và Documentation

Chỉ comment khi code chưa thể tự giải thích rõ.

Comment nên giải thích:

- Vì sao làm như vậy.
- Quy tắc nghiệp vụ đặc biệt.
- Giới hạn của API bên ngoài.
- Lý do workaround.

Không comment lại điều code đã nói rõ.

Không nên:

```ts
// Increase count by one
count += 1;
```

Nên:

```ts
// A completed lesson unlocks only the next lesson in the MVP.
await unlockNextLesson();
```

Public service hoặc logic phức tạp có thể dùng JSDoc ngắn.

---

## 18. Git Standards

### 18.1 Branch

Project dùng luồng đơn giản cho nhóm nhỏ:

```text
feature/<task-id>-<short-name>
fix/<task-id>-<short-name>
        ↓
Pull Request vào main
        ↓
Review + test
        ↓
Merge main
```

Không dùng branch `develop` nếu chưa có ADR mới.

Ví dụ:

```text
feature/task-048-course-enrollment
feature/task-065-submit-exercise
fix/task-069-next-lesson-unlock
```

### 18.2 Commit

Commit phải ngắn và mô tả đúng thay đổi.

```text
feat: add course enrollment transaction
fix: prevent access to locked lessons
test: add progress regression coverage
docs: update API contract
```

Không dùng:

```text
update
fix code
done
final
```

### 18.3 Pull Request

Pull request phải có:

- Task ID và objective.
- File/module chính đã thay đổi.
- Cách kiểm tra.
- Command và kết quả.
- Screenshot nếu thay đổi UI.
- Migration nếu database thay đổi.
- Rủi ro hoặc giới hạn còn lại.

Không merge nếu:

- Có thay đổi ngoài scope.
- Lint, typecheck, test hoặc build bắt buộc thất bại.
- Có secret.
- Database change không có migration.
- Có finding Critical, High hoặc Medium chưa xử lý.
- API/database/security contract bị vi phạm.

---

## 19. Environment Variables

Các biến public phải có tiền tố `NEXT_PUBLIC_`.

Ví dụ:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Các biến secret không được có tiền tố public.

```env
SUPABASE_SERVICE_ROLE_KEY=
AI_API_KEY=
```

Quy tắc:

- Không commit `.env.local`.
- Có file `.env.example`.
- `.env.example` chỉ chứa tên biến, không chứa giá trị thật.
- Không hardcode secret trong source code.
- Không in secret ra console hoặc log.

---

## 20. Definition of Done

Một implementation task chỉ được chuyển sang `REVIEW` khi:

- Đúng Objective và In scope.
- Chỉ sửa `Files allowed to change`.
- Không tự đổi architecture, API hoặc database contract.
- TypeScript strict không lỗi.
- ESLint thành công.
- Unit/integration test liên quan thành công.
- Build thành công.
- E2E thành công nếu task yêu cầu.
- Có loading, empty và error state khi liên quan UI.
- Có server-side validation.
- Authentication, role và ownership được kiểm tra.
- Không để lộ secret hoặc exercise solution.
- Database change có migration, generated types và test.
- Documentation được cập nhật khi behavior hoặc contract thay đổi.
- Implementation Report ghi đúng command thực tế đã chạy.

Codex chỉ được báo:

```text
READY_FOR_REVIEW
FIXED_FOR_REVIEW
BLOCKED
```

Task chỉ được `VERIFIED` bởi Gemini/Antigravity sau review và test độc lập.

Task chỉ được `DONE` sau khi đã `VERIFIED` và được người dùng chấp nhận hoặc merge.

---

## 21. Quy tắc dành cho AI Agent

### 21.1 Tài liệu bắt buộc

Mọi agent phải đọc:

```text
AGENTS.md
file riêng theo vai trò: CODEX.md hoặc GEMINI.md
task packet đang hoạt động
Required context của task
source file liên quan trực tiếp
```

Không bắt buộc đọc toàn bộ tài liệu cho mọi task.

Planner chịu trách nhiệm chọn context theo task.

### 21.2 Workflow thủ công

Codex là extension độc lập nên không có automation bridge với Gemini.

Workflow:

```text
Gemini tạo task
→ người dùng chuyển task sang Codex
→ Codex implement và report
→ người dùng báo Gemini review
→ Gemini trả PASS hoặc FIX_REQUIRED
```

Agent không được giả vờ đã tự gọi hoặc tự gửi dữ liệu cho agent còn lại.

### 21.3 Quy tắc implementation

Codex phải:

1. Chỉ làm một task `READY`.
2. Chỉ sửa file được phép.
3. Không tự thêm dependency, endpoint, table, enum, role hoặc status.
4. Không dùng `any` hoặc tắt rule để che lỗi.
5. Viết test cùng implementation.
6. Chạy required commands.
7. Gửi Implementation Report.
8. Không tự đánh dấu `PASS`, `VERIFIED` hoặc `DONE`.

### 21.4 Quy tắc review

Gemini/Antigravity phải:

1. Review diff thực tế, không chỉ tin report.
2. Kiểm tra scope, architecture, API, database, security và test.
3. Không tự sửa code trong cùng vòng review.
4. Ghi finding có severity, file, evidence, expected behavior và required fix.
5. Chỉ trả `PASS` khi quality gates bắt buộc đã đạt.

### 21.5 MCP

MCP chỉ được dùng khi liên quan trực tiếp task:

- `context`: tìm source và symbol.
- `context7`: tra tài liệu đúng package/version.
- `StitchMCP`: design reference theo `ui.md`.
- `supabase`: ưu tiên local/read-only, schema change vẫn phải có migration.
- `playwright`: reproduce và kiểm tra UI; không thay test file.
- `github-mcp-server`: mặc định read-only; không tự merge/push.
- Các MCP khác không được dùng để mở rộng scope.

Mọi write action ngoài workspace, đặc biệt production, cần yêu cầu rõ của người dùng.

---

## 22. Kết luận

Coding standards này ưu tiên:

- Đơn giản.
- Dễ đọc.
- An toàn.
- Dễ kiểm thử.
- Không lệch kiến trúc.
- Có thể mở rộng theo module.

Mỗi thành viên và AI agent cần tuân thủ cùng một bộ quy tắc để hạn chế xung đột mã nguồn và giúp dự án phát triển ổn định.
