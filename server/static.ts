import express, { type Express, type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

const CLIENT_DIST = path.resolve(import.meta.dirname, "..", "client", "dist");

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

  const faviconSvg = path.resolve(CLIENT_DIST, "favicon.svg");
  const faviconPng = path.resolve(CLIENT_DIST, "favicon.png");
  app.get("/favicon.ico", (_req, res) => {
    if (fs.existsSync(faviconPng)) {
      return res.sendFile(faviconPng);
    }
    if (fs.existsSync(faviconSvg)) {
      res.type("image/svg+xml");
      return res.sendFile(faviconSvg);
    }
    return res.status(404).end();
  });

  app.use(express.static(CLIENT_DIST, { index: false, dotfiles: "deny" }));

  app.use("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(CLIENT_DIST, "index.html"));
  });
}
