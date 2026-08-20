import { mkdirSync } from "node:fs";
import { join } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";

import {
  loginAs,
  resetE2eData,
} from "./support/fixtures";

const evidenceDirectory = join("tmp", "stitch-screens", "t039");

test.setTimeout(180_000);

const visualConfigurations = [
  { name: "desktop-light", width: 1440, height: 900, dark: false },
  { name: "desktop-dark", width: 1440, height: 900, dark: true },
  { name: "mobile-light", width: 390, height: 844, dark: false },
  { name: "mobile-dark", width: 390, height: 844, dark: true },
  { name: "tablet-landscape-light", width: 1024, height: 768, dark: false },
  { name: "tablet-portrait-dark", width: 768, height: 1024, dark: true },
] as const;

async function verifyPageSafety(page: Page, dark: boolean) {
  await page.evaluate((enabled) => {
    document.documentElement.classList.toggle("dark", enabled);
  }, dark);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(dark);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

async function openRolePage(
  browser: Browser,
  storageState: Awaited<ReturnType<BrowserContext["storageState"]>>,
  config: (typeof visualConfigurations)[number],
) {
  const context = await browser.newContext({
    storageState,
    viewport: { width: config.width, height: config.height },
  });
  await context.addInitScript((dark) => {
    document.documentElement.classList.toggle("dark", dark);
  }, config.dark);
  const page = await context.newPage();
  return { context, page };
}

async function authenticatedState(
  browser: Browser,
  role: "learner" | "moderator" | "admin",
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, role);
  const storageState = await context.storageState();
  await context.close();
  return storageState;
}

test("T039 shared loading, empty and error states remain safe across themes and viewports", async ({
  browser,
  page: resetPage,
}) => {
  mkdirSync(evidenceDirectory, { recursive: true });
  await resetE2eData(resetPage);
  const learnerState = await authenticatedState(browser, "learner");
  const moderatorState = await authenticatedState(browser, "moderator");
  const adminState = await authenticatedState(browser, "admin");

  for (const config of visualConfigurations) {
    await resetE2eData(resetPage);

    const learner = await openRolePage(browser, learnerState, config);
    await learner.page.goto("/dashboard");
    const dashboardEmpty = learner.page.locator('[data-state="empty"]').filter({
      hasText: "Bạn chưa đăng ký khóa học nào.",
    });
    await expect(dashboardEmpty).toBeVisible();
    await expect(dashboardEmpty).toHaveClass(/bg-surface/u);
    await verifyPageSafety(learner.page, config.dark);
    await learner.page.screenshot({
      path: join(evidenceDirectory, `${config.name}-dashboard-empty.png`),
      fullPage: true,
    });

    let enrollmentCalls = 0;
    await learner.page.route("**/api/courses/1/enroll", async (route) => {
      enrollmentCalls += 1;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { message: "Không thể đăng ký khóa học lúc này." },
        }),
      });
    });
    await learner.page.goto("/courses/1");
    await learner.page.getByRole("button", { name: "Đăng ký khóa học" }).click();
    const courseAlert = learner.page.getByRole("alert").filter({
      hasText: "Không thể đăng ký khóa học lúc này.",
    });
    await expect(courseAlert).toHaveText("Không thể đăng ký khóa học lúc này.");
    await expect(courseAlert).toHaveClass(/bg-danger-soft/u);
    expect(enrollmentCalls).toBe(1);
    await verifyPageSafety(learner.page, config.dark);
    await learner.context.close();

    const moderator = await openRolePage(browser, moderatorState, config);
    let releaseQueue: (() => void) | undefined;
    let queueMode: "empty" | "error" = "empty";
    await moderator.page.route("**/api/moderation/generated-exercises?**", async (route) => {
      if (queueMode === "error") {
        await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
        return;
      }
      await new Promise<void>((resolve) => {
        releaseQueue = resolve;
      });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, limit: 10 }),
      });
    });
    await moderator.page.goto("/moderation");
    const queueLoading = moderator.page.locator('[data-state="loading"]');
    await expect(queueLoading).toHaveAttribute("aria-busy", "true");
    releaseQueue?.();
    const queueEmpty = moderator.page.locator('[data-state="empty"]');
    await expect(queueEmpty).toContainText("Không có bài tập nào khớp");

    queueMode = "error";
    await moderator.page.getByLabel("Trạng thái:").selectOption("approved");
    const queueAlert = moderator.page.getByRole("alert").filter({
      hasText: "Lỗi tải danh sách",
    });
    await expect(queueAlert).toContainText("Lỗi tải danh sách");
    await expect(queueAlert).toHaveClass(/bg-danger-soft/u);
    await verifyPageSafety(moderator.page, config.dark);
    await moderator.page.screenshot({
      path: join(evidenceDirectory, `${config.name}-moderation-error.png`),
      fullPage: true,
    });
    await moderator.context.close();

    const admin = await openRolePage(browser, adminState, config);
    await admin.page.route("**/api/admin/users?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 },
        }),
      });
    });
    await admin.page.goto("/admin/users");
    await admin.page.getByRole("button", { name: "Áp dụng bộ lọc" }).click();
    const usersEmpty = admin.page.locator('[data-state="empty"]');
    await expect(usersEmpty).toContainText("Không tìm thấy người dùng phù hợp.");
    await verifyPageSafety(admin.page, config.dark);
    await admin.page.screenshot({
      path: join(evidenceDirectory, `${config.name}-admin-users-empty.png`),
      fullPage: true,
    });
    await admin.context.close();
  }
});
