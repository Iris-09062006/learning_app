import { expect, test } from "@playwright/test";

import {
  expectNoSeriousA11yViolations,
  expectVisibleKeyboardFocus,
  focusWithTab,
  loginAs,
  resetE2eData,
} from "./support/fixtures";

test.beforeEach(async ({ page }) => {
  await resetE2eData(page);
});

test("generates Lessons sequentially, stops on failure, and resumes from server truth", async ({ page }) => {
  const completed = new Set<number>();
  const postOrder: number[] = [];
  let failedLessonThree = false;

  const content = (lessonId: number, title: string) => ({
    id: lessonId + 100,
    outlineLessonId: lessonId,
    revision: 1,
    title,
    summary: "Persisted Lesson content.",
    estimatedMinutes: 12,
    sections: [{ heading: "Content", bodyMarkdown: "Evidence-grounded content.", citationChunkIndexes: [0] }],
    status: "ready",
    provider: "9router",
    model: "gemini-3.7-flash",
    citations: [{ sectionIndex: 0, chunkIndex: 0, quote: "Stored evidence" }],
  });
  const job = () => {
    const status = completed.size === 4 ? "content_review" : failedLessonThree ? "failed"
      : completed.size ? "generating_content" : "outline_review";
    return {
      jobId: 61,
      sourceDocumentId: 9,
      sourceFilename: "sequential.pdf",
      sources: [{ sourceDocumentId: 9, sourceOrder: 0, sourceType: "file", ingestionMethod: "uploaded",
        title: "sequential.pdf", filename: "sequential.pdf", sourceUrl: null, canonicalUrl: null,
        domain: null, authorityScore: null, relevanceScore: null, status: "ready_for_review",
        errorCode: null, chunkCount: 1 }],
      outlineStale: false,
      status,
      errorCode: status === "failed" ? "LESSON_GENERATION_FAILED" : null,
      outlineRevision: 1,
      approvedOutlineRevision: 1,
      title: "Sequential Course",
      description: "Four Lessons generated one at a time.",
      learningObjectives: ["Verify sequential generation"],
      lessons: [
        { id: 74, lessonOrder: 4, title: "Lesson 4" },
        { id: 72, lessonOrder: 2, title: "Lesson 2" },
        { id: 71, lessonOrder: 1, title: "Lesson 1" },
        { id: 73, lessonOrder: 3, title: "Lesson 3" },
      ].map(({ id, lessonOrder, title }) => ({
        id, lessonOrder, title, clientKey: `lesson-${id}`, summary: `${title} summary`,
        learningObjectives: [`Learn ${title}`], sourceChunkIndexes: [0],
        contentDraft: completed.has(id) ? content(id, title) : null,
      })),
      publishedCourseId: null,
      createdAt: "2026-08-20T00:00:00.000Z",
      updatedAt: "2026-08-20T00:00:00.000Z",
    };
  };

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const respond = (data: unknown, status = 200) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
    if (pathname === "/api/admin/content-targets") return respond({ items: [] });
    if (pathname === "/api/admin/course-drafts") return respond({ items: [job()] });
    const match = pathname.match(/^\/api\/admin\/course-drafts\/61\/lessons\/(\d+)\/generate$/u);
    if (match && request.method() === "POST") {
      const lessonId = Number(match[1]);
      postOrder.push(lessonId);
      if (lessonId === 73 && !failedLessonThree) {
        failedLessonThree = true;
        return route.fulfill({ status: 502, contentType: "application/json",
          body: JSON.stringify({ success: false, error: { code: "AI_PROVIDER_ERROR", message: "Safe provider failure." } }) });
      }
      completed.add(lessonId);
      if (completed.size === 4) failedLessonThree = false;
      return respond({ jobId: 61, outlineLessonId: lessonId, outcome: "generated" }, 201);
    }
    return route.fallback();
  });

  await loginAs(page, "admin");
  await page.goto("/admin/content");
  await expect(page.getByText("Tiến độ tạo bài học: 0/4")).toBeVisible();
  expect(postOrder).toEqual([]);

  await page.getByRole("button", { name: "Continue: sinh Lesson contents" }).click();
  const errorAlert = page.locator('div[role="alert"]').filter({ hasText: "Dịch vụ tạm thời quá tải hoặc hết thời gian chờ" });
  await expect(errorAlert).toBeVisible();
  await expect(page.getByText("Tiến độ tạo bài học: 2/4")).toBeVisible();
  expect(postOrder).toEqual([71, 72, 73]);

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const dark of [false, true]) {
      await page.evaluate((enabled) => document.documentElement.classList.toggle("dark", enabled), dark);
      await page.waitForTimeout(300);
      await expect(page.getByText("Tiến độ tạo bài học: 2/4")).toBeVisible();
      await expect(errorAlert).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await expectNoSeriousA11yViolations(page);
    }
  }

  await page.reload();
  await expect(page.getByText("Tiến độ tạo bài học: 2/4")).toBeVisible();
  expect(postOrder).toEqual([71, 72, 73]);
  const retry = page.getByRole("button", { name: "Thử lại bước bị lỗi" });
  await focusWithTab(page, retry, 100);
  await expectVisibleKeyboardFocus(page);
  await retry.click();

  await expect(page.getByText("Tiến độ tạo bài học: 4/4")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish Course" })).toBeVisible();
  expect(postOrder).toEqual([71, 72, 73, 73, 74]);
});
