#!/usr/bin/env node
/**
 * Ensure PNG/ICO favicons exist for Google Search (prefers /favicon.ico, 48×48).
 * Primary: stdlib writer (no network). Optional: resvg from SVG when available.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const writer = path.join(__dirname, "write-favicon-png.mjs");

const wrote = spawnSync(process.execPath, [writer], { stdio: "inherit" });
if (wrote.status !== 0) {
  process.exit(wrote.status ?? 1);
}

// Optional sharper render from SVG when @resvg/resvg-js is installed locally.
try {
  const { Resvg } = await import("@resvg/resvg-js");
  const fs = await import("node:fs");
  const publicDir = path.join(__dirname, "..", "client", "public");
  const svgPath = path.join(publicDir, "favicon.svg");
  if (fs.existsSync(svgPath)) {
    const svg = fs.readFileSync(svgPath, "utf8");
    for (const [name, size] of [
      ["favicon.png", 48],
      ["favicon-192.png", 192],
    ]) {
      const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
      fs.writeFileSync(path.join(publicDir, name), resvg.render().asPng());
    }
    fs.copyFileSync(path.join(publicDir, "favicon-192.png"), path.join(publicDir, "apple-touch-icon.png"));
    fs.copyFileSync(path.join(publicDir, "favicon.png"), path.join(publicDir, "favicon.ico"));
    console.log("[favicons] upgraded from SVG via @resvg/resvg-js");
  }
} catch {
  // stdlib PNGs are enough for production.
}
