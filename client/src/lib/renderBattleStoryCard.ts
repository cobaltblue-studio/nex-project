export type BattleStoryCardInput = {
  battleGenre: string;
  winnerTitle: string;
  winnerCreator: string;
  winnerCoverUrl?: string | null;
  trackATitle: string;
  trackBTitle: string;
  pctA: number;
  pctB: number;
  winStreak?: number;
  totalVotes?: number;
  trackShareUrl: string;
  instagramHandle?: string;
};

function trimText(value: string, max = 44): string {
  const v = (value ?? "").trim();
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1)}…`;
}

function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  const raw = (text ?? "").trim() || "—";
  if (ctx.measureText(raw).width <= maxWidth) return raw;
  let out = raw;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

/** Split long unbroken strings (e.g. Korean titles without spaces). */
function tokenizeForWrap(text: string): string[] {
  const raw = (text ?? "").trim();
  if (!raw) return ["—"];
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length > 1) return words;
  const single = words[0] ?? raw;
  if (single.length <= 24) return [single];
  const chunks: string[] = [];
  for (let i = 0; i < single.length; i += 12) {
    chunks.push(single.slice(i, i + 12));
  }
  return chunks;
}

function wrapLinesToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = tokenizeForWrap(text);
  if (words.length === 0) return ["—"];

  const lines: string[] = [];
  let cur = "";
  let wordIdx = 0;

  while (wordIdx < words.length && lines.length < maxLines) {
    const word = words[wordIdx];
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      cur = next;
      wordIdx += 1;
      continue;
    }
    if (cur) {
      lines.push(cur);
      cur = "";
      continue;
    }
    lines.push(truncateToWidth(ctx, word, maxWidth));
    cur = "";
    wordIdx += 1;
  }

  if (lines.length < maxLines && cur) lines.push(cur);

  if (wordIdx < words.length) {
    const tail = words.slice(wordIdx).join(" ");
    const lastIdx = Math.max(0, Math.min(lines.length, maxLines) - 1);
    const merged = lines[lastIdx] ? `${lines[lastIdx]} ${tail}` : tail;
    if (lines.length === 0) lines.push(truncateToWidth(ctx, merged, maxWidth));
    else lines[lastIdx] = truncateToWidth(ctx, merged, maxWidth);
  }

  return lines.slice(0, maxLines).map((line) =>
    ctx.measureText(line).width > maxWidth ? truncateToWidth(ctx, line, maxWidth) : line,
  );
}

function drawBattleResultBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  fillColor: string,
  sideLabel: "A" | "B",
  trackTitle: string,
) {
  const r = 18;
  drawRoundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();

  const fillW = Math.max(32, Math.round((w * pct) / 100));
  drawRoundedRect(ctx, x, y, fillW, h, r);
  ctx.fillStyle = fillColor;
  ctx.fill();

  const padX = 20;
  const innerW = w - padX * 2;

  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, r);
  ctx.clip();

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = pct >= 50 ? "#020617" : "#e2e8f0";
  ctx.font = "800 28px Inter, system-ui, sans-serif";
  const pctLine = `${sideLabel} · ${pct}%`;
  ctx.fillText(truncateToWidth(ctx, pctLine, innerW), x + padX, y + 38);

  ctx.fillStyle = pct >= 50 ? "#0f172a" : "#cbd5e1";
  ctx.font = "600 24px Inter, system-ui, sans-serif";
  const titleLines = wrapLinesToWidth(ctx, trackTitle, innerW, 2);
  const titleLineH = 30;
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, x + padX, y + 68 + idx * titleLineH);
  });

  ctx.restore();
}

/** Pick font size + wrapped lines so title stays inside the story card content box. */
function fitTitleLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  startPx: number,
  minPx: number,
): { fontSize: number; lines: string[]; lineHeight: number } {
  const title = (text ?? "").trim() || "—";
  for (let size = startPx; size >= minPx; size -= 2) {
    ctx.font = `900 ${size}px Inter, system-ui, sans-serif`;
    const lines = wrapLinesToWidth(ctx, title, maxWidth, maxLines);
    const tooWide = lines.some((line) => ctx.measureText(line).width > maxWidth + 0.5);
    if (!tooWide) {
      return { fontSize: size, lines, lineHeight: Math.round(size * 1.12) };
    }
  }
  ctx.font = `900 ${minPx}px Inter, system-ui, sans-serif`;
  const lines = wrapLinesToWidth(ctx, title, maxWidth, maxLines);
  return { fontSize: minPx, lines, lineHeight: Math.round(minPx * 1.12) };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawGlowTextLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  color: string,
  glow: string,
) {
  lines.forEach((line, idx) => {
    const ly = y + idx * lineHeight;
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 28;
    ctx.fillStyle = color;
    ctx.fillText(line, x, ly);
    ctx.restore();
    ctx.fillStyle = color;
    ctx.fillText(line, x, ly);
  });
}

export async function renderBattleStoryCardPng(input: BattleStoryCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const W = canvas.width;
  const H = canvas.height;
  const contentPadX = 100;
  const contentMaxW = W - contentPadX * 2;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#02040a");
  bg.addColorStop(0.35, "#031525");
  bg.addColorStop(0.7, "#12082a");
  bg.addColorStop(1, "#050505");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const orbA = ctx.createRadialGradient(200, 280, 20, 200, 280, 520);
  orbA.addColorStop(0, "rgba(34, 211, 238, 0.35)");
  orbA.addColorStop(1, "rgba(34, 211, 238, 0)");
  ctx.fillStyle = orbA;
  ctx.fillRect(0, 0, W, H);

  const orbB = ctx.createRadialGradient(900, 1200, 20, 900, 1200, 600);
  orbB.addColorStop(0, "rgba(168, 85, 247, 0.28)");
  orbB.addColorStop(1, "rgba(168, 85, 247, 0)");
  ctx.fillStyle = orbB;
  ctx.fillRect(0, 0, W, H);

  drawRoundedRect(ctx, 56, 56, W - 112, H - 112, 36);
  ctx.strokeStyle = "rgba(34, 211, 238, 0.45)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#67e8f9";
  ctx.font = "800 52px Inter, system-ui, sans-serif";
  ctx.fillText("NEX", 100, 150);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "700 28px Inter, system-ui, sans-serif";
  ctx.fillText("BATTLE ARENA", 220, 150);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  drawRoundedRect(ctx, 100, 190, 320, 52, 12);
  ctx.fill();
  ctx.fillStyle = "#fbbf24";
  ctx.font = "800 26px Inter, system-ui, sans-serif";
  ctx.fillText(`GENRE · ${trimText(input.battleGenre || "ALL", 14).toUpperCase()}`, 120, 226);

  const coverSize = 520;
  const coverX = (W - coverSize) / 2;
  const coverY = 280;
  const coverImg = input.winnerCoverUrl ? await loadImage(input.winnerCoverUrl) : null;

  ctx.save();
  drawRoundedRect(ctx, coverX - 8, coverY - 8, coverSize + 16, coverSize + 16, 32);
  ctx.strokeStyle = "rgba(34, 211, 238, 0.85)";
  ctx.lineWidth = 6;
  ctx.shadowColor = "rgba(34, 211, 238, 0.9)";
  ctx.shadowBlur = 40;
  ctx.stroke();
  ctx.restore();

  drawRoundedRect(ctx, coverX, coverY, coverSize, coverSize, 28);
  ctx.save();
  ctx.clip();
  if (coverImg) {
    ctx.drawImage(coverImg, coverX, coverY, coverSize, coverSize);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
  } else {
    const ph = ctx.createLinearGradient(coverX, coverY, coverX + coverSize, coverY + coverSize);
    ph.addColorStop(0, "#0f172a");
    ph.addColorStop(1, "#164e63");
    ctx.fillStyle = ph;
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
    ctx.fillStyle = "#67e8f9";
    ctx.font = "700 36px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NEX", coverX + coverSize / 2, coverY + coverSize / 2);
    ctx.textAlign = "left";
  }
  ctx.restore();

  drawRoundedRect(ctx, 280, coverY + coverSize - 36, 520, 72, 18);
  ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.font = "900 34px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🏆  MY PICK WINS", W / 2, coverY + coverSize + 18);
  ctx.textAlign = "left";

  const titleBaseY = coverY + coverSize + 130;
  const titleLayout = fitTitleLayout(
    ctx,
    input.winnerTitle,
    contentMaxW,
    3,
    72,
    34,
  );
  ctx.font = `900 ${titleLayout.fontSize}px Inter, system-ui, sans-serif`;
  drawGlowTextLines(
    ctx,
    titleLayout.lines,
    contentPadX,
    titleBaseY,
    titleLayout.lineHeight,
    "#ffffff",
    "rgba(34,211,238,0.85)",
  );

  const creatorY =
    titleBaseY + titleLayout.lines.length * titleLayout.lineHeight + 28;
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 36px Inter, system-ui, sans-serif";
  ctx.fillText(
    `by ${truncateToWidth(ctx, input.winnerCreator, contentMaxW - 48)}`,
    contentPadX,
    creatorY,
  );

  const streakY = creatorY + 44;
  if (input.winStreak && input.winStreak > 0) {
    drawRoundedRect(ctx, contentPadX, streakY, 280, 48, 12);
    ctx.fillStyle = "rgba(249, 115, 22, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "rgba(249, 115, 22, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fb923c";
    ctx.font = "700 24px Inter, system-ui, sans-serif";
    ctx.fillText(`🔥 WIN STREAK ${input.winStreak}`, contentPadX + 20, streakY + 34);
  }

  const barY =
    input.winStreak && input.winStreak > 0 ? streakY + 72 : creatorY + 72;
  const barX = contentPadX;
  const barW = contentMaxW;
  const barH = 108;
  const barGap = 14;

  drawBattleResultBar(
    ctx,
    barX,
    barY,
    barW,
    barH,
    input.pctA,
    "#22d3ee",
    "A",
    input.trackATitle,
  );
  drawBattleResultBar(
    ctx,
    barX,
    barY + barH + barGap,
    barW,
    barH,
    input.pctB,
    "#60a5fa",
    "B",
    input.trackBTitle,
  );

  const afterBarsY = barY + barH * 2 + barGap + 24;
  if (input.totalVotes != null && input.totalVotes >= 3) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 24px Inter, system-ui, sans-serif";
    ctx.fillText(`Community votes: ${input.totalVotes}`, barX, afterBarsY);
  }

  ctx.fillStyle = "#67e8f9";
  ctx.font = "800 38px Inter, system-ui, sans-serif";
  ctx.fillText("BRAG ON YOUR STORY", 100, 1680);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  const handle = input.instagramHandle?.trim();
  if (handle) {
    ctx.fillText(`Tag ${handle.startsWith("@") ? handle : `@${handle}`}`, 100, 1730);
  }
  ctx.fillText(trimText(input.trackShareUrl.replace(/^https?:\/\//, ""), 48), 100, 1780);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 30px Inter, system-ui, sans-serif";
  ctx.fillText("#NEX #AIMusic #Battle #MyPick", 100, 1840);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) reject(new Error("Card render failed"));
      else resolve(b);
    }, "image/png");
  });
}
