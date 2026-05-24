#!/usr/bin/env node
/**
 * Write NEX favicon PNGs (header Disc3 vinyl mark) — stdlib only, no network.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "client", "public");

/** Remove legacy Replit favicon so Vite cannot republish it. */
for (const legacy of ["favicon.ico", "favicon.png", "favicon-192.png", "apple-touch-icon.png"]) {
  const p = path.join(publicDir, legacy);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(size, draw) {
  const rgba = Buffer.alloc(size * size * 4);
  draw(size, (x, y, r, g, b, a = 255) => {
    const i = (y * size + x) * 4;
    rgba[i] = r;
    rgba[i + 1] = g;
    rgba[i + 2] = b;
    rgba[i + 3] = a;
  });
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Vinyl disc icon — same idea as Layout header Disc3 + primary cyan. */
function drawNexDiscIcon(size, set) {
  const bg = [5, 5, 5];
  const cyan = [0, 240, 255];
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const outerR = size * 0.33;
  const innerR = size * 0.1;
  const hubR = size * 0.04;
  const ringW = Math.max(2, size * 0.07);
  const innerRingW = Math.max(2, size * 0.05);

  const dist = (x, y) => Math.hypot(x - cx, y - cy);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = dist(x, y);
      const cornerR = size * 0.19;
      const inSquircle =
        x >= cornerR &&
        x <= size - cornerR - 1 &&
        y >= cornerR &&
        y <= size - cornerR - 1;
      const inRound =
        (x < cornerR && y < cornerR && Math.hypot(x - cornerR, y - cornerR) <= cornerR) ||
        (x >= size - cornerR && y < cornerR && Math.hypot(x - (size - cornerR), y - cornerR) <= cornerR) ||
        (x < cornerR && y >= size - cornerR && Math.hypot(x - cornerR, y - (size - cornerR)) <= cornerR) ||
        (x >= size - cornerR &&
          y >= size - cornerR &&
          Math.hypot(x - (size - cornerR), y - (size - cornerR)) <= cornerR) ||
        inSquircle;

      if (!inRound) {
        set(x, y, 0, 0, 0, 0);
        continue;
      }

      const onOuter = d <= outerR + ringW / 2 && d >= outerR - ringW / 2;
      const onInner = d <= innerR + innerRingW / 2 && d >= innerR - innerRingW / 2;
      const onHub = d <= hubR;

      if (onOuter || onInner || onHub) {
        set(x, y, ...cyan);
      } else {
        set(x, y, ...bg);
      }
    }
  }
}

function writeIcon(name, size) {
  fs.writeFileSync(path.join(publicDir, name), writePng(size, drawNexDiscIcon));
  console.log("[favicons] wrote", name, `(${size}×${size})`);
}

fs.mkdirSync(publicDir, { recursive: true });
writeIcon("favicon.png", 48);
writeIcon("favicon-192.png", 192);
fs.copyFileSync(path.join(publicDir, "favicon-192.png"), path.join(publicDir, "apple-touch-icon.png"));
fs.copyFileSync(path.join(publicDir, "favicon.png"), path.join(publicDir, "favicon.ico"));
console.log("[favicons] wrote apple-touch-icon.png, favicon.ico (NEX disc, not Replit)");
