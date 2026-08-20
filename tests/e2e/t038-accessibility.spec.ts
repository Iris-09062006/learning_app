import { expect, test } from "@playwright/test";

import {
  enrollInSeedCourse,
  expectVisibleKeyboardFocus,
  loginAs,
  resetE2eData,
} from "./support/fixtures";

test("keeps the keyboard focus indicator visible after Lesson content opens", async ({ page }) => {
  await resetE2eData(page);
  await loginAs(page);
  await enrollInSeedCourse(page);
  await page.goto("/lessons/101");

  const startButton = page.getByRole("button", { name: "Bắt đầu bài học" });
  await startButton.focus();
  await page.keyboard.press("Enter");

  const article = page.getByRole("article", { name: "Bài học" });
  await expect(article).toBeFocused();
  await expectVisibleKeyboardFocus(page);
});
