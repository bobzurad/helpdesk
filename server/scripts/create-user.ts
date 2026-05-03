import { parseArgs } from "node:util";
import { randomUUID } from "node:crypto";
import { UserRole } from "../prisma/generated/client/enums.ts";
import { auth } from "../src/auth.ts";
import { prisma } from "../src/db.ts";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "AGENT" },
  },
  strict: true,
});

const { email, password, name, role } = values;

if (!email || !password || !name) {
  console.error(
    "Usage: bun run scripts/create-user.ts --email=<email> --password=<password> --name=<name> [--role=ADMIN|AGENT]",
  );
  process.exit(1);
}

if (role !== "ADMIN" && role !== "AGENT") {
  console.error(`Invalid role "${role}" — must be ADMIN or AGENT`);
  process.exit(1);
}

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.error(`User with email ${email} already exists`);
  process.exit(1);
}

const ctx = await auth.$context;
const passwordHash = await ctx.password.hash(password);

const user = await prisma.$transaction(async (tx) => {
  const u = await tx.user.create({
    data: { email, name, role: role as UserRole },
  });
  await tx.account.create({
    data: {
      id: randomUUID(),
      accountId: u.id,
      providerId: "credential",
      userId: u.id,
      password: passwordHash,
    },
  });
  return u;
});

console.log(`Created ${user.role} ${user.email} (${user.id})`);

await prisma.$disconnect();
