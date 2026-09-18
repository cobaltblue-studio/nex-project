import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type ClashVerdictRitualProps = {
  open: boolean;
  winnerLabel: string;
  side: "A" | "B";
  durationMs?: number;
  onDone: () => void;
};

/**
 * Brief Teal verdict stamp after a battle vote.
 * Visual-only — does not pause or remount players.
 */
export function ClashVerdictRitual({
  open,
  winnerLabel,
  side,
  durationMs = 1400,
  onDone,
}: ClashVerdictRitualProps) {
  const dismiss = useCallback(() => {
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (!open) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduced ? 320 : Math.min(durationMs, 1500);
    const t = window.setTimeout(dismiss, ms);
    return () => window.clearTimeout(t);
  }, [open, durationMs, dismiss]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6"
      role="dialog"
      aria-label="Clash verdict"
      data-testid="clash-verdict-ritual"
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
      }}
    >
      <div
        className="nex-ritual-anim pointer-events-none flex max-w-sm flex-col items-center gap-3 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-[3px] border-verdict shadow-[0_0_28px_hsl(var(--nex-wow-teal)/0.35)]">
          <span className="font-display text-xs font-black uppercase tracking-[0.35em] text-verdict">
            Verdict
          </span>
        </div>
        <p className="font-display text-lg font-bold uppercase tracking-wide text-white">
          Track {side} wins
        </p>
        <p className="line-clamp-2 text-sm text-zinc-300">{winnerLabel}</p>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Tap to skip</p>
      </div>
    </div>,
    document.body,
  );
}
