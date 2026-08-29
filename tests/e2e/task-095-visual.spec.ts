import { expect, test } from "@playwright/test";

import { loginAs, resetE2eData } from "./support/fixtures";

test("landing keeps the new brand and hierarchy responsive", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: /Một lộ trình rõ ràng/u })).toBeVisible();
  await expect(page.getByRole("link", { name: /LearningApp/u }).first()).toBeVisible();
  await expect(page.getByText("LA", { exact: true })).toHaveCount(0);

  const viewportHasNoOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(viewportHasNoOverflow).toBe(true);
});

test("authenticated catalog renders the redesigned application shell", async ({ page }) => {
  await resetE2eData(page);
  await loginAs(page, "learner");
  await page.goto("/courses");

  await expect(page.getByRole("heading", { level: 1, name: "Khám phá khóa học" })).toBeVisible();
  await expect(page.getByRole("complementary").getByText("E2E Learner")).toBeVisible();
  await expect(page.getByTestId("course-card")).toHaveCount(2);
  await expect(page.getByText("LA", { exact: true })).toHaveCount(0);
});
