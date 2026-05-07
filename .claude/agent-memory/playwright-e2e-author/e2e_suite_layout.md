---
name: Helpdesk e2e suite layout
description: Where tests, fixtures, helpers, and globalSetup live in the e2e workspace
type: project
---

The e2e workspace is a top-level Bun workspace at `/home/bob/git/claude-course/helpdesk/e2e/`.

Layout:

- `playwright.config.ts` — boots server+client via two `webServer` entries (server uses `DATABASE_URL=$TEST_DATABASE_URL`), `fullyParallel: false`, `workers: 1`, `reuseExistingServer: false`, `baseURL: http://localhost:5173`. `globalSetup` is wired to `./global-setup.ts`.
- `global-setup.ts` — runs once after webServer is up, before any tests. Creates the AGENT user via spawned `bun --filter @helpdesk/server create-user` with `DATABASE_URL` overridden to the test DB. Tolerates "already exists" output so devs running `playwright test` directly (skipping `db:reset`) don't get a confusing failure.
- `scripts/reset-test-db.ts` — invoked by the `test` npm script BEFORE Playwright. Drops public schema, runs `prisma migrate deploy`, runs `server/prisma/seed.ts` with `SEED_ADMIN_*` overridden to the `TEST_SEED_ADMIN_*` values. End result: every `bun run test:e2e` starts with one ADMIN seeded.
- `fixtures/users.ts` — exports `adminUser` (reads `TEST_SEED_ADMIN_EMAIL/PASSWORD` from env), `agentUser` (hardcoded constants matching what global-setup creates), `nonExistentUser` (for negative tests). NEVER hardcode credentials in spec files — always import from here.
- `support/login.ts` — exports `submitLoginForm(page, creds)` (just fills + clicks, no assertions), `loginViaUI(page, creds)` (full happy-path login including waitForURL and a NavBar visibility sanity-check), and `loginViaApi(request, creds)` (POST to `/api/auth/sign-in/email` for setup steps that don't need to exercise the UI).
- `tests/auth/` — six spec files: `login.spec.ts`, `route-protection.spec.ts`, `navbar.spec.ts`, `sign-out.spec.ts`, `session-lifecycle.spec.ts`, `sign-up-disabled.spec.ts`. 19 tests total.

The auth suite intentionally does NOT use `storageState` projects. Most tests in this domain start unauthenticated by design (the login flow IS the test). Tests that need an authenticated session sign in via `loginViaUI` at the start. This is per Playwright's own guidance for auth suites and keeps the assertions honest.

Run with `bun run test:e2e` from repo root (or `bun --filter @helpdesk/e2e test`).
