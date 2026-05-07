import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { prisma } from "./db.ts";
import { auth } from "./auth.ts";
import { requireAdmin } from "./middleware/requireAdmin.ts";

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
if (process.env.NODE_ENV === "production") {
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );
}

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/db-health", async (_req: Request, res: Response) => {
  const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
  res.json({ status: "ok", db: rows[0]?.ok === 1 ? "connected" : "unknown" });
});

app.get("/api/hello", (_req: Request, res: Response) => {
  res.json({ message: "Hello from Express + Bun" });
});

app.get(
  "/api/users",
  requireAdmin,
  async (_req: Request, res: Response) => {
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
  },
);

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(`[${req.method} ${req.path}] error`, err);
  res.status(500).json({ error: "internal" });
};
app.use(errorHandler);

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
