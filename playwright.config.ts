import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const storageStatePath =
  process.env.E2E_STORAGE_STATE ?? path.join("e2e", ".auth", "user.json");
const hasAuthState = fs.existsSync(storageStatePath);

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(hasAuthState ? { storageState: storageStatePath } : {}),
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
