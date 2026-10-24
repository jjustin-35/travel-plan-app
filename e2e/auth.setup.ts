/**
 * One-time helper: open a browser, complete Google login manually,
 * then save storage state for authenticated E2E runs.
 *
 * Usage (with `npm run dev` already running optional):
 *   npx playwright test e2e/auth.setup.ts --project=chromium
 *
 * Or set E2E_STORAGE_STATE to a custom path.
 */
import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const storageStatePath =
  process.env.E2E_STORAGE_STATE ?? path.join("e2e", ".auth", "user.json");

setup("save authenticated storage state", async ({ page }) => {
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "旅路" })).toBeVisible();

  // Manual OAuth: wait until redirected to the app home after Google login.
  // Increase timeout if needed for interactive login.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 5 * 60_000,
  });

  await expect(page.getByRole("heading", { name: "旅路" })).toBeVisible({
    timeout: 30_000,
  });

  await page.context().storageState({ path: storageStatePath });
});
