/**
 * Session lifecycle tests.
 *
 * - Session survives a full page reload (cookie is persistent within the
 *   browser context).
 * - Two independent browser contexts can each hold a different session
 *   simultaneously (admin + agent at the same time).
 */
import { test, expect } from "@playwright/test";
import { adminUser, agentUser } from "../../fixtures/users";
import { loginViaUI } from "../../support/login";

test.describe("session lifecycle", () => {
  test("session persists across a full page reload", async ({ page }) => {
    await loginViaUI(page, adminUser);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();

    await page.reload();

    // Still authenticated — admin NavBar is still there, no redirect.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("two browser contexts hold independent sessions", async ({
    browser,
  }) => {
    const adminContext = await browser.newContext();
    const agentContext = await browser.newContext();

    try {
      const adminPage = await adminContext.newPage();
      const agentPage = await agentContext.newPage();

      await loginViaUI(adminPage, adminUser);
      await loginViaUI(agentPage, agentUser);

      // Each context lands on / with its own NavBar state.
      await adminPage.goto("/");
      await agentPage.goto("/");

      await expect(
        adminPage.getByRole("link", { name: "Users" }),
      ).toBeVisible();
      await expect(
        agentPage.getByRole("link", { name: "Users" }),
      ).toHaveCount(0);

      // Each context shows its own user name in the NavBar.
      await expect(adminPage.getByText(adminUser.name)).toBeVisible();
      await expect(agentPage.getByText(agentUser.name)).toBeVisible();
    } finally {
      await adminContext.close();
      await agentContext.close();
    }
  });
});
