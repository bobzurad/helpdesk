/**
 * Login UI tests.
 *
 * Covers happy path, server-side errors (wrong password, non-existent email),
 * client-side zod validation (empty fields, invalid format), and the
 * already-authenticated redirect from /login.
 *
 * All tests start from an unauthenticated context (the default — no
 * storageState applied at the project level for this suite).
 */
import { test, expect } from "@playwright/test";
import { adminUser, nonExistentUser } from "../../fixtures/users";
import { submitLoginForm, loginViaUI } from "../../support/login";

test.describe("login", () => {
  test("seeded admin can sign in and lands on home with admin NavBar", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByLabel("Email")).toBeVisible();

    await submitLoginForm(page, adminUser);

    // After successful login, the LoginPage navigates to "/" replace.
    await page.waitForURL("**/");
    await expect(page).toHaveURL(/\/$/);

    // Admin sees the "Users" link in the NavBar (gated on session.user.role).
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();

    // Session cookie was set.
    const cookies = await page.context().cookies();
    expect(
      cookies.some((c) => c.name.includes("session")),
      `expected a session cookie, got: ${cookies.map((c) => c.name).join(", ")}`,
    ).toBe(true);
  });

  test("wrong password shows the error alert and stays on /login", async ({
    page,
  }) => {
    await page.goto("/login");

    await submitLoginForm(page, {
      email: adminUser.email,
      password: "definitely-not-the-right-password",
    });

    // The Alert from shadcn/ui has role="alert" by default.
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    // Better Auth returns a generic "Invalid email or password" message —
    // we only assert the alert is non-empty rather than couple to the
    // exact wording.
    await expect(alert).not.toBeEmpty();

    // URL must not have changed.
    await expect(page).toHaveURL(/\/login$/);

    // No session cookie was set.
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name.includes("session"))).toBe(false);
  });

  test("non-existent email shows the error alert", async ({ page }) => {
    await page.goto("/login");

    await submitLoginForm(page, nonExistentUser);

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("empty email and password trigger zod validation without hitting the API", async ({
    page,
  }) => {
    await page.goto("/login");

    // Track network calls to the auth endpoint to prove the API was not hit.
    let signInCalled = false;
    await page.route("**/api/auth/sign-in/**", (route) => {
      signInCalled = true;
      return route.continue();
    });

    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Zod messages from the schema:
    //   email:    "Enter a valid email"  (z.email())
    //   password: "Password is required" (z.string().min(1))
    await expect(page.getByText("Enter a valid email")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();

    // Inputs picked up aria-invalid.
    await expect(page.getByLabel("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.getByLabel("Password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    expect(signInCalled).toBe(false);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("invalid email format triggers zod validation", async ({ page }) => {
    await page.goto("/login");

    let signInCalled = false;
    await page.route("**/api/auth/sign-in/**", (route) => {
      signInCalled = true;
      return route.continue();
    });

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("whatever");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.getByText("Enter a valid email")).toBeVisible();
    expect(signInCalled).toBe(false);
  });

  test("already-authenticated user visiting /login is redirected to /", async ({
    page,
  }) => {
    // Sign in first.
    await loginViaUI(page, adminUser);
    await expect(page).toHaveURL(/\/$/);

    // Now try to visit /login.
    await page.goto("/login");

    // LoginPage renders <Navigate to="/" replace /> when a session is present,
    // so we should bounce back to "/".
    await page.waitForURL("**/");
    await expect(page).toHaveURL(/\/$/);
  });
});
