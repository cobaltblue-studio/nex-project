import type { NextFunction, Request, Response } from "express";
import { apiMsg } from "./api-i18n";
import { isAuthenticated } from "./auth";

type AdminChecker = (req: Request) => Promise<boolean>;

/**
 * Anonymous reads needed for the public SPA (chart, creators, battles).
 * Everything else under /api requires a session unless whitelisted for auth bootstrap.
 */
export function createApiAccessControl(isAdmin: AdminChecker) {
  function isAuthBootstrapPath(path: string): boolean {
    return (
      path === "/api/auth/login" ||
      path === "/api/login" ||
      path === "/api/logout" ||
      path === "/api/callback" ||
      path === "/api/auth/google/callback" ||
      path === "/api/auth/callback/google"
    );
  }

  function isPublicCatalogGet(req: Request): boolean {
    if (req.method !== "GET") return false;
    const p = req.path;
    if (
      p === "/api/health" ||
      p === "/api/tracks" ||
      p === "/api/tracks/new" ||
      p === "/api/tracks/rising" ||
      p === "/api/community/posts" ||
      p === "/api/creators" ||
      p === "/api/creators/directory" ||
      p === "/api/stats/today" ||
      p === "/api/battles/recent" ||
      p === "/api/battles/genres"
    ) {
      return true;
    }
    if (/^\/api\/battles\/\d+$/.test(p)) return true;
    if (/^\/api\/profiles\/\d+$/.test(p)) return true;
    if (/^\/api\/profiles\/by-username\//.test(p)) return true;
    if (/^\/api\/profiles\/\d+\/tracks$/.test(p)) return true;
    if (/^\/api\/tracks\/\d+$/.test(p)) return true;
    if (/^\/api\/tracks\/\d+\/comments$/.test(p)) return true;
    if (/^\/api\/community\/posts\/\d+$/.test(p)) return true;
    if (/^\/api\/community\/posts\/\d+\/comments$/.test(p)) return true;
    if (p === "/api/suno/resolve" || p === "/api/soundcloud/resolve") return true;
    return false;
  }

  return function apiAccessControl(req: Request, res: Response, next: NextFunction): void {
    if (!req.path.startsWith("/api")) {
      next();
      return;
    }

    if (isAuthBootstrapPath(req.path)) {
      next();
      return;
    }

    if (isPublicCatalogGet(req)) {
      next();
      return;
    }

    if (req.method === "POST" && req.path === "/api/boost/increment-impression") {
      next();
      return;
    }

    if (req.method === "POST" && req.path === "/api/analytics/event") {
      next();
      return;
    }

    if (req.path.startsWith("/api/admin")) {
      isAuthenticated(req, res, () => {
        void (async () => {
          if (!(await isAdmin(req))) {
            res.status(403).json({ message: apiMsg("관리자 권한이 필요합니다", "Admin access required") });
            return;
          }
          next();
        })();
      });
      return;
    }

    isAuthenticated(req, res, next);
  };
}
