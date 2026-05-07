---
name: Users feature e2e suite
description: How the /users page and /api/users authorization tests are structured and where to put new ones
type: project
---

The Users feature has its own test suite at `e2e/tests/users/`, paralleling `e2e/tests/auth/`:

- `users-page.spec.ts` — UI tests against the `/users` page. ADMIN happy path (heading, table headers, admin row + ADMIN badge, agent row + AGENT badge, NavBar Users link click navigates), AGENT redirected to `/`, unauthenticated redirected to `/login`.
- `users-api.spec.ts` — API-level authorization for `GET /api/users` using the `request` fixture. Three states: no cookies → 401, AGENT session → 403, ADMIN session → 200 with `{ users: [...] }`. Asserts the response shape includes only `id, email, name, role, createdAt` (no password hash leak).

**Why the overlap with `tests/auth/route-protection.spec.ts` is intentional**: route-protection covers "guards work" generically; this suite covers "the Users feature works" end-to-end. Each is readable on its own. Don't fold them together.

**Patterns worth reusing**:

- Locating a row by an email cell, then asserting on a sibling cell:
  ```ts
  const row = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: email, exact: true }),
  });
  await expect(row.getByText("ADMIN", { exact: true })).toBeVisible();
  ```
  Using `getByRole("row")` + `filter({ has: ... })` keeps the locator semantic and avoids depending on shadcn Table's CSS classes.
- Asserting table column headers in document order: `await expect(page.getByRole("columnheader")).toHaveText(["Name", "Email", "Role", "Created"])`.
- For an unauthenticated API request, prefer a fresh isolated context over the test-scoped `request` fixture: `const ctx = await pwRequest.newContext({ baseURL })`. Always `dispose()` in a finally block. Using the test fixture would technically work too, but the isolated context is self-documenting (no possibility of inheriting cookies from anywhere).
- Authenticated API tests use `loginViaApi(request, creds)` from `support/login.ts` to populate the session cookie on the test-scoped request context, then make the real GET against the same context.

**State assumptions** the API admin test relies on: at least 2 users in the test DB (the seeded ADMIN + the global-setup AGENT). The reset-test-db + global-setup pipeline guarantees both exist at the start of every `bun run test:e2e` run.
