#!/usr/bin/env node
/**
 * Build favicon.png / apple-touch-icon.png from favicon.svg (Google prefers PNG).
 * Uses @resvg/resvg-js via npx when available; skips quietly if offline.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "client", "public");
const svgPath = path.join(publicDir, "favicon.svg");

if (!fs.existsSync(svgPath)) {
  console.warn("[favicons] missing", svgPath);
  process.exit(0);
}

function resvgTo(svg, out, width, height) {
  const script = `
    import { readFileSync, writeFileSync } from 'fs';
    import { Resvg } from '@resvg/resvg-js';
    const svg = readFileSync(${JSON.stringify(svg)}, 'utf8');
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: ${width} } });
    const png = resvg.render().asPng();
    writeFileSync(${JSON.stringify(out)}, png);
  `;
  execFileSync(
    "npx",
    ["--yes", "-p", "@resvg/resvg-js", "node", "--input-type=module", "-e", script],
    { stdio: "inherit", cwd: path.join(__dirname, "..") },
  );
}

try {
  resvgTo(svgPath, path.join(publicDir, "favicon.png"), 48, 48);
  resvgTo(svgPath, path.join(publicDir, "favicon-192.png"), 192, 192);
  fs.copyFileSync(path.join(publicDir, "favicon-192.png"), path.join(publicDir, "apple-touch-icon.png"));
  fs.copyFileSync(path.join(publicDir, "favicon.png"), path.join(publicDir, "favicon.ico"));
  console.log("[favicons] wrote favicon.png, favicon-192.png, apple-touch-icon.png, favicon.ico");
} catch (err) {
  console.warn("[favicons] PNG generation skipped (install offline or run later):", err?.message || err);
  process.exit(0);
}
