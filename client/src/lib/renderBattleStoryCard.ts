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

function fillWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    cur = word;
    if (lines.length >= maxLines - 1) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  const out = lines.slice(0, maxLines);
  out.forEach((line, idx) => ctx.fillText(line, x, y + idx * lineHeight));
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

function drawGlowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  glow: string,
) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 28;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export async function renderBattleStoryCardPng(input: BattleStoryCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  const W = canvas.width;
  const H = canvas.height;

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

  ctx.font = "900 72px Inter, system-ui, sans-serif";
  drawGlowText(ctx, trimText(input.winnerTitle, 40), 100, coverY + coverSize + 130, "#ffffff", "rgba(34,211,238,0.85)");

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 36px Inter, system-ui, sans-serif";
  ctx.fillText(`by ${trimText(input.winnerCreator, 28)}`, 100, coverY + coverSize + 200);

  if (input.winStreak && input.winStreak > 0) {
    drawRoundedRect(ctx, 100, coverY + coverSize + 230, 280, 48, 12);
    ctx.fillStyle = "rgba(249, 115, 22, 0.2)";
    ctx.fill();
    ctx.strokeStyle = "rgba(249, 115, 22, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fb923c";
    ctx.font = "700 24px Inter, system-ui, sans-serif";
    ctx.fillText(`🔥 WIN STREAK ${input.winStreak}`, 120, coverY + coverSize + 264);
  }

  const barY = 1320;
  const barW = 880;
  const barH = 88;

  drawRoundedRect(ctx, 100, barY, barW, barH, 18);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  drawRoundedRect(ctx, 100, barY, Math.max(32, Math.round((barW * input.pctA) / 100)), barH, 18);
  ctx.fillStyle = "#22d3ee";
  ctx.fill();
  ctx.fillStyle = "#020617";
  ctx.font = "800 32px Inter, system-ui, sans-serif";
  ctx.fillText(`A · ${input.pctA}%`, 120, barY + 56);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  ctx.fillText(trimText(input.trackATitle, 32), 280, barY + 56);

  drawRoundedRect(ctx, 100, barY + 110, barW, barH, 18);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  drawRoundedRect(ctx, 100, barY + 110, Math.max(32, Math.round((barW * input.pctB) / 100)), barH, 18);
  ctx.fillStyle = "#60a5fa";
  ctx.fill();
  ctx.fillStyle = "#020617";
  ctx.font = "800 32px Inter, system-ui, sans-serif";
  ctx.fillText(`B · ${input.pctB}%`, 120, barY + 166);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  ctx.fillText(trimText(input.trackBTitle, 32), 280, barY + 166);

  if (input.totalVotes != null && input.totalVotes >= 3) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 24px Inter, system-ui, sans-serif";
    ctx.fillText(`Community votes: ${input.totalVotes}`, 100, barY + 230);
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
