import type { NextFunction, Request, Response } from "express";

const DEFAULT_CANONICAL = "https://nexmusic.ai";

/** Production public site origin (no trailing slash). */
export function getCanonicalOrigin(): string | null {
  const raw = (
    process.env.PUBLIC_APP_URL ||
    process.env.CANONICAL_ORIGIN ||
    process.env.VITE_PUBLIC_SITE_URL ||
    ""
  ).trim();
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") return DEFAULT_CANONICAL;
  return null;
}

/**
 * 301 redirect Railway default host (and optional www) to the canonical domain.
 * Skips /api so OAuth callbacks on railway still work until DNS/users migrate.
 */
export function canonicalHostRedirect(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== "production") {
    next();
    return;
  }
  if (process.env.DISABLE_CANONICAL_REDIRECT === "1") {
    next();
    return;
  }

  const canonical = getCanonicalOrigin();
  if (!canonical) {
    next();
    return;
  }

  try {
    const targetBase = new URL(canonical);
    const host = (req.get("host") || "").split(":")[0].toLowerCase();
    const canonHost = targetBase.hostname.toLowerCase();

    const isRailwayDefault = host.endsWith(".up.railway.app");
    const isWwwOnApex =
      canonHost === "nexmusic.ai" && host === "www.nexmusic.ai";

    if (!isRailwayDefault && !isWwwOnApex) {
      next();
      return;
    }

    const path = req.originalUrl || req.url || "/";
    const location = `${targetBase.origin}${path}`;
    res.redirect(301, location);
  } catch {
    next();
  }
}
