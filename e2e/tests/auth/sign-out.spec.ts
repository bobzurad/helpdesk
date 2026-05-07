/**
 * Sign-out tests.
 *
 * The NavBar's Sign out button calls `authClient.signOut()` and then
 * navigates to /login. After sign-out:
 *   - the session cookie should be gone
 *   - subsequent visits to / should redirect back to /login
 */
import { test, expect } from "@playwright/test";
import { adminUser } from "../../fixtures/users";
import { loginViaUI } from "../../support/login";

test.describe("sign out", () => {
  test("clicking Sign out lands on /login and clears the session", async ({
    page,
  }) => {
    await loginViaUI(page, adminUser);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    // Wait for the sign-out request to complete *and* for the navigation
    // before asserting on cookies — racing the cookie check against the
    // signOut() POST is a classic flake source.
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/auth/sign-out") && r.request().method() === "POST",
      ),
      page.waitForURL("**/login"),
      page.getByRole("button", { name: "Sign out" }).click(),
    ]);

    await expect(page).toHaveURL(/\/login$/);

    const cookies = await page.context().cookies();
    expect(
      cookies.some((c) => c.name.includes("session")),
      `expected no session cookie after sign out, got: ${cookies
        .map((c) => c.name)
        .join(", ")}`,
    ).toBe(false);
  });

  test("after sign-out, visiting / redirects to /login", async ({ page }) => {
    await loginViaUI(page, adminUser);
    await page.goto("/");

    await Promise.all([
      page.waitForURL("**/login"),
      page.getByRole("button", { name: "Sign out" }).click(),
    ]);

    // Try to access a protected route again.
    await page.goto("/");
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login$/);
  });
});
