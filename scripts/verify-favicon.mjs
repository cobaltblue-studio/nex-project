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

for (const name of ["favicon.ico", "favicon.png"]) {
  const p = path.join(publicDir, name);
  if (!fs.existsSync(p)) {
    console.error(`[verify-favicon] missing ${name} — run: npm run favicons:generate`);
    process.exit(1);
  }
  const size = fs.statSync(p).size;
  if (size < 512) {
    console.error(
      `[verify-favicon] ${name} is only ${size} bytes (legacy Replit favicon). Run: npm run favicons:generate`,
    );
    process.exit(1);
  }
}

console.log("[verify-favicon] OK — NEX favicons present");
