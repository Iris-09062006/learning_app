import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

export const E2E_PASSWORD = "Password123!";
const E2E_SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";

export async function resetE2eData(page: Page) {
  const response = await page.request.post(`${E2E_SUPABASE_URL}/__e2e/reset`);
  expect(response.ok()).toBe(true);
}

export async function loginAs(
  page: Page,
  role: "learner" | "learner2" | "moderator" | "admin" = "learner",
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`${role}@example.com`);
  await page.getByLabel("Mật khẩu").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/dashboard$/u);
  await expect(page.getByRole("heading", { name: /Chào mừng trở lại/u })).toBeVisible();
}

export async function enrollInSeedCourse(page: Page) {
  await page.goto("/courses");
  await page.getByRole("link", { name: "Xem chi tiết" }).first().click();
  await expect(page.getByRole("heading", { name: "Python căn bản" })).toBeVisible();
  await page.getByRole("button", { name: "Đăng ký khóa học" }).click();
  const startButton = page.getByRole("button", { name: "Bắt đầu học" });
  await expect(startButton).toBeVisible();
  await startButton.click();
  await expect(page).toHaveURL(/\/courses\/1\/roadmap$/u);
}

export async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );

  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

export async function expectVisibleKeyboardFocus(page: Page) {
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  const hasIndicator = await focused.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return (
      style.outlineStyle !== "none"
      || style.boxShadow !== "none"
      || style.textDecorationLine.includes("underline")
    );
  });
  expect(hasIndicator).toBe(true);
}

export async function focusWithTab(page: Page, target: Locator, maxTabs = 8) {
  for (let index = 0; index < maxTabs; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}
