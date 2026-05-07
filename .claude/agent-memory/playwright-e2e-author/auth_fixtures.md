---
name: Auth fixtures and AGENT user creation
description: How the seeded ADMIN and on-demand AGENT user are wired up for e2e tests
type: project
---

Two test users exist in the test DB:

**ADMIN** — seeded by `e2e/scripts/reset-test-db.ts` before Playwright boots. Credentials come from `TEST_SEED_ADMIN_EMAIL` / `TEST_SEED_ADMIN_PASSWORD` in `.env`. The reset script invokes `server/prisma/seed.ts` with these env vars overriding the dev `SEED_ADMIN_*` values.

**AGENT** — created by `e2e/global-setup.ts` after webServer is up. Uses the existing `bun --filter @helpdesk/server create-user` script (real production code path) spawned with `DATABASE_URL=$TEST_DATABASE_URL`. Credentials are hardcoded constants in `e2e/fixtures/users.ts`:
- email: `agent.e2e@test.local`
- password: `test-agent-password-12345`
- name: `Agent E2E`

The agent email is intentionally distinct from anything in the dev seed so a misconfigured run pointed at the dev DB would obviously collide / fail. Both users are read from `e2e/fixtures/users.ts` — never hardcode in specs.

**Why globalSetup vs a setup project**: a setup *project* using `storageState` would force every test to start authenticated, which is the wrong default for an auth suite (most tests want to start logged-out and exercise login). globalSetup just creates the DB row once and lets each test sign in (or not) on its own terms.

**Idempotency**: the `create-user` script exits non-zero on duplicate email. global-setup pattern-matches `/already exists/i` in stderr and treats it as success — so a developer running `playwright test` directly (without `db:reset`) doesn't get a confusing failure. The canonical flow (`bun run test:e2e`) always starts from a fresh DB so the user is created cleanly.
