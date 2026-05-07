/**
 * GET /api/users authorization tests (no browser).
 *
 * The route is gated by the `requireAdmin` middleware. We exercise all three
 * auth states directly against the API surface so that a regression in the
 * middleware (e.g. forgetting to gate the route, returning 200 instead of 403)
 * is caught even if the UI still happens to render correctly.
 *
 *   - no session  -> 401
 *   - AGENT       -> 403
 *   - ADMIN       -> 200, body shape { users: [...] }
 *
 * We use Playwright's `request` fixture (test-scoped APIRequestContext) for
 * the authenticated cases — `loginViaApi` populates the session cookie on
 * that context so subsequent requests are authenticated. For the
 * unauthenticated case we deliberately spin up an isolated context via
 * `playwright.request.newContext()` so it can't accidentally inherit cookies
 * from anywhere.
 */
import { test, expect, request as pwRequest } from "@playwright/test";
import { adminUser, agentUser } from "../../fixtures/users";
import { loginViaApi } from "../../support/login";

test.describe("GET /api/users (authorization)", () => {
  test("returns 401 when there is no session cookie", async ({ baseURL }) => {
    // Fresh, isolated context — guaranteed to have no cookies from any
    // previous test, login, or storage state.
    const ctx = await pwRequest.newContext({ baseURL });
    try {
      const response = await ctx.get("/api/users");
      expect(response.status()).toBe(401);
    } finally {
      await ctx.dispose();
    }
  });

  test("returns 403 for an authenticated AGENT", async ({ request }) => {
    await loginViaApi(request, agentUser);

    const response = await request.get("/api/users");
    expect(response.status()).toBe(403);
  });

  test("returns 200 with a users array for an authenticated ADMIN", async ({
    request,
  }) => {
    await loginViaApi(request, adminUser);

    const response = await request.get("/api/users");
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      users: Array<{
        id: string;
        email: string;
        name: string;
        role: "ADMIN" | "AGENT";
        createdAt: string;
      }>;
    };

    expect(Array.isArray(body.users)).toBe(true);
    // We expect at least the seeded admin and the global-setup-created agent.
    expect(body.users.length).toBeGreaterThanOrEqual(2);

    // Spot-check that the seeded admin is in the list with the right role.
    const adminEntry = body.users.find((u) => u.email === adminUser.email);
    expect(adminEntry).toBeDefined();
    expect(adminEntry?.role).toBe("ADMIN");

    // And the agent created by global-setup.
    const agentEntry = body.users.find((u) => u.email === agentUser.email);
    expect(agentEntry).toBeDefined();
    expect(agentEntry?.role).toBe("AGENT");

    // Each row exposes only the safe fields documented in the API — no
    // password hashes, no tokens, etc.
    for (const u of body.users) {
      expect(Object.keys(u).sort()).toEqual(
        ["createdAt", "email", "id", "name", "role"].sort(),
      );
    }
  });
});
