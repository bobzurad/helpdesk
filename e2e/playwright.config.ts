import { defineConfig, devices } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

loadEnv({ path: resolve(repoRoot, ".env") });

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL must be set in .env (see .env.example). Playwright refuses to run against the dev database.",
  );
}

// E2E ports are deliberately distinct from the dev defaults (server :3001, client :5173)
// so a running `bun run dev` doesn't collide with the Playwright-managed servers.
const SERVER_URL = process.env.E2E_SERVER_URL ?? "http://localhost:5174";
const CLIENT_URL = process.env.E2E_CLIENT_URL ?? "http://localhost:3002";
const SERVER_PORT = new URL(SERVER_URL).port;
const CLIENT_PORT = new URL(CLIENT_URL).port;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html"]] : "html",
  // Runs once after webServer is up, before any tests. Creates the AGENT
  // user used by role-based tests. The test DB is already reset + seeded
  // with the ADMIN by `bun run db:reset` (invoked from the `test` npm script).
  globalSetup: resolve(__dirname, "global-setup.ts"),

  use: {
    baseURL: CLIENT_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    {
      command: "bun --filter @helpdesk/server dev",
      cwd: repoRoot,
      url: `${SERVER_URL}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        DATABASE_URL: TEST_DATABASE_URL,
        PORT: SERVER_PORT,
        BETTER_AUTH_URL: SERVER_URL,
        CORS_ORIGINS: CLIENT_URL,
        BETTER_AUTH_TRUSTED_ORIGINS: CLIENT_URL,
      },
    },
    {
      command: "bun --filter @helpdesk/client dev",
      cwd: repoRoot,
      url: CLIENT_URL,
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        VITE_DEV_PORT: CLIENT_PORT,
        VITE_API_PROXY_TARGET: SERVER_URL,
      },
    },
  ],
});
