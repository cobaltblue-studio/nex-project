#!/usr/bin/env node
/**
 * Copy Cursor-generated NEX favicon into client/public (run once if favicon.png is missing).
 * Usage: node scripts/brand-favicon-from-asset.mjs /path/to/favicon-nex.png
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "client", "public");

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error("Usage: node scripts/brand-favicon-from-asset.mjs <path-to-png>");
  process.exit(1);
}

const buf = fs.readFileSync(src);
if (buf.length < 512) {
  console.error("Source image looks like the legacy Replit favicon (<512 bytes). Use your NEX logo PNG.");
  process.exit(1);
}
for (const name of ["favicon.png", "favicon-192.png", "apple-touch-icon.png", "favicon.ico"]) {
  fs.writeFileSync(path.join(publicDir, name), buf);
  console.log("wrote", name);
}
