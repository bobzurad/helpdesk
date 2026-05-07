/**
 * UsersPage UI tests.
 *
 * Covers the admin-only /users page from the user-perceivable side:
 *   - ADMIN sees the page heading + a table populated with at least their own
 *     row (admin email, ADMIN role badge).
 *   - ADMIN can reach /users by clicking the NavBar "Users" link (not just by
 *     typing the URL).
 *   - AGENT is bounced from /users back to / by <RequireAdmin>, and the NavBar
 *     never offered them a Users link in the first place.
 *   - Unauthenticated visitors are bounced to /login by <RequireAuth>.
 *
 * Some of these flows overlap with `tests/auth/route-protection.spec.ts` and
 * `tests/auth/navbar.spec.ts`. That's intentional — the auth suite tells the
 * "route guards work" story, this suite tells the "Users feature works
 * end-to-end" story. Each suite should remain readable on its own.
 */
import { test, expect } from "@playwright/test";
import { adminUser, agentUser } from "../../fixtures/users";
import { loginViaUI } from "../../support/login";

test.describe("Users page (UI)", () => {
  test.describe("ADMIN", () => {
    test("renders the page heading and a table with the admin's row", async ({
      page,
    }) => {
      await loginViaUI(page, adminUser);

      await page.goto("/users");
      await expect(page).toHaveURL(/\/users$/);

      // Heading.
      await expect(
        page.getByRole("heading", { name: "Users", level: 1 }),
      ).toBeVisible();

      // Table column headers, in document order.
      const headers = page.getByRole("columnheader");
      await expect(headers).toHaveText(["Name", "Email", "Role", "Created"]);

      // The seeded admin's row must be present. Find the row by the admin's
      // email cell, then assert the role cell on that same row.
      const adminRow = page.getByRole("row").filter({
        has: page.getByRole("cell", { name: adminUser.email, exact: true }),
      });
      await expect(adminRow).toBeVisible();
      await expect(adminRow.getByText("ADMIN", { exact: true })).toBeVisible();
    });

    test("clicking the NavBar 'Users' link navigates to /users", async ({
      page,
    }) => {
      await loginViaUI(page, adminUser);

      // Start from the home page.
      await page.goto("/");
      await expect(page).toHaveURL(/\/$/);

      await page.getByRole("link", { name: "Users" }).click();

      await page.waitForURL("**/users");
      await expect(page).toHaveURL(/\/users$/);
      await expect(
        page.getByRole("heading", { name: "Users", level: 1 }),
      ).toBeVisible();
    });

    test("table includes the AGENT user with an AGENT role badge", async ({
      page,
    }) => {
      // The AGENT is created in global-setup, so any successful run has at
      // least two users in the test DB by the time tests execute. This guards
      // against a regression where the API silently filters out non-admins.
      await loginViaUI(page, adminUser);
      await page.goto("/users");

      const agentRow = page.getByRole("row").filter({
        has: page.getByRole("cell", { name: agentUser.email, exact: true }),
      });
      await expect(agentRow).toBeVisible();
      await expect(agentRow.getByText("AGENT", { exact: true })).toBeVisible();
    });
  });

  test.describe("AGENT", () => {
    test("is redirected from /users to /, and never sees a Users link", async ({
      page,
    }) => {
      await loginViaUI(page, agentUser);

      // NavBar must not advertise the Users link to a non-admin. Wait for the
      // agent's name to render first so we know the session has loaded — then
      // a missing Users link can't be a "still loading" false positive.
      await expect(page.getByText(agentUser.name)).toBeVisible();
      await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);

      // Direct navigation by URL is also blocked — RequireAdmin sends them
      // back to "/" (NOT to /login, which is the unauthenticated path).
      await page.goto("/users");
      await page.waitForURL("**/");
      await expect(page).toHaveURL(/\/$/);
    });
  });

  test.describe("unauthenticated", () => {
    test("visiting /users sends the visitor to /login", async ({ page }) => {
      await page.goto("/users");

      await page.waitForURL("**/login");
      await expect(page).toHaveURL(/\/login$/);

      // The login form is rendered (sanity check that we landed on LoginPage,
      // not some other route that happens to match /login).
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
    });
  });
});
