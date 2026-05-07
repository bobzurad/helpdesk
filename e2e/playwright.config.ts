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

const SERVER_URL = process.env.E2E_SERVER_URL ?? "http://localhost:3001";
const CLIENT_URL = process.env.E2E_CLIENT_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html"]] : "html",

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
    },
  ],
});
