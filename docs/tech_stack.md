# Tech Stack Specification

## 1. Tổng quan công nghệ

Dự án **LearningApp** sử dụng bộ công nghệ hiện đại, tối ưu cho tốc độ phát triển, khả năng bảo trì và tích hợp AI.

```text
[Frontend: Next.js + React + Tailwind CSS]
                   │
                   ▼ (HTTP / Cookie Session)
[Backend: Next.js Route Handlers + Feature Services]
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
[Supabase PostgreSQL]   [AI Integration: 9Router]
```

---

## 2. Chi tiết danh mục công nghệ

| Thành phần | Công nghệ chọn | Phiên bản / Gợi ý | Lý do chọn |
|---|---|---|---|
| **Core Framework** | Next.js (App Router) | 14.x hoặc 15.x | Fullstack trong 1 repo, hỗ trợ Server Components, Route Handlers, SSR an toàn. |
| **Language** | TypeScript | 5.x (Strict mode) | Giảm lỗi runtime, đảm bảo đúng contract giữa các module và AI. |
| **Database & Auth** | Supabase | PostgreSQL + Auth | Có sẵn Auth, RLS bảo mật mạnh mẽ, Postgres chuẩn, dễ phát triển local. |
| **Styling** | Vanilla CSS / Tailwind CSS | Tailwind 3.x / 4.x | Styling nhanh, nhất quán, dễ làm giao diện responsive. |
| **Validation** | Zod | 3.x | Validate dữ liệu ở ranh giới API, Form và AI response. |
| **AI Provider** | 9Router OpenAI-compatible API | Server-side HTTP | Một endpoint cấu hình cho outline, Lesson, bài tập và giải thích; upstream model được chọn bằng route `provider/model` hoặc alias. |
| **Unit/Integration Test** | Vitest | 1.x / 2.x | Nhanh, hỗ trợ TypeScript tốt, dễ mock dịch vụ AI. |
| **E2E Test** | Playwright | 1.x | Kiểm thử luồng người dùng thực tế trên browser tự động. |
| **Icons** | Lucide React | Latest | Bộ icon thống nhất, nhẹ, chuẩn accessibility. |
| **Hosting / Deploy** | Vercel | Production | Deploy Next.js tối ưu nhất, hỗ trợ Preview deployments. |
| **Package Manager** | npm | Node LTS (>= 20) | Thống nhất package manager cho cả nhóm và CI. |

---

## 3. Quy định về Thư viện (Dependencies Policy)

1. **Giới hạn thêm thư viện mới:** Không tự ý cài đặt thêm thư viện NPM nếu chức năng đó có thể giải quyết dễ dàng bằng code Vanilla TypeScript hoặc các công nghệ sẵn có trong stack.
2. **Khóa Lockfile:** Commit file `package-lock.json` vào Git. Sử dụng `npm ci` khi chạy CI/CD.
3. **Không dùng UI Component Library nặng:** Tránh cài các bộ thư viện UI monolithic quá nặng (như Ant Design, MUI) trừ khi có sự đồng ý. Ưu tiên xây dựng Primitive UI Components nhẹ bằng Tailwind CSS (`src/components/ui/`).
