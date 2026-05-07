---
name: Better Auth API endpoints from Playwright
description: Endpoint shapes and cookie semantics observed when calling Better Auth from Playwright tests
type: project
---

This project mounts Better Auth at `/api/auth/*splat` (Express 5 catch-all syntax — note `*splat`, not `*`). Important for Playwright tests:

**Endpoints used in tests**:
- `POST /api/auth/sign-in/email` — body `{ email, password }`. Returns 2xx + `set-cookie` on success, 4xx on bad creds. Used by `loginViaApi` helper and by the `route()` interception in zod-validation tests.
- `POST /api/auth/sign-up/email` — body `{ email, password, name }`. With `disableSignUp: true` (this project's config), returns a 4xx error response and does NOT set a session cookie.
- `POST /api/auth/sign-out` — called by `authClient.signOut()` from the NavBar. After this completes, the session cookie is gone.

**Session cookie**: cookie name varies by Better Auth version but contains "session" — assert with `cookies.some((c) => c.name.includes("session"))` rather than pinning the exact name.

**Race condition mitigation**: in the sign-out test, wait for *both* the `POST /api/auth/sign-out` response AND the `/login` URL navigation before asserting on cookies. Asserting on cookies right after a click without waiting on the response is a classic flake source — the navigation can complete before the cookie is cleared.

**Rate limiting in test**: the global Express `express-rate-limit` is gated behind `process.env.NODE_ENV === "production"` so it's OFF in test. Better Auth's own rate limiter is also disabled outside production by default. No need to throttle test setup.

**Trusted origins / CORS**: Playwright's webServer config passes `BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173` and `CORS_ORIGINS=http://localhost:5173` to the server process, so cross-origin cookies work just like in dev.
