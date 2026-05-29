import { useMemo, useState } from "react";
import { AtSign, ImageDown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { renderBattleStoryCardPng } from "@/lib/renderBattleStoryCard";
import { trackShareUrl } from "@/lib/siteUrl";

type Props = {
  compact?: boolean;
  battleId?: number;
  winnerTrackId?: number;
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
};

function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").replace(/\s+/g, "");
}

export function BattleStoryCardButton({
  compact,
  battleId,
  winnerTrackId,
  battleGenre,
  winnerTitle,
  winnerCreator,
  winnerCoverUrl,
  trackATitle,
  trackBTitle,
  pctA,
  pctB,
  winStreak,
  totalVotes,
}: Props) {
  const { toast } = useToast();
  const [showHandleEditor, setShowHandleEditor] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const handleCreate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await renderBattleStoryCardPng({
        battleGenre,
        winnerTitle,
        winnerCreator,
        winnerCoverUrl,
        trackATitle,
        trackBTitle,
        pctA,
        pctB,
        winStreak,
        totalVotes,
        trackShareUrl: winnerTrackId ? trackShareUrl(winnerTrackId) : "https://nexmusic.ai/battle",
        instagramHandle: handleLabel || undefined,
      });
      const fileName = `nex-battle-${battleId ?? "result"}-${Date.now()}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      const shareText = handleLabel
        ? `My NEX battle pick ${handleLabel} #NEX #AIMusic #Battle`
        : "My NEX battle pick #NEX #AIMusic #Battle";

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
        description: "Saved image. Open Instagram Story and upload it.",
      });
    } catch (e: unknown) {
      toast({
        title: "Could not create story card",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const cls = compact
    ? "font-bold uppercase tracking-widest border rounded-sm transition-all text-[8px] px-2 py-1 border-white/15 text-zinc-400 hover:text-primary hover:border-primary/40 bg-black/30 disabled:opacity-40"
    : "font-bold uppercase tracking-widest border rounded-sm transition-all text-[9px] px-3 py-2 border-primary/35 text-primary hover:bg-primary/15 bg-primary/10 disabled:opacity-40";

  const clsSecondary = compact
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
    <div className="relative flex flex-col items-center gap-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-primary/80 text-center">
        Share your pick — brag on Story
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={busy}
          className={cls}
          data-testid="button-battle-story-card"
        >
          <Sparkles className={`inline ${compact ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />
          {busy ? "Creating…" : "Story Card"}
        </button>
        <button
          type="button"
          onClick={openHandleEditor}
          className={clsSecondary}
          data-testid="button-battle-story-handle"
          title="Instagram handle"
        >
          <AtSign className={`inline ${compact ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1`} />
          {handleLabel || "IG Handle"}
        </button>
      </div>
      {showHandleEditor ? (
        <div className="w-[min(92vw,320px)] rounded-xl border border-primary/30 bg-black/95 p-3 shadow-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Instagram Handle</p>
          <p className="text-[10px] text-zinc-500 mt-1">스토리 카드에 태그 문구로 들어갑니다. (@ 없이 입력)</p>
          <input
            value={draftHandle}
            onChange={(e) => setDraftHandle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveHandle();
              if (e.key === "Escape") setShowHandleEditor(false);
            }}
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
