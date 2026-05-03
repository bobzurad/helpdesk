import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { prisma } from "./db.ts";
import { auth } from "./auth.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/db-health", async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    res.json({ status: "ok", db: rows[0]?.ok === 1 ? "connected" : "unknown" });
  } catch (err) {
    console.error("[db-health] error", err);
    res.status(500).json({ status: "error" });
  }
});

app.get("/api/hello", (_req: Request, res: Response) => {
  res.json({ message: "Hello from Express + Bun" });
});

const server = app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

const shutdown = async (signal: string) => {
  console.log(`[server] received ${signal}, shutting down`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
