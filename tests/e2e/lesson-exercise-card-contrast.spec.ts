import { expect, test } from "@playwright/test";

import { loginAs, resetE2eData } from "./support/fixtures";

const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
] as const;

test("keeps Lesson exercise cards readable on the dark authenticated surface", async ({ page }) => {
  await resetE2eData(page);
  await loginAs(page, "admin");

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/moderation/lessons");

    const card = page.locator("ul > li").first();
    const courseLabel = card.locator("p");
    const lessonTitle = card.getByRole("heading", { level: 2 });
    const createExerciseButton = card.getByRole("link", { name: /Exercise/u });

    await expect(card).toBeVisible();
    await expect(courseLabel).toBeVisible();
    await expect(lessonTitle).toBeVisible();
    await expect(createExerciseButton).toBeVisible();

    const evidence = await page.evaluate(() => {
      const cardElement = document.querySelector<HTMLElement>("ul > li");
      const courseLabelElement = cardElement?.querySelector<HTMLElement>("p");
      const lessonTitleElement = cardElement?.querySelector<HTMLElement>("h2");
      const buttonElement = cardElement?.querySelector<HTMLElement>("a");
      if (!cardElement || !courseLabelElement || !lessonTitleElement || !buttonElement) {
        throw new Error("Lesson exercise card is incomplete");
      }

      const computed = (element: HTMLElement) => {
        const style = window.getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
          opacity: style.opacity,
          classes: element.className,
        };
      };
      const parseRgb = (value: string) => {
        const channels = value.match(/[\d.]+/gu)?.slice(0, 3).map(Number);
        if (!channels || channels.length !== 3) throw new Error(`Unsupported color: ${value}`);
        return channels;
      };
      const luminance = (value: string) => {
        const channels = parseRgb(value).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const contrast = (foreground: string, background: string) => {
        const foregroundLuminance = luminance(foreground);
        const backgroundLuminance = luminance(background);
        return Number(
          (
            (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
            / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
          ).toFixed(2),
        );
      };

      const cardStyle = computed(cardElement);
      const courseLabelStyle = computed(courseLabelElement);
      const lessonTitleStyle = computed(lessonTitleElement);
      const buttonStyle = computed(buttonElement);
      const inheritedTokens = window.getComputedStyle(cardElement);
      return {
        card: cardStyle,
        courseLabel: courseLabelStyle,
        lessonTitle: lessonTitleStyle,
        createExerciseButton: buttonStyle,
        contrast: {
          courseLabel: contrast(courseLabelStyle.color, cardStyle.backgroundColor),
          lessonTitle: contrast(lessonTitleStyle.color, cardStyle.backgroundColor),
          createExerciseButton: contrast(buttonStyle.color, buttonStyle.backgroundColor),
        },
        tokens: {
          card: inheritedTokens.getPropertyValue("--card").trim(),
          background: inheritedTokens.getPropertyValue("--background").trim(),
          foreground: inheritedTokens.getPropertyValue("--foreground").trim(),
          surface: inheritedTokens.getPropertyValue("--surface").trim(),
          textPrimary: inheritedTokens.getPropertyValue("--text-primary").trim(),
        },
        darkAncestor: Boolean(cardElement.closest(".dark")),
        viewport: {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        },
        userAgent: navigator.userAgent,
      };
    });

    console.log(`LESSON_CARD_COMPUTED_STYLES ${JSON.stringify(evidence)}`);
    expect(evidence.darkAncestor).toBe(true);
    expect(evidence.card.classes).toContain("bg-surface");
    expect(evidence.card.classes).toContain("text-text-primary");
    expect(evidence.card.classes).not.toMatch(/\bbg-white\b/u);
    expect(evidence.courseLabel.classes).toContain("text-primary");
    expect(evidence.lessonTitle.classes).toContain("text-text-primary");
    expect(evidence.card.backgroundColor).toBe("rgb(17, 24, 39)");
    expect(evidence.card.color).toBe("rgb(248, 250, 252)");
    expect(evidence.lessonTitle.color).toBe("rgb(248, 250, 252)");
    expect(evidence.card.opacity).toBe("1");
    expect(evidence.courseLabel.opacity).toBe("1");
    expect(evidence.lessonTitle.opacity).toBe("1");
    expect(evidence.createExerciseButton.opacity).toBe("1");
    expect(evidence.contrast.courseLabel).toBeGreaterThanOrEqual(4.5);
    expect(evidence.contrast.lessonTitle).toBeGreaterThanOrEqual(4.5);
    expect(evidence.contrast.createExerciseButton).toBeGreaterThanOrEqual(4.5);
    expect(evidence.tokens.card).toBe("");
    expect(evidence.tokens.foreground).toBe("");
    expect(evidence.tokens.surface).toBe("#111827");
    expect(evidence.tokens.textPrimary).toBe("#f8fafc");
    expect(evidence.viewport.scrollWidth).toBeLessThanOrEqual(evidence.viewport.clientWidth);

    await createExerciseButton.hover();
    await expect(createExerciseButton).toHaveCSS("background-color", "rgb(199, 210, 254)");
    await expect(createExerciseButton).toHaveCSS("color", "rgb(23, 26, 53)");

    await createExerciseButton.focus();
    const focusStyle = await createExerciseButton.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return { boxShadow: style.boxShadow, outlineStyle: style.outlineStyle };
    });
    expect(focusStyle.boxShadow !== "none" || focusStyle.outlineStyle !== "none").toBe(true);
  }
});
