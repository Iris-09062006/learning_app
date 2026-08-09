import { expect, test } from "@playwright/test";

test("renders the product landing page without a framework error", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Học Python bằng cách/i }),
  ).toBeVisible();
  await expect(page.getByText("AI Mentor an toàn")).toBeVisible();
  await expect(page.getByRole("link", { name: "Bắt đầu học" })).toHaveAttribute(
    "href",
    "/register",
  );
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
  expect(consoleErrors).toEqual([]);

  await page.getByRole("link", { name: "Bắt đầu học" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Bắt đầu học Python" })).toBeVisible();
});

test("keeps onboarding and health routes out of the login redirect", async ({ request }) => {
  const register = await request.get("/register", { maxRedirects: 0 });
  expect(register.status()).toBe(200);

  const login = await request.post("/api/auth/login", {
    data: {},
    maxRedirects: 0,
  });
  expect(login.status()).toBe(400);
  expect(login.headers()["content-type"]).toContain("application/json");

  const health = await request.get("/api/system/health", { maxRedirects: 0 });
  expect([200, 503]).toContain(health.status());
  expect(health.headers()["content-type"]).toContain("application/json");

  const dashboard = await request.get("/dashboard", { maxRedirects: 0 });
  expect(dashboard.status()).toBe(307);
  expect(dashboard.headers().location).toContain("/login?next=%2Fdashboard");
});
