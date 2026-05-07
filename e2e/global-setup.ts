/**
 * Playwright global setup.
 *
 * Runs once after `webServer` is up but before any tests execute. The test
 * database has already been reset and re-seeded with the ADMIN by
 * `e2e/scripts/reset-test-db.ts` (invoked from the `test` npm script before
 * `playwright test` starts).
 *
 * Responsibilities:
 *   1. Create a stable AGENT-role user in the test database so role-based
 *      tests (RequireAdmin, NavBar visibility, etc.) have something to work
 *      with. We do this here rather than in the seed script so the seeded set
 *      stays minimal (one admin) and matches what the seed script promises.
 *
 * The AGENT user is created via the existing `create-user` script (same code
 * path the project uses for real user creation), spawned with `DATABASE_URL`
 * overridden to TEST_DATABASE_URL so it writes to the test DB.
 *
 * Idempotency: the script exits non-zero if the user already exists. We treat
 * "user already exists" output as success — that just means the previous
 * Playwright run didn't reset the DB (e.g. you ran `playwright test` directly,
 * skipping `db:reset`). In normal `bun run test:e2e` flow the DB is fresh
 * every time and the user is always created cleanly.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FullConfig } from "@playwright/test";
import { agentUser } from "./fixtures/users";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

export default async function globalSetup(_config: FullConfig) {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) {
    throw new Error(
      "[e2e/global-setup] TEST_DATABASE_URL must be set in .env",
    );
  }

  console.log(`[e2e/global-setup] creating AGENT user ${agentUser.email}`);

  const result = spawnSync(
    "bun",
    [
      "--filter",
      "@helpdesk/server",
      "create-user",
      `--email=${agentUser.email}`,
      `--password=${agentUser.password}`,
      `--name=${agentUser.name}`,
      `--role=${agentUser.role}`,
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: testDbUrl },
      encoding: "utf8",
    },
  );

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  if (result.status === 0) {
    console.log(`[e2e/global-setup] AGENT user created`);
    return;
  }

  // Tolerate "already exists" so a developer who ran `playwright test`
  // directly (skipping db:reset) doesn't get a confusing failure.
  if (/already exists/i.test(output)) {
    console.log(
      `[e2e/global-setup] AGENT user already exists in test DB — continuing`,
    );
    return;
  }

  console.error(`[e2e/global-setup] create-user failed:\n${output}`);
  throw new Error(
    `Failed to create AGENT test user (exit ${result.status ?? "unknown"})`,
  );
}
