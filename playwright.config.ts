import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev -- --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "pixel-5",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "iphone-14-pro-max",
      use: { ...devices["iPhone 14 Pro Max"], browserName: "chromium" },
    },
  ],
});
