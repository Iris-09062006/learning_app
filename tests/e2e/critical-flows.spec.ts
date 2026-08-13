import { expect, test } from "@playwright/test";

import {
  E2E_PASSWORD,
  enrollInSeedCourse,
  expectNoSeriousA11yViolations,
  expectVisibleKeyboardFocus,
  focusWithTab,
  loginAs,
  resetE2eData,
} from "./support/fixtures";

test.beforeEach(async ({ page }) => {
  await resetE2eData(page);
});

test("registers, logs in, and reaches the learner dashboard", async ({ page }) => {
  const email = "new-learner@example.com";

  await page.goto("/register");
  await expectNoSeriousA11yViolations(page);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Về trang chủ Python Learning" })).toBeFocused();
  await expectVisibleKeyboardFocus(page);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Tên hiển thị")).toBeFocused();
  await page.keyboard.type("New E2E Learner");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email")).toBeFocused();
  await page.keyboard.type(email);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Mật khẩu")).toBeFocused();
  await page.keyboard.type(E2E_PASSWORD);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Tạo tài khoản" })).toBeFocused();
  await expectVisibleKeyboardFocus(page);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/login\?registered=1$/u);
  await expect(page.getByRole("status")).toContainText("Tài khoản đã được tạo");

  await focusWithTab(page, page.getByLabel("Email"));
  await page.keyboard.type(email);
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Mật khẩu")).toBeFocused();
  await page.keyboard.type(E2E_PASSWORD);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Quên mật khẩu?" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeFocused();
  await expectVisibleKeyboardFocus(page);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/dashboard$/u);
  await expect(
    page.getByRole("heading", { name: /Chào mừng trở lại, New E2E Learner/u }),
  ).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("enrolls, completes the first lesson exercise, and unlocks the next lesson", async ({ page }) => {
  await loginAs(page);
  await enrollInSeedCourse(page);

  await expect(page.getByTestId("lesson-101-status")).toHaveAttribute("data-status", "unlocked");
  await expect(page.getByTestId("lesson-102-status")).toHaveAttribute("data-status", "locked");
  await expectNoSeriousA11yViolations(page);

  await page.getByRole("link", { name: "Học tiếp" }).click();
  await expect(page).toHaveURL(/\/lessons\/101$/u);
  await expect(page.getByRole("heading", { name: "Biến và phép gán" })).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu bài học" }).click();
  await page.getByRole("link", { name: "Làm bài" }).click();

  await expect(page).toHaveURL(/\/exercises\/1001$/u);
  await page.getByRole("button", { name: "5" }).click();
  await page.getByRole("button", { name: "Nộp bài" }).click();
  await expect(page.getByRole("status")).toContainText("Chính xác!");

  await page.goto("/courses/1/roadmap");
  await expect(page.getByTestId("lesson-101-status")).toHaveAttribute("data-status", "completed");
  await expect(page.getByTestId("lesson-102-status")).toHaveAttribute("data-status", "unlocked");
  await expectNoSeriousA11yViolations(page);
});

test("shows mock AI loading and explanation after a wrong submission", async ({ page }) => {
  await loginAs(page);
  await enrollInSeedCourse(page);
  await page.getByRole("link", { name: "Học tiếp" }).click();
  await page.getByRole("button", { name: "Bắt đầu bài học" }).click();
  await page.getByRole("link", { name: "Làm bài" }).click();

  await page.getByRole("button", { name: "4" }).click();
  await page.getByRole("button", { name: "Nộp bài" }).click();
  await expect(page.getByRole("status")).toContainText("Chưa chính xác");

  await page.getByRole("button", { name: /Hỏi AI Mentor giải thích/u }).click();
  await expect(page.getByText("AI Mentor đang suy nghĩ...")).toBeVisible();
  await expect(page.getByText("Giải thích từ AI Mentor")).toBeVisible();
  await expect(page.getByText("Nội dung do AI tạo — có thể chứa sai sót.")).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("provides role-route smoke coverage for moderator and admin", async ({ browser }) => {
  const moderatorContext = await browser.newContext();
  const moderatorPage = await moderatorContext.newPage();
  await resetE2eData(moderatorPage);
  await loginAs(moderatorPage, "moderator");
  await moderatorPage.goto("/moderation");
  await expect(
    moderatorPage.getByRole("heading", { name: "Hàng đợi kiểm duyệt bài tập" }),
  ).toBeVisible();
  await expectNoSeriousA11yViolations(moderatorPage);
  await moderatorContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await loginAs(adminPage, "admin");
  await adminPage.goto("/admin/users");
  await expect(adminPage.getByRole("heading", { name: "Quản lý người dùng" })).toBeVisible();
  await expectNoSeriousA11yViolations(adminPage);
  await adminContext.close();
});

test("reviews an outline, generates Lesson contents, and atomically publishes a Course", async ({ page }) => {
  let stage: "empty" | "outline" | "content" | "published" = "empty";
  const content = (id: number, outlineLessonId: number, title: string) => ({
    id, outlineLessonId, revision: 1, title, summary: "Nội dung có trích dẫn.", estimatedMinutes: 12,
    sections: [{ heading: "Mở đầu", bodyMarkdown: "Nội dung bài học", citationChunkIndexes: [0] }],
    status: "ready", provider: "9router", model: "e2e-model",
    citations: [{ sectionIndex: 0, chunkIndex: 0, quote: "Nguồn kiểm thử" }],
  });
  const job = () => ({
    jobId: 61, sourceDocumentId: 9, sourceFilename: "lagrange.txt",
    sources: [{ sourceDocumentId: 9, sourceOrder: 0, sourceType: "file", ingestionMethod: "uploaded",
      title: "lagrange.txt", filename: "lagrange.txt", sourceUrl: null, canonicalUrl: null,
      domain: null, authorityScore: null, relevanceScore: null, status: "ready_for_review",
      errorCode: null, chunkCount: 1 }], outlineStale: false,
    status: stage === "outline" ? "outline_review" : "content_review",
    errorCode: null, outlineRevision: 1, approvedOutlineRevision: stage === "outline" ? null : 1,
    title: "Phương pháp tính", description: "Khóa học nội suy.", learningObjectives: ["Hiểu nội suy"],
    lessons: [
      { id: 71, clientKey: "lagrange", lessonOrder: 1, title: "Nội suy Lagrange", summary: "Lagrange", learningObjectives: ["Áp dụng Lagrange"], sourceChunkIndexes: [0], contentDraft: stage === "content" ? content(81, 71, "Nội suy Lagrange") : null },
      { id: 72, clientKey: "newton", lessonOrder: 2, title: "Nội suy Newton", summary: "Newton", learningObjectives: ["Áp dụng Newton"], sourceChunkIndexes: [0], contentDraft: stage === "content" ? content(82, 72, "Nội suy Newton") : null },
    ],
    publishedCourseId: null, createdAt: "2026-08-10T00:00:00.000Z", updatedAt: "2026-08-10T00:00:00.000Z",
  });

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const respond = (data: unknown, status = 200) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });

    if (pathname === "/api/admin/content-targets") return respond({ items: [] });
    if (pathname === "/api/admin/course-drafts") return respond({ items: stage === "empty" || stage === "published" ? [] : [job()] });
    if (pathname === "/api/admin/content-sources") return respond({ id: 9, originalFilename: "lagrange.txt" }, 201);
    if (pathname === "/api/admin/content-sources/9/extract") return respond({ status: "extracted" });
    if (pathname === "/api/admin/content-sources/9/course-outline") {
      stage = "outline";
      return respond({ jobId: 61, sourceDocumentId: 9, outlineRevision: 1, status: "outline_review" }, 201);
    }
    if (pathname === "/api/admin/course-drafts/61/lessons/generate") {
      stage = "content";
      return respond({ jobId: 61, status: "content_review" }, 201);
    }
    if (pathname === "/api/admin/course-drafts/61/reviews") {
      stage = "published";
      return respond({
        sourceDocumentId: 9,
        courseId: 31,
        status: "published",
        lessonIds: [51],
      });
    }
    return route.fallback();
  });

  await loginAs(page, "admin");
  await page.goto("/admin/content");
  await expect(page.getByRole("link", { name: "Duyệt bài tập" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tạo & duyệt bài học" })).toBeVisible();

  await page.locator('input[name="source"]').setInputFiles({
    name: "lagrange.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Nội suy Lagrange"),
  });
  await page.getByRole("button", { name: "Tạo Course outline" }).click();

  await expect(page.getByRole("textbox", { name: "Course title" })).toHaveValue("Phương pháp tính");
  await expect(page.getByRole("textbox", { name: "Lesson 1 title" })).toHaveValue("Nội suy Lagrange");
  await page.getByRole("button", { name: "Continue: sinh Lesson contents" }).click();
  await expect(page.getByRole("button", { name: "Publish Course" })).toBeVisible();
  await page.getByRole("button", { name: "Publish Course" }).click();

  await expect(page.getByText("Hàng chờ trống.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở Course" })).toHaveAttribute("href", "/courses/31");
  await expectNoSeriousA11yViolations(page);
});

test("reviews and publishes a multi-source Course with distinct colliding chunk refs", async ({ page }) => {
  let stage: "outline" | "content" | "published" = "outline";
  let revision = 1;
  let savedOutline: Record<string, unknown> | null = null;
  const fixtureResponse = await page.request.get(
    "http://127.0.0.1:54321/__e2e/fixtures/multi-source-course-import"
  );
  expect(fixtureResponse.ok()).toBeTruthy();
  const fixture = await fixtureResponse.json() as {
    sources: Array<{ sourceDocumentId: number; sourceOrder: number; sourceType: string;
      ingestionMethod: string; title: string; filename: string; sourceUrl: string | null;
      canonicalUrl: string | null; domain: string | null; authorityScore: number | null;
      relevanceScore: number | null; status: string; errorCode: string | null; chunkCount: number }>;
    chunks: Array<{ documentChunkId: number; sourceDocumentId: number; sourceOrder: number; chunkIndex: number }>;
  };
  const { sources } = fixture;
  const content = (id: number, outlineLessonId: number, source: typeof sources[number], documentChunkId: number) => ({
    id, outlineLessonId, revision: 1, title: `Lesson ${outlineLessonId}`, summary: "Nội dung đa nguồn.",
    estimatedMinutes: 12,
    sections: [{ heading: "Mở đầu", bodyMarkdown: "Nội dung bài học", citationChunkIndexes: [0],
      citationSourceRefs: [{ sourceDocumentId: source.sourceDocumentId, chunkIndex: 0 }] }],
    status: "ready", provider: "9router", model: "e2e-model",
    citations: [{ sectionIndex: 0, chunkIndex: 0, documentChunkId,
      sourceDocumentId: source.sourceDocumentId, sourceOrder: source.sourceOrder,
      sourceTitle: source.title, sourceDomain: source.domain, sourceUrl: source.canonicalUrl,
      quote: `Trích dẫn ${source.title}` }],
  });
  const lessons = () => [
    { id: 71, clientKey: "source-a", lessonOrder: 1, title: "Lesson nguồn A", summary: "A",
      learningObjectives: ["Hiểu A"], sourceChunkIndexes: [0],
      sourceRefs: [{ sourceDocumentId: 9, chunkIndex: 0 }],
      sourceChunks: [fixture.chunks[0]],
      contentDraft: stage === "content" ? content(81, 71, sources[0], fixture.chunks[0].documentChunkId) : null },
    { id: 72, clientKey: "source-b", lessonOrder: 2, title: "Lesson nguồn B", summary: "B",
      learningObjectives: ["Hiểu B"], sourceChunkIndexes: [0],
      sourceRefs: [{ sourceDocumentId: 10, chunkIndex: 0 }],
      sourceChunks: [fixture.chunks[1]],
      contentDraft: stage === "content" ? content(82, 72, sources[1], fixture.chunks[1].documentChunkId) : null },
  ];
  const job = () => ({
    jobId: 61, sourceDocumentId: 9, sourceFilename: "a.md", sources, outlineStale: false,
    status: stage === "outline" ? "outline_review" : "content_review", errorCode: null,
    outlineRevision: revision, approvedOutlineRevision: stage === "outline" ? null : revision,
    title: "Course đa nguồn", description: "Khóa học từ hai nguồn.", learningObjectives: ["Đối chiếu"],
    lessons: lessons(), publishedCourseId: null,
    createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
  });

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const respond = (data: unknown, status = 200) => route.fulfill({
      status, contentType: "application/json", body: JSON.stringify({ success: true, data }),
    });
    if (pathname === "/api/admin/course-drafts") {
      return respond({ items: stage === "published" ? [] : [job()] });
    }
    if (pathname === "/api/admin/course-drafts/61/outline" && request.method() === "PATCH") {
      savedOutline = request.postDataJSON() as Record<string, unknown>;
      revision = 2;
      return respond({ jobId: 61, sourceDocumentId: 9, sourceDocumentIds: [9, 10],
        outlineRevision: revision, status: "outline_review" });
    }
    if (pathname === "/api/admin/course-drafts/61/lessons/generate") {
      stage = "content";
      return respond({ jobId: 61, status: "content_review" }, 201);
    }
    if (pathname === "/api/admin/course-drafts/61/reviews") {
      stage = "published";
      return respond({ jobId: 61, sourceDocumentId: 9, sourceDocumentIds: [9, 10],
        courseId: 31, status: "published", lessonIds: [51, 52, 53] });
    }
    return route.fallback();
  });

  await loginAs(page, "admin");
  await page.goto("/admin/content");
  await expect(page.getByText("Nguồn evidence (2)")).toBeVisible();
  await page.getByRole("button", { name: "Di chuyển xuống" }).first().click();
  await page.getByRole("button", { name: "Thêm Lesson" }).click();
  await expect(page.getByRole("textbox", { name: "Lesson 3 title" })).toHaveValue("Lesson mới");
  await page.getByRole("button", { name: "Lưu outline" }).click();
  await expect.poll(() => savedOutline).not.toBeNull();
  expect(JSON.stringify(savedOutline)).toContain('"sourceDocumentId":9');
  expect(JSON.stringify(savedOutline)).toContain('"sourceDocumentId":10');
  expect(JSON.stringify(savedOutline)).not.toContain("sourceChunkIndexes");
  await page.getByRole("button", { name: "Continue: sinh Lesson contents" }).click();
  await page.getByRole("button", { name: /Lesson nguồn B/u }).click();
  await expect(page.getByText(/Nguồn B · b\.test · chunk 0: Trích dẫn Nguồn B/u)).toBeVisible();
  await page.getByRole("button", { name: "Publish Course" }).click();
  await expect(page.getByText("Hàng chờ trống.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở Course" })).toHaveAttribute("href", "/courses/31");
  await expectNoSeriousA11yViolations(page);
});
