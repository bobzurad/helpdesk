/**
 * NavBar role-based visibility tests.
 *
 * The NavBar reads `session.user.role` from authClient.useSession() and only
 * shows the "Users" link when role === "ADMIN".
 */
import { test, expect } from "@playwright/test";
import { adminUser, agentUser } from "../../fixtures/users";
import { loginViaUI } from "../../support/login";

test.describe("NavBar", () => {
  test("ADMIN sees the Users link and their name", async ({ page }) => {
    await loginViaUI(page, adminUser);
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(page.getByText(adminUser.name)).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("AGENT does NOT see the Users link", async ({ page }) => {
    await loginViaUI(page, agentUser);
    await page.goto("/");

    // Wait for NavBar to render with the agent's name first, so we know the
    // session has loaded — otherwise the absence-of-Users-link assertion
    // could pass for the wrong reason (the NavBar simply hasn't rendered yet).
    await expect(page.getByText(agentUser.name)).toBeVisible();

    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  });
});
