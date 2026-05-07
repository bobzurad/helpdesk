/**
 * Route protection tests.
 *
 * - Unauthenticated visits to / and /users redirect to /login.
 * - AGENT users hitting /users are redirected to / (not /login) — this is the
 *   role-gate behavior of <RequireAdmin>.
 * - ADMIN users can render /users.
 */
import { test, expect } from "@playwright/test";
import { adminUser, agentUser } from "../../fixtures/users";
import { loginViaUI } from "../../support/login";

test.describe("route protection", () => {
  test.describe("unauthenticated", () => {
    test("visiting / redirects to /login", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL("**/login");
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByLabel("Email")).toBeVisible();
    });

    test("visiting /users redirects to /login", async ({ page }) => {
      await page.goto("/users");
      await page.waitForURL("**/login");
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  test.describe("AGENT role", () => {
    test("visiting /users is redirected to / (not /login)", async ({
      page,
    }) => {
      await loginViaUI(page, agentUser);

      await page.goto("/users");

      // RequireAdmin's redirect is to "/", not "/login".
      await page.waitForURL("**/");
      await expect(page).toHaveURL(/\/$/);

      // And the agent NavBar must NOT show the Users link.
      await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
    });

    test("can access / normally", async ({ page }) => {
      await loginViaUI(page, agentUser);
      await page.goto("/");
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("heading", { name: "Helpdesk" }),
      ).toBeVisible();
    });
  });

  test.describe("ADMIN role", () => {
    test("can render /users", async ({ page }) => {
      await loginViaUI(page, adminUser);

      await page.goto("/users");
      await expect(page).toHaveURL(/\/users$/);

      // UsersPage renders an h1 "Users".
      await expect(
        page.getByRole("heading", { name: "Users" }),
      ).toBeVisible();
    });
  });
});
