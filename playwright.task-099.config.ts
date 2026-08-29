import { defineConfig, devices } from "@playwright/test";

process.env.E2E_SUPABASE_URL = "http://127.0.0.1:54325";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "t022-functional-regression.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3115",
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
      url: "http://127.0.0.1:54325/__e2e/health",
      reuseExistingServer: false,
      env: {
        ...process.env,
        E2E_SUPABASE_PORT: "54325",
      },
    },
    {
      command: "npm run dev -- --port 3115",
      url: "http://127.0.0.1:3115",
      reuseExistingServer: false,
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3115",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54325",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "e2e-service-role-key",
        AI_API_KEY: "e2e-ai-key",
        AI_PROVIDER_URL: "http://127.0.0.1:54325/v1/chat/completions",
        AI_PROVIDER_MODEL: "e2e-model",
      },
    },
  ],
});
