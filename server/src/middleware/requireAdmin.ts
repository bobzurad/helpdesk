import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.ts";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) {
    res.status(401).json({ error: "unauthenticated" });
    return;
  }
  if (session.user.role !== "ADMIN") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}
