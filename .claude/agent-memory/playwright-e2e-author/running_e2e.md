---
name: Running the e2e suite cleanly
description: webServer constraints and conflicts with `bun run dev`
type: project
---

The e2e Playwright config sets `reuseExistingServer: false` on both `webServer` entries (server on `:3001`, client on `:5173`). This is intentional — the e2e server MUST run with `DATABASE_URL=$TEST_DATABASE_URL`, and reusing a dev server pointed at the dev DB would corrupt dev data and produce nonsense test results.

**Consequence**: if `bun run dev` is already running when you start `bun run test:e2e`, Playwright fails fast with:

```
Error: http://localhost:3001/api/health is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true in config.webServer.
```

**Resolution**: stop the dev server first. Don't change `reuseExistingServer` to `true` to "fix" this — it will silently run the suite against the dev DB.

Canonical run sequence:
1. Make sure Postgres is up: `docker compose up -d` (containers `helpdesk-postgres` on `:5432` and `helpdesk-pgadmin` on `:5433`).
2. Stop any running `bun run dev`.
3. From repo root: `bun run test:e2e` — this resets the test DB, applies migrations, seeds the ADMIN, then boots its own server+client and runs the suite.

Useful scripts:
- `bun run test:e2e` — the canonical command
- `bun run test:e2e:ui` — Playwright UI mode (still resets the DB first)
- `bun run test:e2e:install` — installs Playwright browsers (run once on a new machine)
- `bun --filter @helpdesk/e2e report` — opens the last HTML report
- `cd e2e && bunx playwright test --list` — enumerates tests without booting any server (useful for verifying spec discovery / globs)
