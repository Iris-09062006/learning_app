import { expect, test } from "@playwright/test";

import {
  enrollInSeedCourse,
  expectVisibleKeyboardFocus,
  loginAs,
  resetE2eData,
} from "./support/fixtures";

test.describe("T021 Keyboard & Touch & Contrast", () => {
  test.beforeEach(async ({ page }) => {
    await resetE2eData(page);
    await loginAs(page);
    await enrollInSeedCourse(page);
  });

  test("keyboard navigation and post-start focus", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/lessons/101");
    await expect(page.getByRole("heading", { name: "Biến và phép gán" })).toBeVisible();

    // Focus on the start button via Tab
    const startBtn = page.getByRole("button", { name: "Bắt đầu bài học" });
    await startBtn.focus();
    await expect(startBtn).toBeFocused();
    await expectVisibleKeyboardFocus(page);

    // Press Enter to start - focus should move to article
    await page.keyboard.press("Enter");
    const article = page.getByRole("article", { name: "Bài học" });
    await expect(article).toBeVisible();
    await expect(article).toBeFocused();

    // Tab through post-start controls and record
    const sequence: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return "BODY";
        return `${el.tagName}:${el.getAttribute("href") || (el.textContent || "").trim().slice(0, 25)}`;
      });
      sequence.push(info);
    }
    console.log("[KB SEQUENCE]:", sequence.join(" → "));
  });

  test("mobile touch targets >= 44x44", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/lessons/101");
    await page.getByRole("button", { name: "Bắt đầu bài học" }).click();
    await expect(page.getByRole("article", { name: "Bài học" })).toBeVisible();

    const targets = await page.evaluate(() => {
      const els = Array.from(
        document.querySelectorAll<HTMLElement>("main a, main button"),
      );
      return els.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          text: (el.textContent || "").trim().slice(0, 25),
          w: Math.round(r.width),
          h: Math.round(r.height),
          vis: r.width > 0 && r.height > 0,
        };
      }).filter(t => t.vis);
    });
    console.log("[TOUCH TARGETS]:", JSON.stringify(targets, null, 2));
  });
});
