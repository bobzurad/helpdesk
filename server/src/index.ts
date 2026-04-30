import express, { type Request, type Response } from "express";
import cors from "cors";
import { prisma } from "./db.ts";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/db-health", async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    res.json({ status: "ok", db: rows[0]?.ok === 1 ? "connected" : "unknown" });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    });
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
