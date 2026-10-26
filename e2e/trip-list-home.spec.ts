import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const storageStatePath =
  process.env.E2E_STORAGE_STATE ?? path.join("e2e", ".auth", "user.json");
const hasAuthState = fs.existsSync(storageStatePath);

async function waitForHomeReady(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "旅路" })).toBeVisible();
  // List finished loading: empty copy or a trip section / card title area
  await expect(
    page
      .getByText("還沒有行程")
      .or(page.getByRole("heading", { name: "即將到來" }))
      .or(page.getByRole("heading", { name: "過去的行程" }))
  ).toBeVisible({ timeout: 30_000 });
}

async function tripCardCount(page: Page) {
  return page.locator('[role="button"]').filter({ has: page.locator("h3") }).count();
}

test.describe("trip-list-home (authenticated)", () => {
  test.beforeEach(() => {
    test.skip(
      !hasAuthState,
      `Missing auth state at ${storageStatePath}. Run: npx playwright test e2e/auth.setup.ts`
    );
  });

  test("TC-01 — 空狀態", async ({ page }) => {
    await waitForHomeReady(page);

    const empty = page.getByText("還沒有行程");
    const hasEmpty = await empty.isVisible().catch(() => false);
    test.skip(!hasEmpty, "Account already has trips; use an empty QA account for TC-01");

    await expect(empty).toBeVisible();
    await expect(page.getByTitle("新增行程")).toBeVisible();
  });

  test("TC-02 — 開啟現有行程", async ({ page }) => {
    await waitForHomeReady(page);

    const cards = page.locator('[role="button"]').filter({ has: page.locator("h3") });
    const count = await cards.count();
    test.skip(count === 0, "No trips on account; seed at least one ready trip for TC-02");

    const title = (await cards.first().locator("h3").textContent())?.trim() ?? "";
    await cards.first().click();

    await expect(page).toHaveURL(/\/trips\/[^/]+$/);
    if (title) {
      await expect(page.getByText(title).first()).toBeVisible();
    }
  });

  test("TC-03 — 建立新行程入口", async ({ page }) => {
    await waitForHomeReady(page);
    await page.getByTitle("新增行程").click();
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("TC-04 — 行程頁返回首頁", async ({ page }) => {
    await waitForHomeReady(page);

    const cards = page.locator('[role="button"]').filter({ has: page.locator("h3") });
    const count = await cards.count();
    test.skip(count === 0, "No trips on account; seed at least one trip for TC-04");

    await cards.first().click();
    await expect(page).toHaveURL(/\/trips\/[^/]+$/);

    await page.getByRole("link", { name: "返回首頁" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "旅路" })).toBeVisible();
    await expect(
      page
        .getByText("還沒有行程")
        .or(page.getByRole("heading", { name: "即將到來" }))
        .or(page.getByRole("heading", { name: "過去的行程" }))
    ).toBeVisible();
  });

  test("TC-05 — 刪除行程後列表更新", async ({ page }) => {
    await waitForHomeReady(page);

    const before = await tripCardCount(page);
    test.skip(before === 0, "No trips on account; seed a disposable trip for TC-05");

    const firstCard = page
      .locator('[role="button"]')
      .filter({ has: page.locator("h3") })
      .first();
    const title = (await firstCard.locator("h3").textContent())?.trim() ?? "";

    await firstCard.getByRole("button", { name: "刪除行程" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "刪除" }).click();

    await expect(page.getByRole("alertdialog")).toBeHidden({ timeout: 15_000 });

    if (title) {
      await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
    }
    await expect
      .poll(async () => tripCardCount(page), { timeout: 15_000 })
      .toBe(before - 1);
  });
});

test.describe("trip-list-home (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("TC-06 — 未登入導向 login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "旅路" })).toBeVisible();
  });
});
