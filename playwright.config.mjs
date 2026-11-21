import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4179";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  expect: { timeout: 12000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4179 --strictPort",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DEVARENA_E2E: "1",
      VITE_SUPABASE_URL: "https://example.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "fake-e2e-key",
    },
  },
});
