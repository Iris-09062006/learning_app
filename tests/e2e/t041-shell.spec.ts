import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import {
  enrollInSeedCourse,
  focusWithTab,
  loginAs,
  resetE2eData,
} from "./support/fixtures";

const evidenceDirectory = join("tmp", "stitch-screens", "t041");

const primaryConfigurations = [
  { name: "desktop-1440-light", width: 1440, height: 900, dark: false },
  { name: "desktop-1440-dark", width: 1440, height: 900, dark: true },
  { name: "mobile-390-light", width: 390, height: 844, dark: false },
  { name: "mobile-390-dark", width: 390, height: 844, dark: true },
] as const;

const responsiveConfigurations = [
  { name: "desktop-1280-light", width: 1280, height: 800, dark: false },
  { name: "desktop-1024-dark", width: 1024, height: 768, dark: true },
  { name: "tablet-768-light", width: 768, height: 1024, dark: false },
  { name: "mobile-375-dark", width: 375, height: 667, dark: true },
] as const;

const learnerRoutes = [
  { path: "/dashboard", activeHref: "/dashboard" },
  { path: "/courses", activeHref: "/courses" },
  { path: "/courses/1/roadmap", activeHref: "/courses" },
  { path: "/lessons/101", activeHref: null },
] as const;

const adminRoutes = [
  { path: "/admin/content", activeHref: "/admin/content" },
  { path: "/admin/users", activeHref: "/admin/users" },
  { path: "/moderation", activeHref: "/moderation" },
  { path: "/moderation/3001", activeHref: "/moderation" },
] as const;

interface ContrastEvidence {
  configuration: string;
  route: string;
  foreground: string;
  background: string;
  ratio: number;
}

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

function visibleNavigation(page: Page, width: number) {
  return width >= 1024 ? page.locator("aside") : page.locator("nav.fixed.bottom-0");
}

async function expectShellGeometry(page: Page, width: number) {
  const aside = page.locator("aside");
  const mobileTopBar = page.locator("div.fixed.inset-x-0.top-0.z-30");
  const mobileNavigation = page.locator("nav.fixed.bottom-0");

  if (width >= 1024) {
    await expect(aside).toBeVisible();
    await expect(aside).toHaveCSS("width", "288px");
    await expect(mobileTopBar).toBeHidden();
    await expect(mobileNavigation).toBeHidden();
  } else {
    await expect(aside).toBeHidden();
    await expect(mobileTopBar).toBeVisible();
    await expect(mobileNavigation).toBeVisible();
  }

  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
}

async function expectActiveRoute(
  page: Page,
  width: number,
  activeHref: string | null,
) {
  const navigation = visibleNavigation(page, width);
  const currentItems = navigation.locator('[aria-current="page"]');

  if (activeHref === null) {
    await expect(currentItems).toHaveCount(0);
    return null;
  }

  await expect(currentItems).toHaveCount(1);
  const activeItem = currentItems.first();
  await expect(activeItem).toHaveAttribute("href", activeHref);
  await expect(activeItem).toHaveClass(/bg-primary-soft/u);
  await expect(activeItem).toHaveClass(/text-primary/u);
  return activeItem;
}

async function measureContrast(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    function parseRgb(value: string) {
      const channels = value.match(/[\d.]+/gu)?.slice(0, 3).map(Number);
      if (!channels || channels.length !== 3) throw new Error(`Unsupported color: ${value}`);
      return channels;
    }

    function luminance(value: string) {
      const channels = parseRgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    const style = window.getComputedStyle(element);
    const foreground = style.color;
    const background = style.backgroundColor;
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    const ratio =
      (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
      / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);

    return { foreground, background, ratio: Number(ratio.toFixed(2)) };
  });
}

async function expectShellAxeClean(page: Page) {
  const results = await new AxeBuilder({ page })
    .include("aside")
    .include("nav.fixed.bottom-0")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
    JSON.stringify(results.violations, null, 2),
  ).toEqual([]);
}

async function seedModerationDraft(page: Page) {
  await page.goto("/moderation/lessons/101/exercises/new");
  await page.locator("form button[type=submit]").click();
  await expect(page.locator('a[href="/moderation/3001"]')).toBeVisible();
}

test("measures active shell contrast before and after the semantic cleanup", async ({ browser, page }) => {
  mkdirSync(evidenceDirectory, { recursive: true });
  await resetE2eData(page);
  const evidence: ContrastEvidence[] = [];

  for (const configuration of primaryConfigurations) {
    const session = await rolePage(browser, "learner", {
      width: configuration.width,
      height: configuration.height,
    });
    await session.page.goto("/courses/1");
    await applyTheme(session.page, configuration.dark);
    await expectShellGeometry(session.page, configuration.width);
    const activeSelector = configuration.width >= 1024
      ? 'aside [aria-current="page"]'
      : 'nav.fixed.bottom-0 [aria-current="page"]';
    const contrast = await measureContrast(session.page, activeSelector);
    evidence.push({
      configuration: configuration.name,
      route: "/courses/1",
      ...contrast,
    });
    writeFileSync(
      join(evidenceDirectory, "active-contrast.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    );
    expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
    await session.context.close();
  }
});

test("keeps shared shell behavior, accessibility, and responsive geometry unchanged", async ({ browser, page }) => {
  mkdirSync(evidenceDirectory, { recursive: true });

  for (const configuration of primaryConfigurations) {
    await resetE2eData(page);
    const viewport = { width: configuration.width, height: configuration.height };

    const learner = await rolePage(browser, "learner", viewport);
    await enrollInSeedCourse(learner.page);
    for (const route of learnerRoutes) {
      await learner.page.goto(route.path);
      await applyTheme(learner.page, configuration.dark);
      await expectShellGeometry(learner.page, configuration.width);
      const activeItem = await expectActiveRoute(
        learner.page,
        configuration.width,
        route.activeHref,
      );
      if (activeItem) {
        await learner.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await focusWithTab(learner.page, activeItem, 16);
        const focusStyle = await activeItem.evaluate((element) => {
          const style = window.getComputedStyle(element);
          return { outlineStyle: style.outlineStyle, boxShadow: style.boxShadow };
        });
        expect(
          focusStyle.outlineStyle !== "none" || focusStyle.boxShadow !== "none",
        ).toBe(true);
      }
      await expectShellAxeClean(learner.page);
      await learner.page.screenshot({
        path: join(
          evidenceDirectory,
          `${configuration.name}-learner-${route.path.replace(/^\//u, "").replaceAll("/", "-")}.png`,
        ),
        fullPage: true,
      });
    }
    await learner.context.close();

    const admin = await rolePage(browser, "admin", viewport);
    await seedModerationDraft(admin.page);
    for (const route of adminRoutes) {
      await admin.page.goto(route.path);
      await applyTheme(admin.page, configuration.dark);
      await expectShellGeometry(admin.page, configuration.width);
      await expectActiveRoute(admin.page, configuration.width, route.activeHref);
      await expectShellAxeClean(admin.page);
      await admin.page.screenshot({
        path: join(
          evidenceDirectory,
          `${configuration.name}-admin-${route.path.replace(/^\//u, "").replaceAll("/", "-")}.png`,
        ),
        fullPage: true,
      });
    }
    await admin.context.close();
  }

  for (const configuration of responsiveConfigurations) {
    const session = await rolePage(browser, "admin", {
      width: configuration.width,
      height: configuration.height,
    });
    await session.page.goto("/admin/users");
    await applyTheme(session.page, configuration.dark);
    await expectShellGeometry(session.page, configuration.width);
    await expectActiveRoute(session.page, configuration.width, "/admin/users");
    await session.context.close();
  }
});
