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

  const faviconSvg = path.resolve(CLIENT_DIST, "favicon.svg");
  const faviconPng = path.resolve(CLIENT_DIST, "favicon.png");
  const sendIcon =
    (filePath: string, contentType?: string) => (res: Response) => {
      res.setHeader("Cache-Control", "public, max-age=3600");
      if (contentType) res.type(contentType);
      res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) res.status(404).end();
      });
    };

  app.get("/favicon.ico", (_req, res) => {
    const faviconIco = path.resolve(CLIENT_DIST, "favicon.ico");
    if (fs.existsSync(faviconIco)) return sendIcon(faviconIco, "image/png")(res);
    if (fs.existsSync(faviconPng)) return sendIcon(faviconPng, "image/png")(res);
    if (fs.existsSync(faviconSvg)) return sendIcon(faviconSvg, "image/svg+xml")(res);
    res.status(404).end();
  });

  app.get("/favicon.png", (_req, res) => {
    if (fs.existsSync(faviconPng)) return sendIcon(faviconPng, "image/png")(res);
    res.status(404).end();
  });

  const appleTouch = path.resolve(CLIENT_DIST, "apple-touch-icon.png");
  app.get("/apple-touch-icon.png", (_req, res) => {
    if (fs.existsSync(appleTouch)) return sendIcon(appleTouch, "image/png")(res);
    if (fs.existsSync(faviconPng)) return sendIcon(faviconPng, "image/png")(res);
    res.status(404).end();
  });

  app.use(express.static(CLIENT_DIST, { index: false, dotfiles: "deny" }));

  app.use("/{*path}", (req, res, next) => {
    if (requestPathname(req).startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(CLIENT_DIST, "index.html"));
  });
}
