import { randomUUID } from "node:crypto";
import { UserRole } from "./generated/client/enums.ts";
import { auth } from "../src/auth.ts";
import { prisma } from "../src/db.ts";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error(
    "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set (see .env.example)",
  );
}

if (password.length < 12 || /^(password|change[_-]?me)/i.test(password)) {
  throw new Error(
    "SEED_ADMIN_PASSWORD is too weak — use at least 12 characters and avoid common placeholders",
  );
}

const existing = await prisma.user.findUnique({ where: { email } });

if (existing) {
  if (existing.role !== UserRole.ADMIN) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: UserRole.ADMIN },
    });
    console.log(`[seed] promoted ${email} to ADMIN`);
  } else {
    console.log(`[seed] admin ${email} already exists`);
  }
} else {
  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(password);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: "Admin", role: UserRole.ADMIN },
    });
    await tx.account.create({
      data: {
        id: randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
      },
    });
  });
  console.log(`[seed] created admin ${email}`);
}

await prisma.$disconnect();
