/**
 * Sign-up-disabled tests.
 *
 * Better Auth is configured with `emailAndPassword.disableSignUp: true` (see
 * server/src/auth.ts). There is no UI form for sign-up, so this is a pure API
 * assertion: posting to /api/auth/sign-up/email must NOT create a user and
 * must NOT return a successful response.
 *
 * We also confirm that no session cookie is issued — a misconfigured server
 * could conceivably reject the user creation but still hand back a session,
 * which would be a real security regression worth catching here.
 */
import { test, expect } from "@playwright/test";

test.describe("sign-up disabled", () => {
  test("POST /api/auth/sign-up/email is rejected", async ({ request }) => {
    const response = await request.post("/api/auth/sign-up/email", {
      data: {
        email: "newcomer@test.local",
        password: "should-not-work-12345",
        name: "Newcomer",
      },
      // We expect this to fail; don't let Playwright throw on non-2xx.
      failOnStatusCode: false,
    });

    expect(
      response.ok(),
      `expected sign-up to be rejected, got ${response.status()} ${await response
        .text()
        .catch(() => "")}`,
    ).toBe(false);

    // Better Auth typically returns 400 with a JSON error body when sign-up
    // is disabled. We don't pin the exact status — any 4xx is acceptable —
    // but it must be a client error, not a 5xx (which would indicate a
    // server bug rather than an intentional rejection).
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);

    // No session cookie was issued.
    const setCookies = response.headers()["set-cookie"];
    expect(setCookies ?? "").not.toMatch(/session/i);
  });

  test("subsequent login with the rejected credentials fails", async ({
    request,
  }) => {
    // Belt-and-braces: ensure the sign-up didn't actually create the user.
    const signIn = await request.post("/api/auth/sign-in/email", {
      data: {
        email: "newcomer@test.local",
        password: "should-not-work-12345",
      },
      failOnStatusCode: false,
    });

    expect(signIn.ok()).toBe(false);
  });
});
