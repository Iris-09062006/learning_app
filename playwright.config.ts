import { defineConfig, devices } from "@playwright/test";

const browserExecutablePath = process.env.PLAYWRIGHT_BROWSER_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    launchOptions: browserExecutablePath
      ? { executablePath: browserExecutablePath }
      : undefined,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node tests/e2e/support/mock-supabase-server.mjs",
      url: "http://127.0.0.1:54321/__e2e/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: false,
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "e2e-service-role-key",
        AI_API_KEY: "e2e-ai-key",
        AI_PROVIDER_URL: "http://127.0.0.1:54321/v1/chat/completions",
        AI_PROVIDER_MODEL: "e2e-model",
      },
    },
  ],
});
