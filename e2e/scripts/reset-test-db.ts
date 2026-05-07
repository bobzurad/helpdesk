import { SQL } from "bun";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(__dirname, "../../server");

const testDbUrl = process.env.TEST_DATABASE_URL;
if (!testDbUrl) {
  console.error(
    "[e2e] TEST_DATABASE_URL is not set. Add it to .env (see .env.example).",
  );
  process.exit(1);
}

const dbName = new URL(testDbUrl).pathname.replace(/^\//, "");
if (!/test/i.test(dbName)) {
  console.error(
    `[e2e] refusing to reset DB — TEST_DATABASE_URL must point at a database whose name contains "test" (got: ${dbName})`,
  );
  process.exit(1);
}

async function ensureDatabaseExists() {
  const adminUrl = new URL(testDbUrl!);
  adminUrl.pathname = "/postgres";
  const admin = new SQL(adminUrl.toString());
  try {
    const rows = await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (rows.length === 0) {
      console.log(`[e2e] creating database "${dbName}"`);
      await admin.unsafe(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    }
  } finally {
    await admin.end();
  }
}

async function dropPublicSchema() {
  const sql = new SQL(testDbUrl!);
  try {
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await sql.unsafe("CREATE SCHEMA public");
    await sql.unsafe("GRANT ALL ON SCHEMA public TO public");
  } finally {
    await sql.end();
  }
}

console.log(`[e2e] resetting test database "${dbName}"`);

await ensureDatabaseExists();
await dropPublicSchema();

console.log("[e2e] applying migrations via prisma migrate deploy");
const migrate = spawnSync("bun", ["x", "prisma", "migrate", "deploy"], {
  cwd: serverDir,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: testDbUrl },
});

if (migrate.status !== 0) {
  console.error("[e2e] prisma migrate deploy failed");
  process.exit(migrate.status ?? 1);
}

const seedEmail = process.env.TEST_SEED_ADMIN_EMAIL;
const seedPassword = process.env.TEST_SEED_ADMIN_PASSWORD;
if (!seedEmail || !seedPassword) {
  console.error(
    "[e2e] TEST_SEED_ADMIN_EMAIL and TEST_SEED_ADMIN_PASSWORD must be set in .env",
  );
  process.exit(1);
}

console.log(`[e2e] seeding admin ${seedEmail}`);
const seed = spawnSync("bun", ["prisma/seed.ts"], {
  cwd: serverDir,
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testDbUrl,
    SEED_ADMIN_EMAIL: seedEmail,
    SEED_ADMIN_PASSWORD: seedPassword,
  },
});

if (seed.status !== 0) {
  console.error("[e2e] seed failed");
  process.exit(seed.status ?? 1);
}

console.log("[e2e] test database is ready");
