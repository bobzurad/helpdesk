/**
 * Test users for the auth e2e suite.
 *
 * - The seeded ADMIN is created by `e2e/scripts/reset-test-db.ts` before Playwright
 *   boots. Its credentials come from `TEST_SEED_ADMIN_EMAIL` /
 *   `TEST_SEED_ADMIN_PASSWORD` in `.env`.
 * - The AGENT user is created in `e2e/global-setup.ts` via the
 *   `bun --filter @helpdesk/server create-user` script (with DATABASE_URL pointed
 *   at TEST_DATABASE_URL). It does not exist in the dev database.
 *
 * Always read these via the helpers below — never hardcode credentials in tests.
 */

const adminEmail = process.env.TEST_SEED_ADMIN_EMAIL;
const adminPassword = process.env.TEST_SEED_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error(
    "TEST_SEED_ADMIN_EMAIL and TEST_SEED_ADMIN_PASSWORD must be set in .env for the e2e suite",
  );
}

export const adminUser = {
  email: adminEmail,
  password: adminPassword,
  name: "Admin",
  role: "ADMIN" as const,
};

/**
 * Stable, hardcoded AGENT credentials. The username is intentionally distinct
 * from anything in the dev seed so collisions between dev and test DBs are
 * obvious if someone ever points e2e at the wrong database.
 */
export const agentUser = {
  email: "agent.e2e@test.local",
  password: "test-agent-password-12345",
  name: "Agent E2E",
  role: "AGENT" as const,
};

/**
 * A made-up address that should never exist in the test DB. Used for negative
 * login tests.
 */
export const nonExistentUser = {
  email: "ghost@test.local",
  password: "doesnotmatter",
};
