#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "client", "public");
const svg = path.join(publicDir, "favicon.svg");

if (!fs.existsSync(svg)) {
  console.error("[verify-favicon] missing client/public/favicon.svg");
  process.exit(1);
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngSize(buf) {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

for (const name of ["favicon.png"]) {
  const p = path.join(publicDir, name);
  if (!fs.existsSync(p)) {
    console.error(`[verify-favicon] missing ${name} — run: npm run favicons:generate`);
    process.exit(1);
  }
  const buf = fs.readFileSync(p);
  if (buf.length < 80) {
    console.error(`[verify-favicon] ${name} is too small (${buf.length} bytes)`);
    process.exit(1);
  }
  if (!buf.subarray(0, 8).equals(PNG_SIG)) {
    console.error(`[verify-favicon] ${name} is not a PNG (legacy .ico?). Run: npm run favicons:generate`);
    process.exit(1);
  }
  const dim = pngSize(buf);
  if (!dim || dim.w !== 48 || dim.h !== 48) {
    console.error(
      `[verify-favicon] ${name} must be 48×48 NEX PNG (got ${dim ? `${dim.w}×${dim.h}` : "unknown"}).`,
    );
    process.exit(1);
  }
}

console.log("[verify-favicon] OK — NEX favicons present");
