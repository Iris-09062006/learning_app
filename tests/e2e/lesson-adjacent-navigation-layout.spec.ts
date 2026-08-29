import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { enrollInSeedCourse, loginAs, resetE2eData } from "./support/fixtures";

const viewports = [
  { name: "mobile-375", width: 375, height: 667 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1920", width: 1920, height: 1080 },
] as const;

async function enableThreeLessonLayout(page: Page): Promise<void> {
  const baseUrl = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const response = await page.request.post(`${baseUrl}/__e2e/adjacency-layout`);
  expect(response.ok()).toBe(true);
}

async function openVisibleLesson(page: Page, lessonId: number): Promise<Locator> {
  await page.goto(`/lessons/${lessonId}`);
  await page.getByRole("button", { name: "Bắt đầu bài học" }).click();
  await expect(page.getByRole("article", { name: "Bài học" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Điều hướng bài học liền kề" });
  await expect(nav).toBeVisible();
  return nav;
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function expectSingleCardLayout(nav: Locator, cardTestId: string): Promise<void> {
  await expect(nav).toHaveAttribute("data-layout", "single-column");
  const cards = nav.locator(":scope > div");
  await expect(cards).toHaveCount(1);
  const navBox = await nav.boundingBox();
  const cardBox = await nav.getByTestId(cardTestId).boundingBox();
  expect(navBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(Math.abs((navBox?.width ?? 0) - (cardBox?.width ?? 0))).toBeLessThanOrEqual(1);
}

async function expectTwoCardLayout(nav: Locator, viewportWidth: number): Promise<void> {
  await expect(nav).toHaveAttribute("data-layout", "two-columns");
  const previousBox = await nav.getByTestId("lesson-previous-card").boundingBox();
  const nextBox = await nav.getByTestId("lesson-next-card").boundingBox();
  expect(previousBox).not.toBeNull();
  expect(nextBox).not.toBeNull();
  expect(Math.abs((previousBox?.width ?? 0) - (nextBox?.width ?? 0))).toBeLessThanOrEqual(1);
  if (viewportWidth >= 640) {
    expect(nextBox?.x).toBeGreaterThan((previousBox?.x ?? 0) + (previousBox?.width ?? 0));
  } else {
    expect(Math.abs((previousBox?.x ?? 0) - (nextBox?.x ?? 0))).toBeLessThanOrEqual(1);
    expect(nextBox?.y).toBeGreaterThan((previousBox?.y ?? 0) + (previousBox?.height ?? 0));
  }
}

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
}

for (const viewport of viewports) {
  test(`adjacent navigation adapts across first, middle, and last Lessons at ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await resetE2eData(page);
    await enableThreeLessonLayout(page);
    await loginAs(page);
    await enrollInSeedCourse(page);

    const firstNav = await openVisibleLesson(page, 101);
    await expect(firstNav.getByRole("link", { name: /Bài trước/ })).toHaveCount(0);
    await expect(firstNav.getByRole("button", { name: /Tiếp theo/ })).toBeVisible();
    await expectSingleCardLayout(firstNav, "lesson-next-card");
    expect((await firstNav.getByRole("button", { name: /Tiếp theo/ }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, `first-next-only-${viewport.name}`);

    const middleNav = await openVisibleLesson(page, 102);
    await expect(middleNav.getByRole("link", { name: /Bài trước/ })).toHaveAttribute("href", "/lessons/101");
    await expect(middleNav.getByRole("button", { name: /Tiếp theo/ })).toBeVisible();
    await expectTwoCardLayout(middleNav, viewport.width);
    expect((await middleNav.getByRole("link", { name: /Bài trước/ }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect((await middleNav.getByRole("button", { name: /Tiếp theo/ }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, `middle-both-${viewport.name}`);

    const lastNav = await openVisibleLesson(page, 103);
    await expect(lastNav.getByRole("link", { name: /Bài trước/ })).toHaveAttribute("href", "/lessons/102");
    await expect(lastNav.getByRole("button", { name: /Tiếp theo/ })).toHaveCount(0);
    await expectSingleCardLayout(lastNav, "lesson-previous-card");
    expect((await lastNav.getByRole("link", { name: /Bài trước/ }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
    await capture(page, testInfo, `last-previous-only-${viewport.name}`);
  });
}
