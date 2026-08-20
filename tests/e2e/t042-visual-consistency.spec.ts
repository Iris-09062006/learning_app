import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Browser, type Page } from "@playwright/test";

import {
  enrollInSeedCourse,
  loginAs,
  resetE2eData,
} from "./support/fixtures";

const evidenceDirectory = join("tmp", "stitch-screens", "t042");

const configurations = [
  { name: "desktop-1440-light", width: 1440, height: 900, dark: false },
  { name: "desktop-1440-dark", width: 1440, height: 900, dark: true },
  { name: "mobile-390-light", width: 390, height: 844, dark: false },
  { name: "mobile-390-dark", width: 390, height: 844, dark: true },
] as const;

const learnerRoutes = [
  "/dashboard",
  "/courses",
  "/courses/1",
  "/courses/1/roadmap",
  "/lessons/101",
  "/exercises/1001",
  "/profile",
] as const;

const adminRoutes = [
  "/admin/content",
  "/admin/users",
  "/moderation",
  "/moderation/3001",
  "/moderation/lessons/101/exercises/new",
] as const;

test.setTimeout(600_000);

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

async function applyTheme(page: Page, dark: boolean) {
  await page.evaluate((enabled) => {
    document.documentElement.classList.toggle("dark", enabled);
  }, dark);
  await expect(page.locator("html")).toHaveClass(dark ? /dark/u : /^(?!.*dark)/u);
}

async function expectSharedVisualSystem(page: Page, label: string) {
  const audit = await page.evaluate(() => {
    const rootStyle = window.getComputedStyle(document.documentElement);
    const bodyStyle = window.getComputedStyle(document.body);
    const legacyUtility = /(?:^|:)(?:bg|text|border|ring|outline|shadow|divide|placeholder|from|via|to)-(?:indigo|slate)-/u;
    const visibleLegacyClasses = Array.from(document.querySelectorAll<HTMLElement>("[class]"))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
      })
      .flatMap((element) => Array.from(element.classList))
      .filter((className) => legacyUtility.test(className));

    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyBackground: bodyStyle.backgroundColor,
      tokenBackground: rootStyle.getPropertyValue("--background").trim(),
      fontFamily: bodyStyle.fontFamily,
      visibleLegacyClasses: Array.from(new Set(visibleLegacyClasses)).sort(),
    };
  });

  expect(audit.scrollWidth, `${label}: horizontal page overflow`).toBeLessThanOrEqual(
    audit.clientWidth,
  );
  expect(audit.tokenBackground, `${label}: semantic background token`).not.toBe("");
  expect(audit.bodyBackground, `${label}: rendered background`).not.toBe("rgba(0, 0, 0, 0)");
  expect(audit.fontFamily, `${label}: Be Vietnam Pro`).toContain("Be Vietnam Pro");
  expect(audit.visibleLegacyClasses, `${label}: visible legacy color utilities`).toEqual([]);
}

async function captureRoute(
  page: Page,
  route: string,
  configuration: (typeof configurations)[number],
  role: "learner" | "admin",
) {
  await page.goto(route);
  await applyTheme(page, configuration.dark);
  await expect(page.locator("main")).toBeVisible();
  await expectSharedVisualSystem(page, `${configuration.name} ${route}`);
  await page.screenshot({
    path: join(
      evidenceDirectory,
      `${configuration.name}-${role}-${route.replace(/^\//u, "").replaceAll("/", "-")}.png`,
    ),
    fullPage: true,
  });
}

test("T042 mapped screens keep one tokenized visual system", async ({ browser, page }) => {
  mkdirSync(evidenceDirectory, { recursive: true });

  for (const configuration of configurations) {
    await resetE2eData(page);
    const viewport = { width: configuration.width, height: configuration.height };

    const learner = await rolePage(browser, "learner", viewport);
    await enrollInSeedCourse(learner.page);
    for (const route of learnerRoutes) {
      await captureRoute(learner.page, route, configuration, "learner");
    }
    await learner.context.close();

    const admin = await rolePage(browser, "admin", viewport);
    await admin.page.goto("/moderation/lessons/101/exercises/new");
    await admin.page.locator("form button[type=submit]").click();
    await expect(admin.page.locator('a[href="/moderation/3001"]')).toBeVisible();
    for (const route of adminRoutes) {
      await captureRoute(admin.page, route, configuration, "admin");
    }
    await admin.context.close();
  }
});
