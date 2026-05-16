# Helpdesk

Full-stack monorepo: Express + React + TypeScript, powered by Bun. This project was created while going through the following course: https://codewithmosh.com/p/claude-code

## Layout

```
helpdesk/
├── client/   # React + Vite + TypeScript
├── e2e/      # Playwright End to End tests
└── server/   # Express + TypeScript (Bun runtime)
```

## Prequisites

This project requires the following to be installed:
* Docker
* [bun](https://bun.com/package-manager) 

### Data Persistence

For data persistence, this project uses Docker containers for PostgreSQL and pgAdmin. To start the docker containers, run: `docker compose up`

* PostgreSQL is available at localhost:5432
* pgAdmin is accessible at http://localhost:5433
  * create a connection to the server at `postgres:5432`
* see `.env` for credentials

Tip: If running Linux, to access PostgreSQL from pgAdmin, connect to the IP address listed when inspecting the postgresql container `docker inspect <container-name>`

## Setup

To setup the project for first time use, run the following commands (after starting the docker containers):

```bash
bun install
bun --filter @helpdesk/server db:generate
bun --filter @helpdesk/server db:migrate
bun --filter @helpdesk/server create-user --email admin@example.com --password=password123 --name="Admin Adam" --role=ADMIN
bunx playwright install chromium
```

## Develop

To run the client and server apps in parallel:

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

## End to End Tests

This project uses [Playwright](https://playwright.dev/) for end to end testing

Test scripts can be run with the following commands:

```bash
bun run test:e2e
bun run test:e2e:ui
```

## Creating Users

To create users, run the following script:
```bash
bun --filter @helpdesk/server create-user --email=agent@example.com --password=password123 --name="Agent Smith"                                  
```        

--role defaults to AGENT; pass --role=ADMIN to override. Fails if the email is already in use.        
