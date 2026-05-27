import { ImageDown } from "lucide-react";
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

    ctx.fillStyle = "rgba(34, 211, 238, 0.12)";
    ctx.fillRect(90, 110, 900, 1700);

    ctx.strokeStyle = "rgba(34, 211, 238, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(90, 110, 900, 1700);

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
    ctx.fillText(trimText(winnerTitle, 26), 140, 500);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 34px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText(`by ${trimText(winnerCreator, 30)}`, 140, 560);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(140, 660, 800, 110);
    ctx.fillRect(140, 840, 800, 110);

    ctx.fillStyle = "#67e8f9";
    ctx.fillRect(140, 660, Math.max(24, Math.round((800 * pctA) / 100)), 110);

    ctx.fillStyle = "#60a5fa";
    ctx.fillRect(140, 840, Math.max(24, Math.round((800 * pctB) / 100)), 110);

    ctx.fillStyle = "#020617";
    ctx.font = "700 30px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText(`${pctA}%`, 860, 730);
    ctx.fillText(`${pctB}%`, 860, 910);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 28px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText(`A · ${trimText(trackATitle, 36)}`, 152, 730);
    ctx.fillText(`B · ${trimText(trackBTitle, 36)}`, 152, 910);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 26px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText("Share your pick on Instagram Story", 140, 1100);
    ctx.fillText("nexmusic.ai/battle", 140, 1150);

    ctx.fillStyle = "#67e8f9";
    ctx.font = "800 42px Inter, system-ui, -apple-system, sans-serif";
    ctx.fillText("#NEX #AIMusic #Battle", 140, 1270);

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

      if (typeof navigator.share === "function" && typeof navigator.canShare === "function") {
        try {
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "NEX Battle Result",
              text: "My NEX battle pick",
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

  return (
    <button type="button" onClick={() => void handleCreate()} className={cls} data-testid="button-battle-story-card">
      <ImageDown className={`inline ${compact ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />
      Story Card
    </button>
  );
}
