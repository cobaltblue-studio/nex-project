import fs from "fs";
import path from "path";
import type { Express, Response } from "express";

const ROOT = path.resolve(import.meta.dirname, "..");
const SVG_DIST = path.join(ROOT, "client", "dist", "favicon.svg");
const SVG_PUBLIC = path.join(ROOT, "client", "public", "favicon.svg");

/** Legacy Replit default favicon is ~217–350 bytes; NEX raster icons are larger. */
export function isLegacyReplitFavicon(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    return fs.statSync(filePath).size < 512;
  } catch {
    return false;
  }
}

function resolveNexFaviconSvg(): string | null {
  if (fs.existsSync(SVG_DIST)) return SVG_DIST;
  if (fs.existsSync(SVG_PUBLIC)) return SVG_PUBLIC;
  return null;
}

function sendNexSvg(res: Response): void {
  const svg = resolveNexFaviconSvg();
  if (!svg) {
    res.status(404).end();
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
  res.type("image/svg+xml");
  res.sendFile(svg, (err) => {
    if (err && !res.headersSent) res.status(404).end();
  });
}

function sendRasterIfValid(res: Response, filePath: string): boolean {
  if (!fs.existsSync(filePath) || isLegacyReplitFavicon(filePath)) return false;
  res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
  res.type("image/png");
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) res.status(404).end();
  });
  return true;
}

/**
 * Always register before static middleware so /favicon.ico never serves Replit blobs.
 */
export function registerNexFaviconRoutes(app: Express): void {
  app.get("/favicon.ico", (_req, res) => {
    const distIco = path.join(ROOT, "client", "dist", "favicon.ico");
    const distPng = path.join(ROOT, "client", "dist", "favicon.png");
    const pubIco = path.join(ROOT, "client", "public", "favicon.ico");
    const pubPng = path.join(ROOT, "client", "public", "favicon.png");
    if (sendRasterIfValid(res, distIco)) return;
    if (sendRasterIfValid(res, distPng)) return;
    if (sendRasterIfValid(res, pubIco)) return;
    if (sendRasterIfValid(res, pubPng)) return;
    sendNexSvg(res);
  });

  app.get("/favicon.png", (_req, res) => {
    const distPng = path.join(ROOT, "client", "dist", "favicon.png");
    const pubPng = path.join(ROOT, "client", "public", "favicon.png");
    if (sendRasterIfValid(res, distPng)) return;
    if (sendRasterIfValid(res, pubPng)) return;
    sendNexSvg(res);
  });

  app.get("/apple-touch-icon.png", (_req, res) => {
    const dist = path.join(ROOT, "client", "dist", "apple-touch-icon.png");
    const pub = path.join(ROOT, "client", "public", "apple-touch-icon.png");
    if (sendRasterIfValid(res, dist)) return;
    if (sendRasterIfValid(res, pub)) return;
    sendNexSvg(res);
  });
}
