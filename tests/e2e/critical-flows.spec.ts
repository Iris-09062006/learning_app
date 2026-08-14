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
  for (const privateResearchLabel of [
    "Authority score",
    "Relevance score",
    "Source provenance",
    "Citation chunk",
    "sourceDocumentId",
  ]) {
    await expect(page.getByText(privateResearchLabel, { exact: false })).toHaveCount(0);
  }
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

test("generates, moderates, and publishes an Exercise for one published Lesson", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/moderation/lessons/101/exercises/new");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("form button[type=submit]").click();
  const draftLink = page.locator('a[href^="/moderation/"]').filter({ hasText: "draft" });
  await expect(draftLink).toBeVisible();
  await draftLink.click();

  await expect(page).toHaveURL(/\/moderation\/3001$/u);
  await expect(page.getByRole("heading", { name: "Published Lesson Exercise" })).toBeVisible();
  await page.getByRole("radio").first().check();
  await page.locator("form button[type=submit]").click();
  await expect(page.locator("span").filter({ hasText: /^approved$/u })).toBeVisible();
  await page.getByRole("button", { name: "Publish to Production" }).click();
  await expect(page.getByText(/Exercise successfully published/u)).toBeVisible();
  await expect(page.getByText("published", { exact: true })).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test("reviews an outline, generates Lesson contents, and atomically publishes a Course", async ({ page }) => {
  let stage: "empty" | "outline" | "content" | "published" = "empty";
  let tavilySearchCalls = 0;
  let tavilyExtractCalls = 0;
  const content = (id: number, outlineLessonId: number, title: string) => ({
    id, outlineLessonId, revision: 1, title, summary: "Nội dung có trích dẫn.", estimatedMinutes: 12,
    sections: [{ heading: "Mở đầu", bodyMarkdown: "Nội dung bài học", citationChunkIndexes: [0] }],
    status: "ready", provider: "9router", model: "e2e-model",
    citations: [{ sectionIndex: 0, chunkIndex: 0, quote: "Nguồn kiểm thử" }],
  });
  const job = () => ({
    jobId: 61, sourceDocumentId: 9, sourceFilename: "lagrange.pdf",
    sources: [{ sourceDocumentId: 9, sourceOrder: 0, sourceType: "file", ingestionMethod: "uploaded",
      title: "lagrange.pdf", filename: "lagrange.pdf", sourceUrl: null, canonicalUrl: null,
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
    if (pathname === "/api/admin/course-research") tavilySearchCalls += 1;
    if (pathname === "/api/admin/content-sources/url") tavilyExtractCalls += 1;
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
    name: "lagrange.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 E2E fixture"),
  });
  await page.getByRole("button", { name: "Tạo Course outline" }).click();

  await expect(page.getByRole("textbox", { name: "Course title" })).toHaveValue("Phương pháp tính");
  await expect(page.getByRole("textbox", { name: "Lesson 1 title" })).toHaveValue("Nội suy Lagrange");
  await page.getByRole("button", { name: "Continue: sinh Lesson contents" }).click();
  await expect(page.getByRole("button", { name: "Publish Course" })).toBeVisible();
  await page.getByRole("button", { name: "Publish Course" }).click();

  await expect(page.getByText("Hàng chờ trống.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở Course" })).toHaveAttribute("href", "/courses/31");
  expect(tavilySearchCalls).toBe(0);
  expect(tavilyExtractCalls).toBe(0);
  await expectNoSeriousA11yViolations(page);
});

test("recovers an existing unpublished import and retries publication idempotently", async ({ page }) => {
  let published = false;
  let attempts = 0;
  const existingJob = {
    jobId: 62, sourceDocumentId: 19, sourceFilename: "legacy-unpublished.pdf",
    sources: [{ sourceDocumentId: 19, sourceOrder: 0, sourceType: "file", ingestionMethod: "uploaded",
      title: "legacy-unpublished.pdf", filename: "legacy-unpublished.pdf", sourceUrl: null,
      canonicalUrl: null, domain: null, authorityScore: null, relevanceScore: null,
      status: "ready_for_review", errorCode: null, chunkCount: 1 }],
    outlineStale: false, status: "content_review", errorCode: null, outlineRevision: 1,
    approvedOutlineRevision: 1, title: "Existing unpublished Course", description: "Backfilled import",
    learningObjectives: ["Preserve historical import"],
    lessons: [{ id: 73, clientKey: "legacy", lessonOrder: 1, title: "Legacy Lesson", summary: "Legacy",
      learningObjectives: ["Review legacy content"], sourceChunkIndexes: [0],
      contentDraft: { id: 83, outlineLessonId: 73, revision: 1, title: "Legacy Lesson",
        summary: "Ready", estimatedMinutes: 10,
        sections: [{ heading: "Content", bodyMarkdown: "Historical content", citationChunkIndexes: [0] }],
        status: "ready", provider: "9router", model: "e2e-model",
        citations: [{ sectionIndex: 0, chunkIndex: 0, quote: "Historical evidence" }] } }],
    publishedCourseId: null, createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-13T00:00:00.000Z",
  };

  await page.route("**/api/admin/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/admin/content-targets") {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: { items: [] } }) });
    }
    if (pathname === "/api/admin/course-drafts") {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: { items: published ? [] : [existingJob] } }) });
    }
    if (pathname === "/api/admin/course-drafts/62/reviews") {
      attempts += 1;
      if (attempts === 1) return route.fulfill({ status: 500, contentType: "application/json",
        body: JSON.stringify({ success: false, error: { code: "PUBLICATION_FAILED",
          message: "Course publication failed and may be retried safely." } }) });
      published = true;
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, data: { sourceDocumentId: 19,
          sourceDocumentIds: [19], courseId: 32, lessonIds: [52], status: "published" } }) });
    }
    return route.fallback();
  });

  await loginAs(page, "admin");
  await page.goto("/admin/content");
  await expect(page.getByRole("textbox", { name: "Course title" })).toHaveValue("Existing unpublished Course");
  await page.getByRole("button", { name: "Publish Course" }).click();
  await expect(page.getByText("Course publication failed and may be retried safely.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publish Course" }).click();
  await expect(page.getByRole("link", { name: /Course/u })).toHaveAttribute("href", "/courses/32");
  expect(attempts).toBe(2);
});

test("recovers a partial Tavily-unavailable manual URL with stored file evidence without duplicates", async ({ page }) => {
  type Stage = "empty" | "processing" | "outline" | "stale" | "content" | "published";
  let stage: Stage = "empty";
  const fixtureResponse = await page.request.get("http://127.0.0.1:54321/__e2e/fixtures/phase3-source-review");
  expect(fixtureResponse.ok()).toBeTruthy();
  const fixture = await fixtureResponse.json() as { stagedFileId: number; laterUrlId: number; jobId: number };
  let attachedIds = [fixture.stagedFileId];
  let revision = 0;
  const source = (id: number, type: "file" | "web_page") => ({
    sourceDocumentId: id, sourceOrder: attachedIds.indexOf(id), sourceType: type,
    ingestionMethod: type === "file" ? "uploaded" : "manual_url",
    title: type === "file" ? "guide.md" : "Manual reference", filename: type === "file" ? "guide.md" : "snapshot.md",
    sourceUrl: type === "file" ? null : "https://manual.example/reference",
    canonicalUrl: type === "file" ? null : "https://manual.example/reference",
    domain: type === "file" ? null : "manual.example", authorityScore: null, relevanceScore: null,
    status: "ready_for_review", errorCode: null, chunkCount: 1,
  });
  const job = () => ({
    jobId: 31, sourceDocumentId: attachedIds[0], sourceFilename: "guide.md",
    sources: attachedIds.map((id) => source(id, id === fixture.stagedFileId ? "file" : "web_page")),
    outlineStale: stage === "stale", status: stage === "outline" ? "outline_review"
      : stage === "content" ? "content_review" : "processing",
    errorCode: null, outlineRevision: revision, approvedOutlineRevision: stage === "content" ? revision : null,
    title: revision ? "Course nguồn review" : "Course import đang chuẩn bị",
    description: revision ? "Course từ evidence bất biến." : "Đang chuẩn bị evidence.",
    learningObjectives: revision ? ["Hiểu evidence"] : [],
    lessons: revision ? [
      { id: 71, clientKey: "lesson-a", lessonOrder: 1, title: "Evidence cơ bản", summary: "A",
        learningObjectives: ["Hiểu A"], sourceChunkIndexes: [0],
        sourceRefs: [{ sourceDocumentId: 22, chunkIndex: 0 }], contentDraft: stage === "content" ? {
          id: 81, outlineLessonId: 71, revision: 1, title: "Evidence cơ bản", summary: "Nội dung",
          estimatedMinutes: 10, sections: [{ heading: "Mở đầu", bodyMarkdown: "Nội dung", citationChunkIndexes: [0] }],
          status: "ready", provider: "e2e", model: "e2e", citations: [{ sectionIndex: 0, chunkIndex: 0, quote: "Evidence" }],
        } : null },
      { id: 72, clientKey: "lesson-b", lessonOrder: 2, title: "Evidence nâng cao", summary: "B",
        learningObjectives: ["Hiểu B"], sourceChunkIndexes: [0],
        sourceRefs: [{ sourceDocumentId: 22, chunkIndex: 0 }], contentDraft: stage === "content" ? {
          id: 82, outlineLessonId: 72, revision: 1, title: "Evidence nâng cao", summary: "Nội dung",
          estimatedMinutes: 10, sections: [{ heading: "Mở đầu", bodyMarkdown: "Nội dung", citationChunkIndexes: [0] }],
          status: "ready", provider: "e2e", model: "e2e", citations: [{ sectionIndex: 0, chunkIndex: 0, quote: "Evidence" }],
        } : null },
    ] : [],
    publishedCourseId: null, createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
  });

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request(); const pathname = new URL(request.url()).pathname;
    const respond = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (pathname === "/api/admin/course-drafts") return respond({ items: stage === "empty" || stage === "published" ? [] : [job()] });
    if (pathname === "/api/admin/content-sources/url") {
      const body = request.postDataJSON() as { url: string };
      return body.url.includes("failed")
        ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "WEB_EXTRACTION_UNAVAILABLE", message: "Web extraction is temporarily unavailable. Retry or use a file." } }) })
        : respond({ sourceDocumentId: 23, status: "extracted", chunkCount: 1, attached: false }, 201);
    }
    if (pathname === "/api/admin/content-sources" && request.method() === "POST") return respond({ sourceDocumentId: 22, status: "uploaded", attached: false }, 201);
    if (pathname === "/api/admin/content-sources/22/extract") return respond({ documentId: 22, status: "extracted", chunkCount: 1 });
    if (pathname === "/api/admin/course-imports") { stage = "processing"; return respond({ jobId: 31, sourceDocumentId: 22, sourceDocumentIds: [22] }, 201); }
    if (pathname === "/api/admin/course-drafts/31/sources" && request.method() === "POST") { attachedIds = [22, 23]; return respond({ jobId: 31, sourceDocumentId: 23, attached: true }, 201); }
    if (pathname === "/api/admin/course-drafts/31/sources/23" && request.method() === "DELETE") { attachedIds = [22]; stage = "stale"; return respond({ jobId: 31, sourceDocumentId: 23, outlineStale: true, sourceDocumentIds: [22] }); }
    if (pathname === "/api/admin/course-drafts/31/outline" && request.method() === "POST") { revision += 1; stage = "outline"; return respond({ jobId: 31, sourceDocumentId: 22, sourceDocumentIds: attachedIds, outlineRevision: revision, status: "outline_review" }, 201); }
    if (pathname === "/api/admin/course-drafts/31/lessons/generate") { stage = "content"; return respond({ jobId: 31, status: "content_review" }, 201); }
    if (pathname === "/api/admin/course-drafts/31/reviews") { stage = "published"; return respond({ jobId: 31, sourceDocumentId: 22, sourceDocumentIds: [22], courseId: 41, status: "published", lessonIds: [51, 52] }); }
    return route.fallback();
  });

  await loginAs(page, "admin"); await page.goto("/admin/content");
  await page.getByLabel("URL thủ công").fill("https://failed.example/article");
  await page.getByRole("button", { name: "Ingest URL" }).click();
  await expect(page.getByText("Dịch vụ tạm thời quá tải hoặc hết thời gian chờ. Vui lòng thử lại.")).toBeVisible();
  await page.getByLabel("Tài liệu tùy chọn").setInputFiles({ name: "guide.md", mimeType: "text/markdown", buffer: Buffer.from("Evidence") });
  await page.getByRole("button", { name: "Ingest file" }).click();
  await expect(page.getByText(/Tài liệu đã sẵn sàng/u)).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).first().click();
  await page.reload();
  await expect(page.getByText("guide.md").first()).toBeVisible();
  await page.getByRole("button", { name: "Khởi tạo Course import" }).click();
  await page.getByLabel("URL thủ công").fill("https://manual.example/reference");
  await page.getByRole("button", { name: "Ingest URL" }).click();
  await page.getByRole("button", { name: "Attach nguồn usable" }).click();
  await page.getByRole("button", { name: "Tạo outline từ evidence đã review" }).click();
  await expect(page.getByRole("textbox", { name: "Course title" })).toHaveValue("Course nguồn review");
  const manualSource = page.getByText(/Manual reference.*manual\.example/u).locator("..");
  await manualSource.getByRole("button", { name: "Detach" }).click();
  await expect(page.getByText(/Evidence đã thay đổi/u)).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue: sinh Lesson contents" })).toBeDisabled();
  await page.getByRole("button", { name: "Tạo outline thay thế" }).click();
  await page.getByRole("button", { name: "Continue: sinh Lesson contents" }).click();
  await page.getByRole("button", { name: "Publish Course" }).click();
  await expect(page.getByRole("link", { name: "Mở Course" })).toHaveAttribute("href", "/courses/41");
  expect(revision).toBe(2); expect(attachedIds).toEqual([22]);
  await expectNoSeriousA11yViolations(page);
});

test("researches a topic, preserves Research More selection, and ingests only confirmed candidates", async ({ page }) => {
  type Stage = "empty" | "processing" | "outline" | "content" | "published";
  let stage: Stage = "empty";
  let researchRound = 0;
  const fixtureResponse = await page.request.get("http://127.0.0.1:54321/__e2e/fixtures/phase4-research");
  expect(fixtureResponse.ok()).toBeTruthy();
  const fixture = await fixtureResponse.json() as {
    rounds: Array<Array<Record<string, unknown>>>;
    sourceIds: { researchA: number; researchC: number; manual: number; file: number };
    jobId: number;
  };
  const discoveredIngestions: string[] = [];
  const extractCalls = new Map<string, number>();
  let initializedSources: Array<{ sourceDocumentId: number; relevanceScore?: number }> = [];
  const sourceMetadata = new Map<number, { title: string; ingestionMethod: "uploaded" | "manual_url" | "discovered"; url: string | null; domain: string | null; authority: number | null }>([
    [fixture.sourceIds.researchA, { title: "Nguồn nghiên cứu A", ingestionMethod: "discovered", url: "https://a.example/guide", domain: "a.example", authority: 0.7 }],
    [fixture.sourceIds.researchC, { title: "Nguồn nghiên cứu C", ingestionMethod: "discovered", url: "https://c.example/reference", domain: "c.example", authority: 0.8 }],
    [fixture.sourceIds.manual, { title: "Manual reference", ingestionMethod: "manual_url", url: "https://manual.example/reference", domain: "manual.example", authority: null }],
    [fixture.sourceIds.file, { title: "notes.md", ingestionMethod: "uploaded", url: null, domain: null, authority: null }],
  ]);
  const sources = () => initializedSources.map(({ sourceDocumentId, relevanceScore }, sourceOrder) => {
    const metadata = sourceMetadata.get(sourceDocumentId)!;
    return {
      sourceDocumentId, sourceOrder, sourceType: metadata.url ? "web_page" : "file",
      ingestionMethod: metadata.ingestionMethod, title: metadata.title,
      filename: metadata.url ? "snapshot.md" : metadata.title,
      sourceUrl: metadata.url, canonicalUrl: metadata.url, domain: metadata.domain,
      authorityScore: metadata.authority, relevanceScore: relevanceScore ?? null,
      status: "ready_for_review", errorCode: null, chunkCount: 1,
    };
  });
  const content = (id: number, outlineLessonId: number) => ({
    id, outlineLessonId, revision: 1, title: `Lesson ${outlineLessonId}`, summary: "Nội dung có nguồn.",
    estimatedMinutes: 10, sections: [{ heading: "Mở đầu", bodyMarkdown: "Nội dung", citationChunkIndexes: [0] }],
    status: "ready", provider: "e2e", model: "e2e",
    citations: [{ sectionIndex: 0, chunkIndex: 0, quote: "Evidence" }],
  });
  const job = () => ({
    jobId: fixture.jobId, sourceDocumentId: initializedSources[0]?.sourceDocumentId,
    sourceFilename: sources()[0]?.filename ?? "snapshot.md", sources: sources(), outlineStale: false,
    status: stage === "outline" ? "outline_review" : stage === "content" ? "content_review" : "processing",
    errorCode: null, outlineRevision: stage === "processing" ? 0 : 1,
    approvedOutlineRevision: stage === "content" ? 1 : null,
    title: stage === "processing" ? "Course đang chuẩn bị" : "Course nghiên cứu chủ đề",
    description: stage === "processing" ? "Đang chuẩn bị evidence." : "Course từ nguồn được chọn.",
    learningObjectives: stage === "processing" ? [] : ["Hiểu evidence"],
    lessons: stage === "processing" ? [] : [
      { id: 71, clientKey: "lesson-a", lessonOrder: 1, title: "Nghiên cứu cơ bản", summary: "A", learningObjectives: ["Hiểu A"], sourceChunkIndexes: [0], sourceRefs: [{ sourceDocumentId: initializedSources[0].sourceDocumentId, chunkIndex: 0 }], contentDraft: stage === "content" ? content(81, 71) : null },
      { id: 72, clientKey: "lesson-b", lessonOrder: 2, title: "Nghiên cứu nâng cao", summary: "B", learningObjectives: ["Hiểu B"], sourceChunkIndexes: [0], sourceRefs: [{ sourceDocumentId: initializedSources[1].sourceDocumentId, chunkIndex: 0 }], contentDraft: stage === "content" ? content(82, 72) : null },
    ],
    publishedCourseId: null, createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z",
  });

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request(); const pathname = new URL(request.url()).pathname;
    const respond = (data: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (pathname === "/api/admin/course-drafts") return respond({ items: stage === "empty" || stage === "published" ? [] : [job()] });
    if (pathname === "/api/admin/course-research") {
      researchRound += 1;
      if (researchRound === 3) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, error: { code: "SEARCH_PROVIDER_TIMEOUT", message: "Search provider unavailable" } }) });
      return respond({ topic: "Python concurrency", queries: ["Python concurrency hướng dẫn học tập tiếng Việt"],
        results: fixture.rounds[researchRound - 1], cursor: `opaque-${researchRound}`, hasMore: true });
    }
    if (pathname === "/api/admin/content-sources/url") {
      const body = request.postDataJSON() as { url: string; discovery: string };
      extractCalls.set(body.url, (extractCalls.get(body.url) ?? 0) + 1);
      if (body.discovery === "discovered") discoveredIngestions.push(body.url);
      const sourceDocumentId = body.url.includes("a.example") ? fixture.sourceIds.researchA
        : body.url.includes("c.example") ? fixture.sourceIds.researchC : fixture.sourceIds.manual;
      return respond({ sourceDocumentId, status: "extracted", chunkCount: 1, attached: false }, 201);
    }
    if (pathname === "/api/admin/content-sources" && request.method() === "POST") return respond({ sourceDocumentId: fixture.sourceIds.file, status: "uploaded", attached: false }, 201);
    if (pathname === `/api/admin/content-sources/${fixture.sourceIds.file}/extract`) return respond({ documentId: fixture.sourceIds.file, status: "extracted", chunkCount: 1 });
    if (pathname === "/api/admin/course-imports") {
      initializedSources = (request.postDataJSON() as { sources: typeof initializedSources }).sources;
      stage = "processing";
      return respond({ jobId: fixture.jobId, sourceDocumentId: initializedSources[0].sourceDocumentId, sourceDocumentIds: initializedSources.map((source) => source.sourceDocumentId) }, 201);
    }
    if (pathname === `/api/admin/course-drafts/${fixture.jobId}/outline` && request.method() === "POST") { stage = "outline"; return respond({ jobId: fixture.jobId, outlineRevision: 1, status: "outline_review" }, 201); }
    if (pathname === `/api/admin/course-drafts/${fixture.jobId}/lessons/generate`) { stage = "content"; return respond({ jobId: fixture.jobId, status: "content_review" }, 201); }
    if (pathname === `/api/admin/course-drafts/${fixture.jobId}/reviews`) { stage = "published"; return respond({ jobId: fixture.jobId, sourceDocumentId: initializedSources[0].sourceDocumentId, sourceDocumentIds: initializedSources.map((source) => source.sourceDocumentId), courseId: 51, status: "published", lessonIds: [61, 62] }); }
    return route.fallback();
  });

  await loginAs(page, "admin"); await page.goto("/admin/content");
  await page.getByLabel("Chủ đề Course").fill("Python concurrency");
  await page.getByRole("button", { name: "Nghiên cứu" }).click();
  expect(extractCalls.size).toBe(0);
  const sourceA = page.getByRole("checkbox", { name: /Nguồn nghiên cứu A/u });
  await sourceA.focus(); await page.keyboard.press("Space");
  await expect(sourceA).toBeChecked();
  expect(extractCalls.size).toBe(0);
  await page.getByRole("button", { name: "Nghiên cứu thêm" }).click();
  await expect(sourceA).toBeChecked();
  expect(extractCalls.size).toBe(0);
  const sourceB = page.getByRole("checkbox", { name: /Nguồn nghiên cứu B/u });
  await sourceB.check(); await sourceB.uncheck();
  await page.getByRole("checkbox", { name: /Nguồn nghiên cứu C/u }).check();
  expect(extractCalls.size).toBe(0);
  await expectNoSeriousA11yViolations(page);

  await page.getByRole("button", { name: "Nghiên cứu thêm" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Dịch vụ tạm thời" })).toBeFocused();
  await expect(sourceA).toBeChecked();
  await expect(page.getByLabel("URL thủ công")).toBeEnabled();
  await expect(page.getByLabel("Tài liệu tùy chọn")).toBeEnabled();
  expect(extractCalls.size).toBe(0);

  await page.getByLabel("URL thủ công").fill("https://manual.example/reference");
  await page.getByRole("button", { name: "Ingest URL" }).click();
  expect(extractCalls.get("https://manual.example/reference")).toBe(1);
  expect(extractCalls.get("https://a.example/guide") ?? 0).toBe(0);
  expect(extractCalls.get("https://b.example/guide") ?? 0).toBe(0);
  expect(extractCalls.get("https://c.example/reference") ?? 0).toBe(0);
  await page.getByLabel("Tài liệu tùy chọn").setInputFiles({ name: "notes.md", mimeType: "text/markdown", buffer: Buffer.from("Evidence") });
  await page.getByRole("button", { name: "Ingest file" }).click();
  await page.getByRole("button", { name: "Xác nhận và ingest nguồn đã chọn" }).click();
  await expect(page.getByText("Đã chuyển sang source review")).toHaveCount(2);
  expect(discoveredIngestions.sort()).toEqual(["https://a.example/guide", "https://c.example/reference"]);
  expect(extractCalls.get("https://a.example/guide")).toBe(1);
  expect(extractCalls.get("https://b.example/guide") ?? 0).toBe(0);
  expect(extractCalls.get("https://c.example/reference")).toBe(1);

  await page.getByRole("button", { name: "Khởi tạo Course import" }).click();
  expect(initializedSources).toHaveLength(4);
  await page.getByRole("button", { name: "Tạo outline từ evidence đã review" }).click();
  await expect(page.getByRole("textbox", { name: "Course title" })).toHaveValue("Course nghiên cứu chủ đề");
  await page.getByRole("button", { name: "Continue: sinh Lesson contents" }).click();
  await page.getByRole("button", { name: "Publish Course" }).click();
  await expect(page.getByRole("link", { name: "Mở Course" })).toHaveAttribute("href", "/courses/51");
  await expectNoSeriousA11yViolations(page);
});

test("regenerates and publishes a stored multi-source Course while Tavily is unavailable", async ({ page }) => {
  let stage: "outline" | "content" | "published" = "outline";
  let revision = 1;
  let savedOutline: Record<string, unknown> | null = null;
  let tavilySearchCalls = 0;
  let tavilyExtractCalls = 0;
  let outlineRegenerations = 0;
  let lessonRegenerations = 0;
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
    if (pathname === "/api/admin/course-research") {
      tavilySearchCalls += 1;
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({
        success: false, error: { code: "SEARCH_PROVIDER_UNAVAILABLE", message: "Search unavailable" },
      }) });
    }
    if (pathname === "/api/admin/content-sources/url") {
      tavilyExtractCalls += 1;
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({
        success: false, error: { code: "WEB_EXTRACTION_UNAVAILABLE", message: "Extraction unavailable" },
      }) });
    }
    if (pathname === "/api/admin/course-drafts/61/outline/regenerate") {
      outlineRegenerations += 1;
      revision += 1;
      return respond({ jobId: 61, sourceDocumentId: 9, sourceDocumentIds: [9, 10],
        outlineRevision: revision, status: "outline_review" });
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
    if (pathname === "/api/admin/course-drafts/61/lessons/72/regenerate") {
      lessonRegenerations += 1;
      return respond({ jobId: 61, outlineLessonId: 72, status: "content_review" }, 201);
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
  await page.getByRole("button", { name: "Regenerate outline" }).click();
  await expect.poll(() => outlineRegenerations).toBe(1);
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
  await page.getByRole("button", { name: "Regenerate Lesson này" }).click();
  await expect.poll(() => lessonRegenerations).toBe(1);
  await page.getByRole("button", { name: "Publish Course" }).click();
  await expect(page.getByText("Hàng chờ trống.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở Course" })).toHaveAttribute("href", "/courses/31");
  expect(tavilySearchCalls).toBe(0);
  expect(tavilyExtractCalls).toBe(0);
  await expectNoSeriousA11yViolations(page);
});
