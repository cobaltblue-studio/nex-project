#!/usr/bin/env node
/**
 * Write NEX favicon PNGs without network (stdlib only).
 * Google Search uses /favicon.ico (48×48 PNG or ICO) — must exist in client/public.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "client", "public");

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
  const crcData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(crcData));
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

/** Dark tile + green accent bar (matches favicon.svg). */
function drawNexIcon(size, set) {
  const bg = [10, 10, 10];
  const green = [0, 255, 128];
  const radius = Math.round(size * 0.19);
  const barH = Math.max(2, Math.round(size * 0.016));
  const barY0 = Math.round(size * 0.7);
  const barX0 = Math.round(size * 0.19);
  const barX1 = Math.round(size * 0.81);

  const insideRoundRect = (x, y) => {
    if (x < radius && y < radius) {
      const dx = radius - x;
      const dy = radius - y;
      return dx * dx + dy * dy <= radius * radius;
    }
    if (x >= size - radius && y < radius) {
      const dx = x - (size - radius - 1);
      const dy = radius - y;
      return dx * dx + dy * dy <= radius * radius;
    }
    if (x < radius && y >= size - radius) {
      const dx = radius - x;
      const dy = y - (size - radius - 1);
      return dx * dx + dy * dy <= radius * radius;
    }
    if (x >= size - radius && y >= size - radius) {
      const dx = x - (size - radius - 1);
      const dy = y - (size - radius - 1);
      return dx * dx + dy * dy <= radius * radius;
    }
    return true;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!insideRoundRect(x, y)) {
        set(x, y, 0, 0, 0, 0);
        continue;
      }
      if (y >= barY0 && y < barY0 + barH && x >= barX0 && x <= barX1) {
        set(x, y, ...green);
      } else {
        set(x, y, ...bg);
      }
    }
  }

  // Bold "NEX" blocks (readable at 48px in SERP).
  const white = [255, 255, 255];
  const glyphH = Math.round(size * 0.22);
  const glyphY = Math.round(size * 0.38);
  const unit = Math.max(2, Math.round(size / 24));
  const gap = unit;
  let x0 = Math.round(size * 0.22);

  const block = (x, y, w, h) => {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        if (px >= 0 && py >= 0 && px < size && py < size) set(px, py, ...white);
      }
    }
  };

  const letterN = (ox) => {
    const w = unit * 2;
    block(ox, glyphY, w, glyphH);
    block(ox + unit * 3, glyphY, w, glyphH);
    for (let i = 0; i < glyphH; i += unit) {
      block(ox + unit, glyphY + i, w, unit);
    }
  };
  const letterE = (ox) => {
    const w = unit * 2;
    block(ox, glyphY, w, glyphH);
    block(ox, glyphY, unit * 4, unit);
    block(ox, glyphY + Math.floor(glyphH / 2) - unit, unit * 3, unit);
    block(ox, glyphY + glyphH - unit, unit * 4, unit);
  };
  const letterX = (ox) => {
    for (let i = 0; i < glyphH; i += unit) {
      block(ox, glyphY + i, unit * 2, unit);
      block(ox + unit * 2, glyphY + i, unit * 2, unit);
    }
  };

  letterN(x0);
  x0 += unit * 5 + gap;
  letterE(x0);
  x0 += unit * 5 + gap;
  letterX(x0);
}

function writeIcon(name, size) {
  const buf = writePng(size, drawNexIcon);
  const out = path.join(publicDir, name);
  fs.writeFileSync(out, buf);
  console.log("[favicons] wrote", name, `(${size}×${size})`);
}

fs.mkdirSync(publicDir, { recursive: true });
writeIcon("favicon.png", 48);
writeIcon("favicon-192.png", 192);
fs.copyFileSync(path.join(publicDir, "favicon-192.png"), path.join(publicDir, "apple-touch-icon.png"));
fs.copyFileSync(path.join(publicDir, "favicon.png"), path.join(publicDir, "favicon.ico"));
console.log("[favicons] wrote apple-touch-icon.png, favicon.ico");
