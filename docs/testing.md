# Testing Strategy

## 1. Mục tiêu

Tài liệu này định nghĩa chiến lược kiểm thử cho dự án.

Mục tiêu:

- Đảm bảo chất lượng phần mềm trước khi phát hành.
- Phát hiện sớm các lỗi về logic nghiệp vụ, bảo mật và phân quyền.
- Đảm bảo các luồng học tập cốt lõi (Critical User Flows) hoạt động mượt mà.
- Hướng dẫn AI Agent tự động viết và chạy test đi kèm với từng tính năng.
- Không lãng phí thời gian viết test hình thức không mang lại giá trị.

---

## 2. Cấu trúc và Phân tầng Kiểm thử (Testing Pyramid)

Hệ thống áp dụng 3 tầng kiểm thử chính:

```text
       /\
      /  \     End-to-End Tests (Playwright) - Kịch bản người dùng cốt lõi
     /    \
    /------\    Integration & RLS Tests (Vitest + Supabase Local) - API, DB, RPC, RLS
   /        \
  /----------\  Unit Tests (Vitest) - Evaluators, Progress Logic, Validators, Schemas
```

### 2.1 Tỷ lệ phân bổ mục tiêu

- **Unit Tests (60%)**: Nhanh, độc lập, không phụ thuộc DB hay Network.
- **Integration Tests (30%)**: Kiểm tra tương tác giữa Service, Repository, Database, RLS và Transactions.
- **End-to-End Tests (10%)**: Kiểm tra luồng người dùng hoàn chỉnh trên trình duyệt thật.

---

## 3. Vị trí lưu trữ mã nguồn Test

Để mã nguồn gọn gàng và dễ bảo trì, quy định vị trí lưu test file như sau:

- **Unit Tests**: Đặt ngay bên cạnh file mã nguồn cần test (Co-location).
  - Ví dụ: `src/features/exercises/exercise-evaluator.ts` -> `src/features/exercises/exercise-evaluator.test.ts`
- **Integration Tests**: Đặt trong thư mục `tests/integration/`.
  - Ví dụ: `tests/integration/submission-flow.test.ts`
- **End-to-End Tests**: Đặt trong thư mục `tests/e2e/`.
  - Ví dụ: `tests/e2e/learner-learning-flow.spec.ts`

---

## 4. Unit Testing (Vitest)

### 4.1 Phạm vi áp dụng
- Logic chấm bài tập (`exercise-evaluator`).
- Logic tính toán và chuyển đổi tiến độ học (`progress-calculator`).
- Hàm kiểm tra phân quyền helper (`permissions`).
- Prompt Builder (`prompt-builder`).
- Response Validator của AI (`response-validator`).
- Zod Validation Schemas.

### 4.2 Nguyên tắc Unit Test
- Chạy siêu nhanh (< 10ms mỗi test case).
- **Tuyệt đối không gọi Database thật** hay API ngoài.
- Dùng dữ liệu giả (Mock/Fixtures) rõ ràng.

### 4.3 Ví dụ Unit Test cho Logic chấm bài

```ts
// src/features/exercises/evaluators/predict-output.evaluator.test.ts
import { describe, it, expect } from "vitest";
import { evaluatePredictOutput } from "./predict-output.evaluator";

describe("evaluatePredictOutput", () => {
  const solution = { correctOptionId: 2 };

  it("should return isCorrect = true when selected option matches correctOptionId", () => {
    const result = evaluatePredictOutput({ selectedOptionId: 2 }, solution);
    expect(result.isCorrect).toBe(true);
  });

  it("should return isCorrect = false when selected option is wrong", () => {
    const result = evaluatePredictOutput({ selectedOptionId: 1 }, solution);
    expect(result.isCorrect).toBe(false);
  });
});
```

---

## 5. Integration & Security RLS Testing (Vitest + Supabase)

### 5.1 Phạm vi áp dụng
- Thao tác Repository với Supabase Local / Staging.
- Kiểm tra tính nguyên tử (Atomicity) của RPC / Transactions (Đăng ký học, Nộp bài + Mở khóa bài tiếp).
- **Kiểm tra chính sách RLS (Row Level Security)**: Đảm bảo Learner A không đọc được bài nộp của Learner B, không đọc được bảng `exercise_solutions`.

### 5.2 Kiểm thử RLS & Security

```ts
// tests/integration/rls-security.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { createTestSupabaseClient } from "../helpers/supabase-test-client";

describe("RLS Security Policies", () => {
  it("Learner cannot read exercise_solutions table directly", async () => {
    const learnerClient = createTestSupabaseClient("learner_token");

    const { data, error } = await learnerClient
      .from("exercise_solutions")
      .select("*");

    // RLS must block read or return empty/error
    expect(data).toHaveLength(0);
  });
});
```

---

## 6. End-to-End Testing (Playwright)

### 6.1 Các kịch bản E2E bắt buộc (Critical User Flows)

1. **Flow 1: Đăng ký & Đăng nhập**
   - User mở trang Đăng ký -> Nhập thông tin -> Đăng ký thành công -> Chuyển sang Đăng nhập -> Đăng nhập thành công -> Thấy Dashboard.
2. **Flow 2: Học bài & Mở khóa tiến độ**
   - Learner mở Course Catalog -> Enroll khóa học -> Mở Roadmap -> Thấy Lesson 1 `unlocked`, Lesson 2 `locked` -> Mở Lesson 1 -> Trả lời đúng bài tập -> Nộp bài -> Thấy thông báo Đúng -> Quay lại Roadmap thấy Lesson 1 `completed` và Lesson 2 đã chuyển sang `unlocked`.
3. **Flow 3: Hỏi AI Mentor khi làm sai**
   - Learner chọn đáp án sai -> Nộp bài -> Thấy thông báo Sai -> Bấm "Nhờ AI giải thích" -> Thấy hiệu ứng Loading -> AI hiển thị lời giải thích ngữ cảnh.

### 6.2 Ví dụ Playwright E2E Test

```ts
// tests/e2e/learning-flow.spec.ts
import { test, expect } from "@playwright/test";

test("Learner completes exercise and unlocks next lesson", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("learner@example.com");
  await page.getByLabel("Mật khẩu").fill("password123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await page.goto("/courses/python-for-beginners/roadmap");
  await expect(page.getByText("Bài 1: Biến trong Python")).toBeVisible();

  await page.getByText("Bài 1: Biến trong Python").click();
  await page.getByRole("radio", { name: "10" }).check();
  await page.getByRole("button", { name: "Nộp đáp án" }).click();

  await expect(page.getByText("Chính xác!")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  // Verify next lesson unlocked
  await expect(page.getByTestId("lesson-2-status")).toHaveText("Unlocked");
});
```

---

## 7. Strategy Testing cho AI Integration

Do việc gọi AI bên ngoài qua 9Router tốn chi phí và có độ trễ cao, chiến lược test AI quy định:

1. **Mặc định trong tất cả Test Suite**: **Bắt buộc dùng Fake/Mock AI Provider** (`FakeAIProvider`).
2. **Mock AI Provider** trả về phản hồi chuẩn dạng JSON đã được chuẩn bị trước.
3. **Provider Contract Test (Chạy riêng thủ công)**: Chỉ chạy khi cần kiểm tra tích hợp thật với endpoint 9Router, API key, route model và định dạng OpenAI-compatible.

---

## 8. Quality Gates & Lệnh chạy Test

Trước khi báo hoàn thành Task, các lệnh test sau phải được thực thi:

```bash
# 1. Kiểm tra Linter
npm run lint

# 2. Kiểm tra TypeScript Types
npm run typecheck

# 3. Chạy Unit & Integration Tests
npm run test

# 4. Chạy E2E Tests (Khi task ảnh hưởng UI/Flow chính)
npm run test:e2e

# 5. Kiểm tra Build ứng dụng
npm run build
```

---

## 9. Quy tắc dành cho AI Agent khi viết Test

- **Không xóa hoặc skip test đang fail**: Nếu test fail, phải tìm nguyên nhân sửa code hoặc sửa test nếu quy định nghiệp vụ thay đổi.
- **Tự viết Test đi kèm Code**: Khi implement 1 feature/service mới, Codex **phải tạo file test tương ứng** trong cùng vòng làm việc.
- **Sử dụng Test Data Builders / Fixtures**: Tạo dữ liệu test sạch, không dùng bẩn DB Production.
- **Không ghi PASS giả**: Báo cáo kết quả test trong Implementation Report phải là kết quả thật từ lệnh CLI.
