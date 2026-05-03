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
└── server/   # Express + TypeScript (Bun runtime)
```

The repo is a Bun workspace monorepo — install once at the root with `bun install`.

## Common commands

Run from the repo root:

```bash
bun install            # install all workspace deps
bun run dev            # both apps in parallel (bun --filter '*' dev)
bun run build          # build both packages
bun run typecheck      # tsc --noEmit across both packages
```

Per-workspace:

```bash
bun --filter @helpdesk/server dev
bun --filter @helpdesk/client dev
```

Dev URLs: server `http://localhost:3001`, client `http://localhost:5173`. The Vite dev server proxies `/api/*` to the Express server (see `client/vite.config.ts`).

## Conventions

- Server entrypoint runs under `bun --hot` for hot reload — no `nodemon`/`ts-node`.
- Server uses native ESM (`"type": "module"`); use `import` syntax, not `require`.
- Client uses `tsconfig` project references (`tsconfig.app.json` for `src/`, `tsconfig.node.json` for `vite.config.ts`).
- API routes are prefixed with `/api/` so the Vite proxy matches them.

## Authentication

Database-backed sessions via [Better Auth](https://www.better-auth.com/) with the Prisma adapter (PostgreSQL). No JWTs — session cookies are stored in the `session` table.

### Server (`server/src/auth.ts`, `server/src/index.ts`)

- Email + password only (`emailAndPassword.enabled: true`). **Sign-up is disabled** (`disableSignUp: true`) — new users are created via the seed script or by an admin, never via a public form.
- Custom user field `role` (`UserRole` enum: `ADMIN | AGENT`, default `AGENT`, `input: false` so it can't be set from the client).
- Mounted at `/api/auth/*splat` (Express 5 catch-all syntax — note `*splat`, not `*`).
- **Middleware order matters**: `app.all("/api/auth/*splat", toNodeHandler(auth))` MUST be registered **before** `app.use(express.json())`. Better Auth needs the raw request body; if `express.json()` runs first, auth requests break silently.
- CORS is `origin: true, credentials: true` so the cookie session works across the Vite dev origin.
- Trusted origins are set in `auth.ts` (`trustedOrigins: ["http://localhost:5173"]`) — the `BETTER_AUTH_TRUSTED_ORIGINS` env var also exists in `.env.example` but is not currently read by `auth.ts`.

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
