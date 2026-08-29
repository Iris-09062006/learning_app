import { expect, test, type Page } from "@playwright/test";

import {
  enrollInSeedCourse,
  loginAs,
  resetE2eData,
} from "./support/fixtures";

/**
 * T022 — Phase C functional Lesson regression gate.
 *
 * Proves the Stitch UI redesign (T014–T021) did not alter existing Lesson
 * behavior. Every assertion targets meaningful state transitions (status,
 * mutation, navigation, data-driven content) — not CSS.
 *
 * Backend/API behaviour is recorded (method, route, request count, status)
 * and must stay free of duplicate mutations.
 */

interface StartCall {
  method: string;
  url: string;
  status: number | null;
}

/** Records POST mutations against the lesson start API. */
function trackStartCalls(page: Page): StartCall[] {
  const calls: StartCall[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (request.method() === "POST" && /^\/api\/lessons\/\d+\/start$/.test(url.pathname)) {
      calls.push({ method: request.method(), url: url.pathname, status: null });
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (response.request().method() === "POST" && /^\/api\/lessons\/\d+\/start$/.test(url.pathname)) {
      const call = calls.find((item) => item.status === null && item.url === url.pathname);
      if (call) call.status = response.status();
    }
  });
  return calls;
}

/** Collects client-side/runtime errors for the current page session. */
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

test.describe("T022 Lesson functional regression", () => {
  test.beforeEach(async ({ page }) => {
    await resetE2eData(page);
  });

  test("loads the enrolled lesson with correct title, status, and pre-start preview", async ({ page }) => {
    await loginAs(page);
    await enrollInSeedCourse(page);

    const errors = collectConsoleErrors(page);
    const startCalls = trackStartCalls(page);

    await page.goto("/lessons/101");
    await expect(page.getByRole("heading", { name: "Biến và phép gán" })).toBeVisible();

    // Pre-start: correct status, start CTA available, content gated.
    await expect(page.getByText("Sẵn sàng", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bắt đầu bài học" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nội dung đang chờ bạn" })).toBeVisible();
    await expect(page.getByTestId("lesson-markdown")).toHaveCount(0);

    // No fabricated previous-lesson navigation anywhere on the page.
    await expect(page.getByRole("navigation", { name: /Bài trước/ })).toHaveCount(0);
    await expect(page.getByText(/Bài trước/)).toHaveCount(0);

    // Loading the page must not fire any start mutation.
    await expect.poll(() => startCalls.length).toBe(0);
    expect(errors).toEqual([]);
  });

  test("starts the lesson with a single mutation, flips status, focuses content, and persists across reload", async ({ page }) => {
    await loginAs(page);
    await enrollInSeedCourse(page);

    const startCalls = trackStartCalls(page);

    await page.goto("/lessons/101");
    await expect(page.getByRole("button", { name: "Bắt đầu bài học" })).toBeVisible();

    await page.getByRole("button", { name: "Bắt đầu bài học" }).click();

    // Content becomes available and the status flips to in-progress.
    const contentArticle = page.getByRole("article", { name: "Bài học" });
    await expect(contentArticle).toBeVisible();
    await expect(page.getByRole("button", { name: /Tiếp tục học/ })).toBeVisible();
    await expect(page.getByText("Đang học", { exact: true })).toHaveCount(2);

    // Existing post-start focus behavior still occurs.
    await expect(contentArticle).toBeFocused();

    // Exactly one start mutation, on the existing route, returning 200.
    await expect.poll(() => startCalls.length).toBe(1);
    expect(startCalls[0]).toMatchObject({
      method: "POST",
      url: "/api/lessons/101/start",
      status: 200,
    });

    // Progress persists across reload; repeat CTA does not re-mutate.
    await page.reload();
    await expect(page.getByRole("button", { name: /Tiếp tục học/ })).toBeVisible();
    await expect(page.getByTestId("lesson-markdown")).toBeVisible();
    await page.getByRole("button", { name: /Tiếp tục học/ }).click();
    await expect.poll(() => startCalls.length).toBe(1);
  });

  test("renders in-progress content, exercises, and the aside roadmap data-driven", async ({ page }) => {
    await loginAs(page);
    await enrollInSeedCourse(page);

    await page.goto("/lessons/101");
    await page.getByRole("button", { name: "Bắt đầu bài học" }).click();
    await expect(page.getByRole("article", { name: "Bài học" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Bài trước/ })).toHaveCount(0);

    // Markdown content renders through the real lesson route.
    await expect(page.getByText(/Biến giúp lưu trữ giá trị/)).toBeVisible();

    // Exercise section stays data-driven with the existing action card.
    await expect(page.getByRole("heading", { name: "Giá trị của biến" })).toBeVisible();
    await expect(page.getByText("Đoán kết quả · Dễ")).toBeVisible();
    await expect(page.getByRole("link", { name: /Làm bài/ })).toHaveAttribute("href", "/exercises/1001");

    // Aside overview values remain data-driven.
    const aside = page.getByRole("complementary", { name: "Thông tin bài học" });
    await expect(aside.getByText("Tổng quan")).toBeVisible();
    await expect(aside.getByText("Trạng thái")).toBeVisible();
    await expect(aside.getByText("Đang học", { exact: true }).first()).toBeVisible();
    await expect(aside.getByText("Thời lượng")).toBeVisible();
    await expect(aside.getByText("8 phút")).toBeVisible();
    await expect(aside.getByText("Bài tập")).toBeVisible();

    // Roadmap link href is unchanged.
    await expect(page.getByRole("link", { name: "Xem lộ trình khác" })).toHaveAttribute("href", "/courses");
  });

  test("advances to the real next lesson with a single mutation on the existing route", async ({ page }) => {
    await loginAs(page);
    await enrollInSeedCourse(page);

    await page.goto("/lessons/101");
    await page.getByRole("button", { name: "Bắt đầu bài học" }).click();
    await expect(page.getByRole("article", { name: "Bài học" })).toBeVisible();

    // Complete the only exercise to unlock the sequential next lesson.
    await page.getByRole("link", { name: /Làm bài/ }).click();
    await expect(page).toHaveURL(/\/exercises\/1001$/);
    await page.getByRole("button", { name: "5" }).click();
    await page.getByRole("button", { name: "Nộp bài" }).click();
    await expect(page.getByRole("status")).toContainText("Hoàn thành");

    // Back on the completed lesson, the next-lesson card is data-driven.
    await page.goto("/lessons/101");
    await expect(page.getByRole("button", { name: /Ôn lại nội dung/ })).toBeVisible();
    const nextNav = page.getByRole("navigation", { name: "Điều hướng bài học liền kề" });
    await expect(nextNav).toBeVisible();
    await expect(nextNav.getByText("Kiểu số và chuỗi")).toBeVisible();

    // Advance via "Tiếp theo" → exactly one POST to the NEXT lesson's start route.
    const advanceCalls = trackStartCalls(page);
    await page.getByRole("button", { name: /Tiếp theo/ }).click();

    await expect(page).toHaveURL(/\/lessons\/102$/);
    await expect(page.getByRole("heading", { name: "Kiểu số và chuỗi" })).toBeVisible();
    await expect(page.getByText("Đang học", { exact: true }).first()).toBeVisible();

    await expect.poll(() => advanceCalls.length).toBe(1);
    expect(advanceCalls[0]).toMatchObject({
      method: "POST",
      url: "/api/lessons/102/start",
      status: 200,
    });
  });

  test("keeps Previous and preserves the existing final-Lesson behavior", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAs(page);
    await enrollInSeedCourse(page);

    await page.goto("/lessons/101");
    await page.getByRole("button", { name: "Bắt đầu bài học" }).click();
    await page.getByRole("link", { name: /Làm bài/ }).click();
    await expect(page).toHaveURL(/\/exercises\/1001$/);
    await page.getByRole("button", { name: "5" }).click();
    await page.getByRole("button", { name: "Nộp bài" }).click();
    const completedState = page.getByTestId("exercise-completed-state");
    await expect(completedState).toContainText("Hoàn thành");
    await expect(completedState.getByRole("link", { name: "Quay lại bài học" })).toHaveAttribute("href", "/lessons/101");
    await expect(page.getByRole("button", { name: /Nộp/u })).toHaveCount(0);

    // Lesson 102 is the last lesson in the seed course.
    await page.goto("/lessons/102");
    await expect(page.getByRole("heading", { name: "Kiểu số và chuỗi" })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu bài học" }).click();
    await expect(page.getByRole("article", { name: "Bài học" })).toBeVisible();

    // The final Lesson has no Next action, while Previous resolves from the same curriculum order.
    await expect(page.getByRole("button", { name: /Tiếp theo/ })).toHaveCount(0);
    const previousLink = page.getByRole("link", { name: /Bài trước/ });
    await expect(previousLink).toHaveAttribute("href", "/lessons/101");
    const portraitBox = await previousLink.boundingBox();
    expect(portraitBox?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.setViewportSize({ width: 667, height: 375 });
    await expect(previousLink).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("persists correct Exercise completion across return, reload, session, and learner isolation", async ({ page, browser }) => {
    await loginAs(page);
    await enrollInSeedCourse(page);
    await page.goto("/lessons/101");
    await page.getByRole("button", { name: "Bắt đầu bài học" }).click();

    const exerciseCard = page.getByTestId("lesson-exercise-1001");
    await expect(exerciseCard).toHaveAttribute("data-completed", "false");
    await exerciseCard.getByRole("link", { name: /Làm bài/ }).click();
    await page.getByRole("button", { name: "5" }).click();
    await page.getByRole("button", { name: "Nộp bài" }).click();
    const persistedCompletedState = page.getByTestId("exercise-completed-state");
    await expect(persistedCompletedState).toContainText("Hoàn thành");
    await expect(persistedCompletedState.getByRole("link", { name: "Quay lại bài học" })).toHaveAttribute("href", "/lessons/101");
    await expect(page.getByRole("button", { name: /Nộp/u })).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/exercises\/1001$/u);
    await expect(page.getByTestId("exercise-completed-state")).toContainText("Hoàn thành");
    await expect(page.getByRole("button", { name: "5" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "5" })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Nộp/u })).toHaveCount(0);

    await page.getByTestId("exercise-completed-state").getByRole("link", { name: "Quay lại bài học" }).click();
    await expect(page).toHaveURL(/\/lessons\/101$/u);
    await expect(page.getByTestId("lesson-exercise-1001")).toHaveAttribute("data-completed", "true");
    const reviewLink = page.getByRole("link", { name: /Xem lại/ });
    await expect(reviewLink).toHaveAttribute("href", "/exercises/1001?mode=review");
    await expect(page.getByRole("complementary", { name: "Thông tin bài học" })).toContainText("1/1 hoàn thành");

    await page.reload();
    await expect(page.getByTestId("lesson-exercise-1001")).toHaveAttribute("data-completed", "true");

    await reviewLink.click();
    await expect(page).toHaveURL(/\/exercises\/1001\?mode=review$/u);
    const persistedChoice = page.getByRole("button", { name: "5" });
    await expect(persistedChoice).toHaveAttribute("aria-pressed", "true");
    await expect(persistedChoice).toBeDisabled();
    await expect(page.getByTestId("exercise-completed-state")).toContainText("Hoàn thành");
    await expect(page.getByTestId("exercise-completed-state")).toContainText("2 cộng 3 bằng 5, nên chương trình in ra 5.");
    await expect(page.getByRole("button", { name: /Nộp/u })).toHaveCount(0);

    await page.reload();
    await expect(page).toHaveURL(/\/exercises\/1001\?mode=review$/u);
    await expect(page.getByRole("button", { name: "5" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "5" })).toBeDisabled();

    const sameLearnerContext = await browser.newContext();
    const sameLearnerPage = await sameLearnerContext.newPage();
    await loginAs(sameLearnerPage);
    await sameLearnerPage.goto("/lessons/101");
    await expect(sameLearnerPage.getByTestId("lesson-exercise-1001")).toHaveAttribute("data-completed", "true");
    await sameLearnerContext.close();

    const otherLearnerContext = await browser.newContext();
    const otherLearnerPage = await otherLearnerContext.newPage();
    await loginAs(otherLearnerPage, "learner2");
    await enrollInSeedCourse(otherLearnerPage);
    await otherLearnerPage.goto("/lessons/101");
    await otherLearnerPage.getByRole("button", { name: "Bắt đầu bài học" }).click();
    await expect(otherLearnerPage.getByTestId("lesson-exercise-1001")).toHaveAttribute("data-completed", "false");
    await expect(otherLearnerPage.getByRole("link", { name: /Làm bài/ })).toBeVisible();
    await otherLearnerPage.goto("/exercises/1001?mode=review");
    await expect(otherLearnerPage.getByRole("button", { name: "5" })).toHaveAttribute("aria-pressed", "false");
    await expect(otherLearnerPage.getByRole("button", { name: "Nộp bài" })).toBeVisible();
    await expect(otherLearnerPage.getByTestId("exercise-completed-state")).toHaveCount(0);
    await otherLearnerContext.close();
  });

  test("does not mark an incorrect-only Exercise attempt completed", async ({ page }) => {
    await loginAs(page);
    await enrollInSeedCourse(page);
    await page.goto("/lessons/101");
    await page.getByRole("button", { name: "Bắt đầu bài học" }).click();
    await page.getByRole("link", { name: /Làm bài/ }).click();
    await page.getByRole("button", { name: "4" }).click();
    await page.getByRole("button", { name: "Nộp bài" }).click();
    await expect(page.getByRole("status")).toContainText("Chưa chính xác");

    await page.getByRole("link", { name: "Quay lại bài học" }).click();
    await expect(page.getByTestId("lesson-exercise-1001")).toHaveAttribute("data-completed", "false");
    await page.reload();
    await expect(page.getByTestId("lesson-exercise-1001")).toHaveAttribute("data-completed", "false");
  });

  test("keeps unauthorized and not-enrolled access unchanged", async ({ page }) => {
    // Unauthenticated: the existing session guard redirects to /login?next=...
    await page.goto("/lessons/101");
    await expect(page).toHaveURL(/\/login\?next=%2Flessons%2F101$/);

    const anonymousGet = await page.request.get("/api/lessons/101");
    expect(anonymousGet.status()).toBe(401);
    const anonymousStart = await page.request.post("/api/lessons/101/start");
    expect(anonymousStart.status()).toBe(401);

    // Authenticated but not enrolled: page falls back to /courses; APIs return 403.
    await loginAs(page);
    await page.goto("/lessons/101");
    await expect(page).toHaveURL(/\/courses$/);

    const notEnrolledGet = await page.request.get("/api/lessons/101");
    expect(notEnrolledGet.status()).toBe(403);
    const notEnrolledStart = await page.request.post("/api/lessons/101/start");
    expect(notEnrolledStart.status()).toBe(403);

    // Missing/invalid lesson ids keep their existing API status codes.
    const missingGet = await page.request.get("/api/lessons/999");
    expect(missingGet.status()).toBe(404);
    const invalidGet = await page.request.get("/api/lessons/abc");
    expect(invalidGet.status()).toBe(400);
  });
});
