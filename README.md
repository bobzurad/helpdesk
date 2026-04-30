# Helpdesk

Full-stack monorepo: Express + React + TypeScript, powered by Bun. This project was created while going through the following course: https://codewithmosh.com/p/claude-code

## Layout

```
helpdesk/
├── client/   # React + Vite + TypeScript
└── server/   # Express + TypeScript (Bun runtime)
```

## Prequisites

This project requires [bun](https://bun.com/package-manager) to be installed.

## Setup

```bash
bun install
```

### Data Persistence

For data persistence, this project uses Docker containers for PostgreSQL and pgAdmin. To start the docker containers, run: `docker compose up`

* PostgreSQL is available at localhost:5432
* pgAdmin is accessible at http://localhost:5433
  * create a connection to the server at `postgres:5432`
* see `.env` for credentials

## Develop

Run both apps in parallel:

```bash
bun run dev
```

- Server: <http://localhost:3001>
- Client: <http://localhost:5173> (proxies `/api/*` to the server)

Or run them individually:

```bash
bun --filter @helpdesk/server dev
bun --filter @helpdesk/client dev
```

## Other scripts

```bash
bun run build       # build both packages
bun run typecheck   # typecheck both packages
```
