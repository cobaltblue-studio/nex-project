#!/usr/bin/env node
/** Remove Replit blobs from Vite output so express.static cannot serve them. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "client", "dist");
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isLegacy(name) {
  const p = path.join(dist, name);
  if (!fs.existsSync(p)) return false;
  const buf = fs.readFileSync(p);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIG)) return true;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return true;
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return w !== 48 || h !== 48;
}

for (const name of ["favicon.ico", "favicon.png", "apple-touch-icon.png", "favicon-192.png"]) {
  const p = path.join(dist, name);
  if (isLegacy(name)) {
    fs.unlinkSync(p);
    console.log("[strip-favicons] removed legacy", name);
  }
}

console.log("[strip-favicons] done — favicon.svg remains for /favicon.ico route");
