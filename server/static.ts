import express, { type Express, type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
const CLIENT_DIST = path.resolve(import.meta.dirname, "..", "client", "dist");

function requestPathname(req: Request): string {
  const raw = req.originalUrl || req.url || "";
  return raw.split("?")[0] || "/";
}

/** Block dev-only and source-map style paths in production (no /src exposure). */
function blockDevOnlyPaths(req: Request, res: Response, next: NextFunction) {
  const p = req.path.toLowerCase();
  if (
    p.startsWith("/src") ||
    p.startsWith("/node_modules") ||
    p.startsWith("/@") ||
    p.startsWith("/vite") ||
    p.includes("..") ||
    p.endsWith(".map")
  ) {
    return res.status(404).end();
  }
  next();
}

export function serveStatic(app: Express) {
  if (!fs.existsSync(CLIENT_DIST)) {
    throw new Error(
      `Could not find the build directory: ${CLIENT_DIST}. Run: npm run build`,
    );
  }

  app.use(blockDevOnlyPaths);

  app.use(
    express.static(CLIENT_DIST, {
      index: false,
      // Don't 301 "/about" -> "/about/": let the catch-all serve the
      // prerendered client/dist/about/index.html at the clean URL directly.
      redirect: false,
      dotfiles: "deny",
      setHeaders(res, filePath) {
        // Hashed Vite assets can be cached; index.html must revalidate after each deploy.
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  app.use("/{*path}", (req, res, next) => {
    const pathname = requestPathname(req);
    if (pathname.startsWith("/api")) {
      return next();
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    // Serve the prerendered per-route shell (client/dist/<route>/index.html,
    // written by scripts/prerender-seo.ts) when one exists, so crawlers and
    // JS-less AI crawlers get unique title/description/JSON-LD per clean URL.
    // Everything else (e.g. /track/:id) falls back to the SPA shell.
    const clean = pathname.replace(/\/+$/, "");
    if (clean && clean !== "/index.html") {
      const candidate = path.resolve(CLIENT_DIST, `.${clean}`, "index.html");
      if (candidate.startsWith(CLIENT_DIST + path.sep) && fs.existsSync(candidate)) {
        return res.sendFile(candidate);
      }
    }
    res.sendFile(path.resolve(CLIENT_DIST, "index.html"));
  });
}
