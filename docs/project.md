# Project Organization

## 1. Mục tiêu

Tài liệu này quy định cấu trúc thư mục, quy tắc đặt file và quy trình làm việc giữa các AI Agent trong dự án **LearningApp**.

---

## 2. Cấu trúc thư mục chuẩn

```text
learningApp/
├── .github/                  # CI/CD Workflows
│   └── workflows/
├── docs/                     # Tài liệu thiết kế và quy chuẩn
│   ├── requirements.md
│   ├── architecture.md
│   ├── tech_stack.md
│   ├── coding_standards.md
│   ├── database.md
│   ├── deployment.md
│   ├── api_contract.md
│   ├── non_requirements.md
│   ├── security.md
│   ├── testing.md
│   ├── ui.md
│   ├── features.md
│   ├── decisions.md
│   └── diagrams/
├── project/                  # Workflow và hướng dẫn AI Agent
│   ├── AGENTS.md             # Quy tắc làm việc chung của AI Agent
│   ├── CODEX.md              # Hướng dẫn chi tiết cho Codex (Implementer)
│   ├── GEMINI.md             # Hướng dẫn chi tiết cho Gemini/Antigravity (Planner/Reviewer)
│   ├── ROADMAP.md            # Lộ trình phát triển tổng thể
│   └── TASKS.md              # Task board và danh sách công việc
├── src/                      # Mã nguồn chính (Next.js App Router)
│   ├── app/                  # Routes, Pages, API Handlers
│   ├── components/           # UI Components chung
│   │   └── ui/               # Primitive components (Button, Input, Card...)
│   ├── features/             # Business Logic theo Feature
│   │   ├── auth/
│   │   ├── courses/
│   │   ├── enrollments/
│   │   ├── roadmap/
│   │   ├── lessons/
│   │   ├── exercises/
│   │   ├── submissions/
│   │   ├── progress/
│   │   ├── ai-mentor/
│   │   ├── moderation/
│   │   └── admin/
│   ├── lib/                  # Services & Infrastructure dùng chung (Supabase, AI, Utils)
│   ├── shared/               # Types, Constants, Validation dùng chung
│   └── generated/            # Supabase Generated Types (Auto-generated)
├── supabase/                 # Database migrations & seeds
│   ├── migrations/           # File SQL migrations
│   └── seed.sql              # Dữ liệu mẫu khởi tạo
├── tests/                    # Tests
│   ├── integration/          # Integration tests
│   ├── e2e/                  # End-to-End tests (Playwright)
│   ├── fixtures/             # Mock data cho test
│   └── helpers/              # Test utilities
├── .env.example              # Mẫu biến môi trường
├── eslint.config.js          # Cấu hình ESLint
├── next.config.js            # Cấu hình Next.js
├── package.json              # Dependency & Scripts
├── playwright.config.ts      # Cấu hình Playwright
├── tsconfig.json             # Cấu hình TypeScript
└── vitest.config.ts          # Cấu hình Vitest
```

---

## 3. Quy tắc phân chia trách nhiệm thư mục

### `src/app/`
- Chứa các routes, pages, layouts, loading state, error boundary.
- Chứa API Route Handlers (`/api/...`).
- Không chứa business logic phức tạp hoặc SQL queries trực tiếp.

### `src/features/<feature-name>/`
- Mỗi feature là một module độc lập chứa:
  - `<feature>.service.ts`: Business logic của feature.
  - `<feature>.repository.ts`: Thao tác dữ liệu với Supabase.
  - `<feature>.schema.ts`: Validation schemas (Zod).
  - `<feature>.types.ts`: TypeScript interfaces/types riêng của feature.
  - `components/`: UI components chuyên biệt cho feature đó.
  - `*.test.ts`: Unit test đi kèm với logic.

### `src/lib/`
- Cấu hình hạ tầng dùng chung:
  - `supabase/`: Clients (browser, server, admin).
  - `ai/`: Providers, Prompt Builder, Response Validator.

---

## 4. Quy trình làm việc giữa các Agent (Vibe Coding Workflow)

Dự án áp dụng mô hình phân vai **Manual Controlled Agent Workflow**:

```text
[Gemini / Antigravity]  --->  Tạo Task Packet (TASKS.md)
                                     |
                                     v (Người dùng copy prompt)
[Codex Extension]       --->  Thực thi Task & Trả Implementation Report
                                     |
                                     v (Người dùng yêu cầu Review)
[Gemini / Antigravity]  --->  Review Diff & Trả kết quả (PASS / FIX_REQUIRED)
```

- **Gemini / Antigravity**: Đóng vai trò **Planner & Reviewer**. Chịu trách nhiệm chia nhỏ công việc, viết Task Packet chi tiết, review code diff và chạy kiểm thử nghiệm thu.
- **Codex**: Đóng vai trò **Implementer**. Chịu trách nhiệm viết code, viết test, chạy quality gates và tạo Implementation Report.
- **Người dùng**: Đóng vai trò cầu nối, chuyển giao thông tin và đưa ra quyết định cuối cùng.
