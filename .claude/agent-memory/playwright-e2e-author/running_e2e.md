---
name: Running the e2e suite cleanly
description: webServer constraints and conflicts with `bun run dev`
type: project
---

The e2e Playwright config sets `reuseExistingServer: false` on both `webServer` entries. The e2e ports are deliberately distinct from dev so the two can run side-by-side: **e2e server `:5174`, e2e client `:3002`** (dev uses `:3001` / `:5173`). The config drives this via `E2E_SERVER_URL` / `E2E_CLIENT_URL`, falling back to those defaults, and passes `PORT` / `VITE_DEV_PORT` / `VITE_API_PROXY_TARGET` to the spawned processes. `client/vite.config.ts` reads those env vars and enables `strictPort` when set.

`reuseExistingServer: false` is still important: the e2e server MUST run with `DATABASE_URL=$TEST_DATABASE_URL`, and accidentally reusing some other server would corrupt data or produce nonsense test results.

**Consequence**: with the distinct ports, you can leave `bun run dev` running while you `bun run test:e2e`. Verified working as of 2026-05-06.

If you ever DO get a port-already-in-use error on `:5174` or `:3002`, that means a previous Playwright run didn't shut down cleanly. Find and kill the stragglers (lsof / ss) — don't change `reuseExistingServer` to `true` to "fix" it; that will silently run the suite against the wrong DB.

Canonical run sequence:
1. Make sure Postgres is up: `docker compose up -d` (containers `helpdesk-postgres` on `:5432` and `helpdesk-pgadmin` on `:5433`).
2. From repo root: `bun run test:e2e` — this resets the test DB, applies migrations, seeds the ADMIN, then boots its own server+client on `:5174` / `:3002` and runs the suite.

Suite size as of 2026-05-06: 27 tests, ~15s wall-clock on a single worker.

Useful scripts:
- `bun run test:e2e` — the canonical command
- `bun run test:e2e:ui` — Playwright UI mode (still resets the DB first)
- `bun run test:e2e:install` — installs Playwright browsers (run once on a new machine)
- `bun --filter @helpdesk/e2e report` — opens the last HTML report
- `cd e2e && bunx playwright test --list` — enumerates tests without booting any server (useful for verifying spec discovery / globs)
