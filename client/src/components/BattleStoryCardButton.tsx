import { useMemo, useState } from "react";
import { AtSign, ImageDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Props = {
  compact?: boolean;
  battleGenre: string;
  winnerTitle: string;
  winnerCreator: string;
  trackATitle: string;
  trackBTitle: string;
  pctA: number;
  pctB: number;
};

function trimText(value: string, max = 44): string {
  const v = (value ?? "").trim();
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1)}…`;
}

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(/\s+/g, "");
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
  if (lines.length > maxLines) lines.length = maxLines;
  const out = lines.map((line, idx) =>
    idx === maxLines - 1 && words.join(" ").length > lines.join(" ").length
      ? `${trimText(line, Math.max(6, line.length - 1))}`
      : line,
  );
  out.forEach((line, idx) => ctx.fillText(line, x, y + idx * lineHeight));
}

export function BattleStoryCardButton({
  compact,
  battleGenre,
  winnerTitle,
  winnerCreator,
  trackATitle,
  trackBTitle,
  pctA,
  pctB,
}: Props) {
  const { toast } = useToast();
  const [showHandleEditor, setShowHandleEditor] = useState(false);
  const [instagramHandle, setInstagramHandle] = useState<string>(() => {
    try {
      return localStorage.getItem("nex.instagramHandle") ?? "";
    } catch {
      return "";
    }
  });
  const [draftHandle, setDraftHandle] = useState(instagramHandle);
  const handleLabel = useMemo(() => {
    const h = normalizeHandle(instagramHandle);
    return h ? `@${h}` : "";
  }, [instagramHandle]);

  const createCardBlob = async (): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available");

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(0.45, "#031525");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(780, 460, 40, 780, 460, 760);
    glow.addColorStop(0, "rgba(56, 189, 248, 0.22)");
    glow.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawRoundedRect(ctx, 90, 110, 900, 1700, 28);
    ctx.fillStyle = "rgba(34, 211, 238, 0.1)";
    ctx.fill();

    ctx.strokeStyle = "rgba(34, 211, 238, 0.5)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 90, 110, 900, 1700, 28);
    ctx.stroke();

    ctx.fillStyle = "#67e8f9";
    ctx.font = "700 44px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText("NEX BATTLE RESULT", 140, 220);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 30px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText(`Genre: ${trimText(battleGenre || "ALL", 18).toUpperCase()}`, 140, 282);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 38px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText("WINNER", 140, 390);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 64px Inter, system-ui, -apple-system, sans-serif";
    fillWrappedText(ctx, trimText(winnerTitle, 52), 140, 500, 760, 72, 2);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 34px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText(`by ${trimText(winnerCreator, 30)}`, 140, 610);

    drawRoundedRect(ctx, 140, 700, 800, 110, 16);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    drawRoundedRect(ctx, 140, 880, 800, 110, 16);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();

    ctx.fillStyle = "#67e8f9";
    drawRoundedRect(ctx, 140, 700, Math.max(24, Math.round((800 * pctA) / 100)), 110, 16);
    ctx.fill();

    ctx.fillStyle = "#60a5fa";
    drawRoundedRect(ctx, 140, 880, Math.max(24, Math.round((800 * pctB) / 100)), 110, 16);
    ctx.fill();

    ctx.fillStyle = "#020617";
    ctx.font = "700 30px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText(`${pctA}%`, 860, 770);
    ctx.fillText(`${pctB}%`, 860, 950);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 28px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText(`A · ${trimText(trackATitle, 36)}`, 152, 770);
    ctx.fillText(`B · ${trimText(trackBTitle, 36)}`, 152, 950);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 26px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText("Share your pick on Instagram Story", 140, 1140);
    ctx.fillText("nexmusic.ai/battle", 140, 1190);
    if (handleLabel) {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "700 30px Inter, system-ui, -apple-system, sans-serif";
      ctx.fillText(`Tag: ${handleLabel}`, 140, 1250);
    }

    ctx.fillStyle = "#67e8f9";
    ctx.font = "800 42px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText("#NEX #AIMusic #Battle", 140, 1330);

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (!b) reject(new Error("Card render failed"));
        else resolve(b);
      }, "image/png");
    });
    return blob;
  };

  const handleCreate = async () => {
    try {
      const blob = await createCardBlob();
      const fileName = `nex-battle-story-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const shareText = handleLabel
        ? `My NEX battle pick ${handleLabel} #NEX #AIMusic`
        : "My NEX battle pick #NEX #AIMusic";

      if (typeof navigator.share === "function" && typeof navigator.canShare === "function") {
        try {
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "NEX Battle Result",
              text: shareText,
              files: [file],
            });
            return;
          }
        } catch {
          // Fall through to download.
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Story card ready",
        description: "Saved image. Upload it to Instagram Story.",
      });
    } catch (e: unknown) {
      toast({
        title: "Could not create story card",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const cls = compact
    ? "font-bold uppercase tracking-widest border rounded-sm transition-all text-[8px] px-2 py-1 border-white/15 text-zinc-400 hover:text-primary hover:border-primary/40 bg-black/30"
    : "font-bold uppercase tracking-widest border rounded-sm transition-all text-[9px] px-3 py-2 border-white/15 text-zinc-300 hover:text-primary hover:border-primary/40 bg-black/20";

  const saveHandle = () => {
    const next = normalizeHandle(draftHandle);
    setInstagramHandle(next);
    try {
      localStorage.setItem("nex.instagramHandle", next);
    } catch {
      // ignore storage errors
    }
    toast({
      title: "Instagram handle updated",
      description: next ? `@${next}` : "Handle removed",
    });
    setShowHandleEditor(false);
  };

  const openHandleEditor = () => {
    setDraftHandle(instagramHandle);
    setShowHandleEditor(true);
  };

  return (
    <div className="relative flex items-center justify-center gap-2">
      <button type="button" onClick={() => void handleCreate()} className={cls} data-testid="button-battle-story-card">
        <ImageDown className={`inline ${compact ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />
        Story Card
      </button>
      <button
        type="button"
        onClick={openHandleEditor}
        className={cls}
        data-testid="button-battle-story-handle"
        title="Instagram handle"
      >
        <AtSign className={`inline ${compact ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />
        {handleLabel || "IG Handle"}
      </button>
      {showHandleEditor ? (
        <div className="absolute z-30 top-full mt-2 w-[min(92vw,320px)] rounded-xl border border-primary/30 bg-black/95 p-3 shadow-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Instagram Handle</p>
          <p className="text-[10px] text-zinc-500 mt-1">스토리 카드에 태그 문구로 들어갑니다. (@ 없이 입력)</p>
          <input
            value={draftHandle}
            onChange={(e) => setDraftHandle(e.target.value)}
            placeholder="nexmusic.ai"
            maxLength={40}
            autoFocus
            className="mt-2 w-full rounded-md border border-white/15 bg-black px-2.5 py-2 text-sm text-white focus:outline-none focus:border-primary/40"
            data-testid="input-battle-story-handle"
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowHandleEditor(false)}
              className="text-[10px] font-bold uppercase tracking-widest border rounded-sm px-2.5 py-1.5 border-white/15 text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveHandle}
              className="text-[10px] font-bold uppercase tracking-widest border rounded-sm px-2.5 py-1.5 border-primary/35 text-primary hover:bg-primary/10"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
