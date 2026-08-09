# Review Report: TASK-030 (AI Exercise Generation Backend)

## 1. Scope & Acceptance Criteria
- [x] Tạo bảng DB lưu cấu trúc `generated_exercises`
- [x] Provider gọi LLM (OpenAI) / Mock trả về JSON phù hợp Schema
- [x] Repository lưu `GeneratedExerciseRow` qua `service-role`
- [x] Service kết hợp `getLesson`, gọi AI, parse JSON và insert
- [x] API Route POST `/api/ai/exercises/generate` có bảo mật Authentication

## 2. Security & Architecture
- **API Authentication:** Bảo vệ bởi Supabase `getUser`.
- **Database Rules:** `generated_exercises` được tạo ra nhưng không public (vì dữ liệu sinh ngầm). Mọi insert được quản lý trên server (RLS admin via service-role repository).
- **Architecture Strictness:** Đúng chuẩn feature-based (`src/features/ai/*`). Dùng DTOs (Zod) validate request/response. Không rò rỉ API Key xuống client.

## 3. Code Quality & Findings
- **Quality Gates:** Tất cả 263 unit/integration test đều chạy qua. Next.js App Router build không báo lỗi (warnings config không ảnh hưởng logic).
- **Findings:**
  - Finding 1: Lỗi test khi mock provider trả về chuỗi rỗng `codeSnippet: undefined`.
  - Fix: Sửa normalize code trong `ai-provider.ts` chuyển thành rỗng `""`. Đã pass tests lại.
- **Verdict:** PASS. Không còn finding Critical/High/Medium. Tất cả logic API và DB hoạt động tốt. Sẵn sàng tích hợp frontend ở task sau.