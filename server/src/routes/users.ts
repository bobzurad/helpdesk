import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db.ts";
import { auth } from "../auth.ts";
import { requireAdmin } from "../middleware/requireAdmin.ts";

export const usersRouter = Router();

const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

usersRouter.get("/", requireAdmin, async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

usersRouter.post("/", requireAdmin, async (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    res.status(400).json({ error: message });
    return;
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "A user with that email already exists" });
    return;
  }

  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(password);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { email, name, role: "AGENT" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
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

  res.status(201).json({ user });
});
