import fs from "fs";
import path from "path";
import type { Express, Response } from "express";

const ROOT = path.resolve(import.meta.dirname, "..");
const SVG_DIST = path.join(ROOT, "client", "dist", "favicon.svg");
const SVG_PUBLIC = path.join(ROOT, "client", "public", "favicon.svg");

/** Inline fallback — header Disc3 vinyl mark (never Replit). */
const NEX_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none"><rect width="512" height="512" rx="96" fill="#050505"/><circle cx="256" cy="256" r="168" stroke="#00f0ff" stroke-width="36"/><circle cx="256" cy="256" r="52" stroke="#00f0ff" stroke-width="28"/><circle cx="256" cy="256" r="20" fill="#00f0ff"/></svg>`;

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngIsNexFavicon(buf: Buffer): boolean {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) return false;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return false;
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return w === 48 && h === 48;
}

/** Replit default favicon (~217–350 bytes) or any non-NEX raster. */
export function isLegacyReplitFavicon(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    const buf = fs.readFileSync(filePath);
    return !pngIsNexFavicon(buf);
  } catch {
    return false;
  }
}

function readNexFaviconSvg(): string {
  for (const p of [SVG_DIST, SVG_PUBLIC]) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p, "utf8");
      } catch {
        /* try next */
      }
    }
  }
  return NEX_FAVICON_SVG;
}

function sendNexSvg(res: Response): void {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.type("image/svg+xml");
  res.send(readNexFaviconSvg());
}

function sendNexPngIfValid(res: Response, filePath: string): boolean {
  if (!fs.existsSync(filePath) || isLegacyReplitFavicon(filePath)) return false;
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.type("image/png");
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) sendNexSvg(res);
  });
  return true;
}

/**
 * Register before static — /favicon.ico always NEX (never Replit from dist).
 */
export function registerNexFaviconRoutes(app: Express): void {
  app.get("/favicon.ico", (_req, res) => {
    sendNexSvg(res);
  });

  app.get("/favicon.png", (_req, res) => {
    const distPng = path.join(ROOT, "client", "dist", "favicon.png");
    const pubPng = path.join(ROOT, "client", "public", "favicon.png");
    if (sendNexPngIfValid(res, distPng)) return;
    if (sendNexPngIfValid(res, pubPng)) return;
    sendNexSvg(res);
  });

  app.get("/apple-touch-icon.png", (_req, res) => {
    const dist = path.join(ROOT, "client", "dist", "apple-touch-icon.png");
    const pub = path.join(ROOT, "client", "public", "apple-touch-icon.png");
    if (sendNexPngIfValid(res, dist)) return;
    if (sendNexPngIfValid(res, pub)) return;
    sendNexSvg(res);
  });
}
