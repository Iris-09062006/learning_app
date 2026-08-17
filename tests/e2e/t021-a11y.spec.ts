import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  enrollInSeedCourse,
  loginAs,
  resetE2eData,
} from "./support/fixtures";

test.describe("T021 Lesson Accessibility & UX Audit", () => {
  test.beforeEach(async ({ page }) => {
    await resetE2eData(page);
  });

  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ];

  const themes = ["light", "dark"] as const;

  const isBlocking = (v: { impact?: string }) =>
    v.impact === "critical" || v.impact === "serious";

  const logViolations = (
    label: string,
    violations: Awaited<ReturnType<InstanceType<typeof AxeBuilder>["analyze"]>>["violations"],
  ) => {
    console.log(`\n=== [AXE REPORT] ${label} (Total: ${violations.length}) ===`);
    for (const v of violations) {
      console.log(
        `Rule: ${v.id} | Impact: ${v.impact} | Help: ${v.help} | Nodes: ${v.nodes.length}`,
      );
      for (const n of v.nodes) {
        console.log(`  Target: ${JSON.stringify(n.target)}`);
        console.log(`  HTML: ${n.html}`);
        console.log(`  Failure: ${n.failureSummary}`);
        for (const check of [...n.any, ...n.all, ...n.none]) {
          if (check.data) {
            const data =
              typeof check.data === "string" ? check.data : JSON.stringify(check.data);
            console.log(`  Check(${check.id}) Data: ${data}`);
          }
        }
      }
    }
  };

  for (const vp of viewports) {
    for (const theme of themes) {
      test(`axe a11y scan: ${vp.name} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await loginAs(page);
        await enrollInSeedCourse(page);

        await page.goto("/lessons/101");
        await expect(page.getByRole("heading", { name: "Biến và phép gán" })).toBeVisible();

        if (theme === "dark") {
          await page.evaluate(() => document.documentElement.classList.add("dark"));
        }

        // 1. Scan Pre-start state
        const preStartResults = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        logViolations(`${vp.name} ${theme} pre-start`, preStartResults.violations);

        // 2. Start the lesson
        await page.getByRole("button", { name: "Bắt đầu bài học" }).click();
        await expect(page.getByRole("article", { name: "Bài học" })).toBeVisible();

        // 3. Scan In-progress state
        const inProgressResults = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        logViolations(`${vp.name} ${theme} in-progress`, inProgressResults.violations);

        const preStartBlocking = preStartResults.violations.filter(isBlocking);
        const inProgressBlocking = inProgressResults.violations.filter(isBlocking);
        console.log(
          `[SUMMARY] ${vp.name} ${theme}: pre=${preStartBlocking.length}, inProg=${inProgressBlocking.length}`,
        );
        expect(preStartBlocking).toEqual([]);
        expect(inProgressBlocking).toEqual([]);
      });
    }
  }
});
