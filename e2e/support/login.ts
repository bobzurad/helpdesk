/**
 * Login helpers for the auth e2e suite.
 *
 * Two flavors:
 *   - `loginViaUI(page, creds)` — drives the LoginPage form. Use when the test
 *     is *about* the login UI (this is the auth suite, so most tests use this).
 *   - `loginViaApi(request, creds)` — POSTs straight to Better Auth. Use only
 *     for setup-style steps inside tests that aren't exercising the login UI
 *     itself (e.g., a sign-out test that needs to start signed-in cheaply).
 *
 * Selectors follow the LoginPage component (client/src/pages/LoginPage.tsx):
 *   - Email input has <Label htmlFor="email">Email</Label> -> getByLabel("Email")
 *   - Password input has <Label htmlFor="password">Password</Label> -> getByLabel("Password")
 *   - Submit button text toggles between "Sign in" and "Signing in…" — match
 *     by exact text "Sign in" so we don't accidentally also match the loading
 *     state.
 */
import type { Page, APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";

export type Credentials = {
  email: string;
  password: string;
};

/**
 * Fill and submit the login form. Does NOT assert success/failure — let the
 * caller decide what to assert (e.g. URL change for happy path, alert for
 * error path).
 */
export async function submitLoginForm(page: Page, creds: Credentials) {
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/**
 * Navigate to /login and submit the form, asserting that we end up on /
 * (the home page). Use for the canonical "log this user in" setup step.
 */
export async function loginViaUI(page: Page, creds: Credentials) {
  await page.goto("/login");
  await submitLoginForm(page, creds);
  await page.waitForURL("**/");
  // Sanity-check that the protected NavBar rendered, so we know the session
  // is fully established before the test continues.
  await expect(
    page.getByRole("link", { name: "Helpdesk" }),
  ).toBeVisible();
}

/**
 * Sign in by hitting the Better Auth endpoint directly. Returns once the
 * session cookie is set on the request context. Use only for setup steps that
 * don't need to exercise the login UI.
 */
export async function loginViaApi(
  request: APIRequestContext,
  creds: Credentials,
) {
  const response = await request.post("/api/auth/sign-in/email", {
    data: { email: creds.email, password: creds.password },
  });
  if (!response.ok()) {
    throw new Error(
      `loginViaApi failed: ${response.status()} ${await response.text()}`,
    );
  }
  return response;
}
