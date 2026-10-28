import { defineConfig, devices } from "@playwright/test";

// Public UI coverage is independent of an externally provisioned database.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  retries: process.env["CI"] ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    channel:
      process.env["PLAYWRIGHT_CHANNEL"] || (process.platform === "win32" ? "msedge" : "chromium"),
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env["CI"],
    timeout: 60000,
    env: {
      DATABASE_URL: "",
      AUTH_SECRET: "e2e-only-no-real-users-no-production-secret",
      AUTH_TRUST_HOST: "true",
    },
  },
});
