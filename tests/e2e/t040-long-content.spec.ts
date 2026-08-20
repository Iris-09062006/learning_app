import { mkdirSync } from "node:fs";
import { join } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import {
  enrollInSeedCourse,
  loginAs,
  resetE2eData,
} from "./support/fixtures";

const evidenceDirectory = join("tmp", "stitch-screens", "t040");
const longWord = "NoiDungTiengVietKhongCoDiemNgat".repeat(12);
const longCode = `result = ${"identifier".repeat(100)}`;

const configurations = [
  { name: "desktop-1440-light", width: 1440, height: 900, dark: false },
  { name: "desktop-1440-dark", width: 1440, height: 900, dark: true },
  { name: "desktop-1280-light", width: 1280, height: 800, dark: false },
  { name: "tablet-768-dark", width: 768, height: 1024, dark: true },
  { name: "mobile-390-light", width: 390, height: 844, dark: false },
  { name: "mobile-390-dark", width: 390, height: 844, dark: true },
] as const;

test.setTimeout(600_000);

async function applyTheme(page: Page, dark: boolean) {
  await page.evaluate((enabled) => {
    document.documentElement.classList.toggle("dark", enabled);
  }, dark);
  await expect(page.locator("html")).toHaveClass(dark ? /dark/u : /^(?!.*dark)/u);
}

async function expectPageContained(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth, label).toBeLessThanOrEqual(metrics.clientWidth);
}

async function expectNoBlockingAxe(page: Page) {
  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
}

async function seedCourseCatalog(page: Page) {
  await page.goto("/courses");
  const card = page.getByTestId("course-card").first();
  await expect(card).toBeVisible();
  const title = card.locator("h3");
  await title.evaluate((element, value) => {
    element.textContent = value;
    element.setAttribute("title", value);
  }, longWord);
  await card.locator("p").first().evaluate((element, value) => {
    element.textContent = value;
  }, longWord);
  await expect(title).toHaveCSS("-webkit-line-clamp", "2");
}

async function seedLesson(page: Page) {
  await page.goto("/lessons/101");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  const lessonArticle = page.locator('article[aria-labelledby="lesson-body-title"]');
  if ((await lessonArticle.count()) === 0) {
    await page.locator("header button").click();
    await expect(lessonArticle).toBeVisible();
  }
  await heading.evaluate((element, value) => {
    element.textContent = value;
  }, longWord);
  const bodyCopy = lessonArticle.locator("p").last();
  await bodyCopy.evaluate((element, value) => {
    element.textContent = value;
  }, longWord);
}

async function seedExercise(page: Page) {
  await page.goto("/exercises/1001");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await heading.evaluate((element, value) => {
    element.textContent = value;
  }, longWord);
  const pre = page.locator("pre").first();
  await expect(pre).toBeVisible();
  await pre.evaluate((element, value) => {
    element.textContent = value;
  }, longCode);
  const codeMetrics = await pre.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(codeMetrics.scrollWidth).toBeGreaterThan(codeMetrics.clientWidth);
}

async function seedAdminUsers(page: Page) {
  await page.goto("/admin/users");
  const table = page.locator("table");
  await expect(table).toBeVisible();
  const identityCell = table.locator("tbody td").first();
  await identityCell.locator("p").nth(0).evaluate((element, value) => {
    element.textContent = value;
  }, longWord);
  await identityCell.locator("p").nth(1).evaluate((element, value) => {
    element.textContent = `${value}@example.test`;
  }, longWord);
  await expect(table.locator("tbody p").nth(0)).toHaveCSS("word-break", "break-all");
}

async function seedModerationDetail(page: Page) {
  await page.goto("/moderation/lessons/101/exercises/new");
  await page.locator("form button[type=submit]").click();
  await page.goto("/moderation/3001");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await heading.evaluate((element, value) => {
    element.textContent = value;
  }, longWord);
  const payload = page.locator("pre");
  await payload.evaluate((element, value) => {
    element.textContent = value;
  }, longCode);
  const payloadMetrics = await payload.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(payloadMetrics.scrollWidth).toBeGreaterThan(payloadMetrics.clientWidth);
}

async function rolePage(
  browser: Browser,
  role: "learner" | "admin",
  viewport: { width: number; height: number },
) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await loginAs(page, role);
  return { context, page };
}

test("T040 long content stays within mapped learner and admin surfaces", async ({ browser, page }) => {
  mkdirSync(evidenceDirectory, { recursive: true });

  for (const config of configurations) {
    await resetE2eData(page);
    const viewport = { width: config.width, height: config.height };

    const learner = await rolePage(browser, "learner", viewport);
    await enrollInSeedCourse(learner.page);
    await seedCourseCatalog(learner.page);
    await applyTheme(learner.page, config.dark);
    await expectPageContained(learner.page, `${config.name} course catalog`);
    await learner.page.screenshot({
      path: join(evidenceDirectory, `${config.name}-catalog.png`),
      fullPage: true,
    });

    await seedLesson(learner.page);
    await applyTheme(learner.page, config.dark);
    await expectPageContained(learner.page, `${config.name} lesson`);
    await expectNoBlockingAxe(learner.page);
    await learner.page.screenshot({
      path: join(evidenceDirectory, `${config.name}-lesson.png`),
      fullPage: true,
    });

    await seedExercise(learner.page);
    await applyTheme(learner.page, config.dark);
    await expectPageContained(learner.page, `${config.name} exercise`);
    await learner.page.screenshot({
      path: join(evidenceDirectory, `${config.name}-exercise.png`),
      fullPage: true,
    });
    await learner.context.close();

    const admin = await rolePage(browser, "admin", viewport);
    await seedAdminUsers(admin.page);
    await applyTheme(admin.page, config.dark);
    await expectPageContained(admin.page, `${config.name} users table`);
    await admin.page.screenshot({
      path: join(evidenceDirectory, `${config.name}-admin-users.png`),
      fullPage: true,
    });

    await seedModerationDetail(admin.page);
    await applyTheme(admin.page, config.dark);
    await expectPageContained(admin.page, `${config.name} moderation detail`);
    await expectNoBlockingAxe(admin.page);
    await admin.page.screenshot({
      path: join(evidenceDirectory, `${config.name}-moderation-detail.png`),
      fullPage: true,
    });
    await admin.context.close();
  }
});
