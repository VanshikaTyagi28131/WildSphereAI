import type { RequestHandler } from "express";

const windows = new Map<string, { start: number; count: number }>();

export function requestLimit(
  namespace: string,
  maxRequests: number,
  windowMs = 60_000,
): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${namespace}:${ip}`;
    const current = windows.get(key);
    if (!current || now - current.start >= windowMs) {
      if (windows.size > 1_000) {
        for (const [storedKey, window] of windows) {
          if (now - window.start >= windowMs) windows.delete(storedKey);
        }
      }
      windows.set(key, { start: now, count: 1 });
      next();
      return;
    }
    if (current.count >= maxRequests) {
      res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
      return;
    }
    current.count += 1;
    next();
  };
}
