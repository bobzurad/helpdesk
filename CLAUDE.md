# Helpdesk — Project Guide for Claude

AI-powered ticket management system. See `project-scope.md`, `tech-stack.md`, and `implementation-plan.md` for product context and roadmap.

## Stack

- **Runtime / package manager**: Bun (workspaces)
- **Server**: Express 5 + TypeScript on Bun (`server/`)
- **Client**: React 19 + Vite 7 + TypeScript (`client/`)
- **Database**: PostgreSQL (planned)
- **ORM**: Prisma (planned)
- **AI**: Claude API (planned, for classification / summaries / suggested replies)

## Layout

```
helpdesk/
├── client/   # React + Vite + TypeScript
├── server/   # Express + TypeScript (Bun runtime)
└── e2e/      # Playwright end-to-end tests
```

The repo is a Bun workspace monorepo — install once at the root with `bun install`.

## Common commands

Run from the repo root:

```bash
bun install            # install all workspace deps
bun run dev            # both apps in parallel (bun --filter '*' dev)
bun run build          # build both packages
bun run typecheck      # tsc --noEmit across both packages
bun run test           # run client component tests (vitest)
bun run test:e2e       # run Playwright e2e tests (resets the test DB first)
```

Per-workspace:

```bash
bun --filter @helpdesk/server dev
bun --filter @helpdesk/client dev
bun --filter @helpdesk/client test         # one-shot vitest run
bun --filter @helpdesk/client test:watch   # vitest watch mode
bun --filter @helpdesk/e2e test
```

Dev URLs: server `http://localhost:3001`, client `http://localhost:5173`. The Vite dev server proxies `/api/*` to the Express server (see `client/vite.config.ts`).

## Conventions

- Server entrypoint runs under `bun --hot` for hot reload — no `nodemon`/`ts-node`.
- Server uses native ESM (`"type": "module"`); use `import` syntax, not `require`.
- Client uses `tsconfig` project references (`tsconfig.app.json` for `src/`, `tsconfig.node.json` for `vite.config.ts`).
- API routes are prefixed with `/api/` so the Vite proxy matches them.
- **Client data fetching**: use `axios` for HTTP and `@tanstack/react-query` (`useQuery` / `useMutation`) for server state — don't introduce raw `fetch` in `client/src/`. The `QueryClientProvider` is wired in `client/src/main.tsx`. Pass `withCredentials: true` on axios calls that hit authenticated routes so the Better Auth session cookie is sent.

## Authentication

Database-backed sessions via [Better Auth](https://www.better-auth.com/) with the Prisma adapter (PostgreSQL). No JWTs — session cookies are stored in the `session` table.

### Server (`server/src/auth.ts`, `server/src/index.ts`)

- Email + password only (`emailAndPassword.enabled: true`). **Sign-up is disabled** (`disableSignUp: true`) — new users are created via the seed script or by an admin, never via a public form.
- Custom user field `role` (`UserRole` enum: `ADMIN | AGENT`, default `AGENT`, `input: false` so it can't be set from the client).
- Mounted at `/api/auth/*splat` (Express 5 catch-all syntax — note `*splat`, not `*`).
- **Middleware order matters**: `app.all("/api/auth/*splat", toNodeHandler(auth))` MUST be registered **before** `app.use(express.json())`. Better Auth needs the raw request body; if `express.json()` runs first, auth requests break silently.
- CORS uses an explicit allowlist driven by `CORS_ORIGINS` (comma-separated, defaults to `http://localhost:5173`) with `credentials: true` so the session cookie works across the Vite dev origin. Don't switch this back to `origin: true` — that reflects any origin and breaks the CSRF posture for non-Better-Auth routes.
- Trusted origins are read from `BETTER_AUTH_TRUSTED_ORIGINS` (comma-separated, defaults to `http://localhost:5173`).
- The Express app also mounts `helmet()` for baseline security headers and, **only when `NODE_ENV === "production"`**, a global `express-rate-limit` (120 req/min/IP) on non-auth routes. The limiter is off in dev and test so e2e suites and local iteration aren't throttled. Better Auth handles its own rate limiting on `/api/auth/*` (also production-gated by Better Auth).

### Client (`client/src/lib/auth-client.ts`)

- `createAuthClient()` from `better-auth/react`; exports `signIn`, `signOut`, `useSession`.
- `LoginPage` uses `signIn.email({ email, password })` then redirects to `/`.
- Protected routes are wrapped with `<RequireAuth>` (in `client/src/components/RequireAuth.tsx`), which calls `useSession()` and redirects to `/login` when there's no session.

### Schema (`server/prisma/schema.prisma`)

Standard Better Auth tables — `User`, `Session`, `Account`, `Verification` — plus the `role` column on `User`. Prisma client output is `server/prisma/generated/client/` (re-generate with `bun --filter @helpdesk/server db:generate`).

### Local dev login

The only credentials that work locally are the seeded admin:

```bash
# from server/, after `docker compose up -d` for Postgres + `bun --filter @helpdesk/server db:migrate`
# Set SEED_ADMIN_PASSWORD to a strong (≥12 char) value first — the seed refuses
# weak/placeholder passwords (e.g. "password…", "CHANGE_ME…").
bun --filter @helpdesk/server prisma db seed
# email/password come from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env
```

The seed (`server/prisma/seed.ts`) uses `auth.$context.password.hash()` to hash the password and writes both a `User` and an `Account` row (with `providerId: "credential"`) inside a transaction. To add additional users, use the create-user script (below) — don't ship a public sign-up form unless the project intent changes.

### Creating additional users

Use the create-user script (`server/scripts/create-user.ts`):

```bash
bun --filter @helpdesk/server create-user \
  --email=agent@example.com --password=changeme --name="Agent Smith" --role=AGENT
```

`--role` defaults to `AGENT` and accepts `ADMIN | AGENT`. The script fails if the email already exists, hashes the password via `auth.$context.password.hash()`, and writes the `User` + credential `Account` rows in a transaction (same pattern as the seed).

## Component tests (Vitest + React Testing Library)

Client-side unit / component tests live alongside the code they cover in `client/src/**` as `*.test.tsx`. They run in jsdom via Vitest and never hit the network or a real server.

### Configuration

- `client/vitest.config.ts` `mergeConfig`s the existing `vite.config.ts` (so the `@/` alias resolves the same way the app does), then sets `environment: "jsdom"`, `setupFiles: ["./src/test/setup.ts"]`, and `css: true`.
- `client/src/test/setup.ts` imports `@testing-library/jest-dom/vitest` (matchers like `toBeInTheDocument`) and runs `cleanup()` after each test.
- `client/tsconfig.node.json` includes `vitest.config.ts` so the config file is type-checked under the Node project.
- Test runner globals are **off** (`globals: false`) — import `describe`, `it`, `expect`, `vi` from `vitest` explicitly.

### Running tests

```bash
bun run test                              # one-shot run from repo root
bun run test:watch                        # watch mode
bun --filter @helpdesk/client test        # same as above, scoped explicitly
```

`bun run typecheck` covers test files since they live under `client/src/`, so type errors in tests fail the workspace typecheck.

### Conventions

- **Mock the network at the axios layer**, not at `fetch`. The pattern (see `client/src/pages/UsersPage.test.tsx`) is `vi.mock("axios", () => ({ default: { get: vi.fn() } }))` plus `vi.mocked(axios.get)`. Don't reach for MSW unless a test genuinely needs request introspection beyond what `mockResolvedValueOnce` / `mockRejectedValueOnce` give you.
- **Wrap each render in a fresh `QueryClient`** with `retry: false` — otherwise rejected-fetch tests pay 3× the default retry delay before the error renders. There's no shared `renderWithClient` helper yet; copy the inline one from `UsersPage.test.tsx` if you need it in a new test file (extract to `src/test/` only once a third file needs it).
- **Route mocks by URL** when a component fires multiple parallel queries (see `StatusPage.test.tsx`'s `routeMock` helper). `mockResolvedValueOnce` chains are order-dependent and brittle when component declaration order changes.
- **Prefer role-based and text queries** (`getByRole("heading")`, `findByText(...)`) over test IDs. The shadcn primitives expose `data-slot` attributes (e.g. `data-slot="skeleton"`, `data-slot="card"`); use those with `closest()` or `querySelectorAll` when you need to scope assertions to a card or assert that skeletons rendered.
- **Use `findBy*` for anything that depends on a query resolving** — `useQuery`'s state transitions are async even when the mock resolves synchronously. `getBy*` will throw on first render.

### Adding a new test

1. Create `Foo.test.tsx` next to `Foo.tsx` in `client/src/`.
2. `vi.mock("axios", () => ({ default: { get: vi.fn() /* + post, etc. as needed */ } }))` at the top of the file.
3. Render through a `QueryClientProvider` with `retry: false`.
4. Assert loading state (skeletons / spinners), success state (rendered data), error state (alert), and the request shape (`expect(mockedGet).toHaveBeenCalledWith(...)`).

## End-to-end tests (Playwright)

E2E tests live in the `e2e/` workspace and run against an isolated Postgres database (`helpdesk_test`) so they never touch dev data.

### Configuration

- `e2e/playwright.config.ts` defines two `webServer` entries that boot the real server and client (`bun --filter` against the existing dev scripts). The server entry overrides `DATABASE_URL` with `TEST_DATABASE_URL` from `.env`, plus `CORS_ORIGINS` / `BETTER_AUTH_TRUSTED_ORIGINS` / `PORT` so cookies and routing work against the test client URL.
- `reuseExistingServer: false` — Playwright always boots fresh server processes pointing at the test DB, so it's safe to have `bun run dev` running alongside.
- `workers: 1`, `fullyParallel: false` — single-worker by default since tests share one database. Tweak per-suite once tests exist.
- **E2E ports are distinct from dev** so the two can run side-by-side: e2e client is `http://localhost:3002` (dev: `:5173`) and e2e server is `http://localhost:5174` (dev: `:3001`). Override with `E2E_CLIENT_URL` / `E2E_SERVER_URL` if needed.
- The client's Vite config (`client/vite.config.ts`) reads `VITE_DEV_PORT` and `VITE_API_PROXY_TARGET` from env (passed by the Playwright config), with `strictPort` enabled when those are set. The server reads `PORT` from env (defaults to `3001` when unset).

### Test database lifecycle

The test DB URL must contain `test` in its name — `e2e/scripts/reset-test-db.ts` refuses otherwise. The reset script:

1. Connects to the postgres `postgres` admin DB via `Bun.SQL` and creates `helpdesk_test` if it doesn't exist.
2. Connects to `helpdesk_test` and runs `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` to wipe data.
3. Runs `prisma migrate deploy` (not `migrate reset` — that's blocked by Prisma's AI safeguard).
4. Runs `server/prisma/seed.ts` directly with `DATABASE_URL` and `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` overridden by the `TEST_*` values from `.env`. The seed validates password strength, so the test password must be ≥12 chars and not start with `password`/`change_me`.

`bun run test:e2e` runs the reset script before invoking `playwright test`, so every run starts from a clean schema with the seeded admin. To reset by hand: `bun --filter @helpdesk/e2e db:reset`.

The seeded admin's credentials live in `.env` as `TEST_SEED_ADMIN_EMAIL` / `TEST_SEED_ADMIN_PASSWORD` (defaults: `admin@test.local` / `test-admin-password-12345`). Tests should read these from env rather than hardcoding.

### First-time setup

```bash
bun install
bun run test:e2e:install   # downloads Chromium + system deps (one-time)
docker compose up -d       # postgres must be running
bun run test:e2e
```

For additional test users beyond the seeded admin, call the create-user script or hit the Better Auth API from a Playwright fixture — don't reuse `prisma db seed`, which only creates the admin.

### Writing tests — delegate to `playwright-e2e-author`

When the user asks to **write, expand, or refactor Playwright tests** (new specs, page objects, fixtures, storage-state auth, coverage for a specific flow), delegate to the **`playwright-e2e-author`** agent via the Agent tool. It's project-scoped (lives in `.claude/agents/playwright-e2e-author.md`), maintains its own memory of test patterns adopted in this repo, and knows the conventions above (Bun, ports, Better Auth, seeded admin).

Don't delegate for: bare-metal Playwright config tweaks the user is driving line-by-line, debugging a single failing assertion the user has already isolated, or non-test work that merely touches the `e2e/` directory. Inline those.

When delegating, brief the agent with: which user flow(s) to cover, whether the flow needs an authenticated session, and any seed data assumptions. The agent will use the test DB and seeded admin set up above unless told otherwise.

## Fetching up-to-date docs (Context7)

Use the **Context7 MCP** to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service — even well-known ones (React, Express, Vite, Prisma, Tailwind, Bun, etc.). Training data may be stale; prefer Context7 over web search for library docs.

Use Context7 for: API syntax, configuration, version migration, library-specific debugging, setup instructions, CLI usage.

Do **not** use it for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

### Workflow

1. Call `resolve-library-id` with the library name and the user's question — unless the user already provided an exact `/org/project` ID.
2. Pick the best match by: name match, description relevance, snippet count, source reputation (prefer High/Medium), benchmark score. Use a version-specific ID (`/org/project/version`) if the user mentioned a version.
3. Call `query-docs` with the chosen ID and the user's full question (not single keywords).
4. If the answer is thin, retry once with `researchMode: true` (deeper, more costly research).
5. Cap each tool at 3 calls per question.

### Libraries likely to come up in this repo

- Bun → `/oven-sh/bun`
- Express → `/expressjs/express` (versions: `v5.1.0`, `v5.2.0`, `4_21_2`)
- Vite → `/vitejs/vite` (versions: `v7.0.0`, `v8.0.0`, ...)
- React, Prisma, Tailwind CSS, Anthropic SDK — resolve as needed.

Confirm IDs with `resolve-library-id` rather than hardcoding from this list, since library IDs can change.
