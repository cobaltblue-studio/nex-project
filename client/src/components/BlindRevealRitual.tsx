import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

type BlindRevealRitualProps = {
  open: boolean;
  /** Max ms before auto-done. Capped at 800. */
  durationMs?: number;
  label?: string;
  onDone: () => void;
};

/**
 * Brief Violet → clear flash when blind identity lifts.
 * Visual-only — does not pause or remount players.
 * Sequence with ClashVerdictRitual: run this first, then verdict.
 */
export function BlindRevealRitual({
  open,
  durationMs = 700,
  label = "Behind the veil…",
  onDone,
}: BlindRevealRitualProps) {
  const dismiss = useCallback(() => {
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (!open) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduced ? 80 : Math.min(durationMs, 800);
    const t = window.setTimeout(dismiss, ms);
    return () => window.clearTimeout(t);
  }, [open, durationMs, dismiss]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 px-6 nex-blind-reveal-shell"
      role="dialog"
      aria-label={label}
      data-testid="blind-reveal-ritual"
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") dismiss();
      }}
    >
      <div
        className="nex-blind-reveal-anim pointer-events-none flex max-w-xs flex-col items-center gap-2 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-16 w-16 rounded-full border-2 border-clash shadow-[0_0_32px_hsl(var(--nex-wow-violet)/0.45)] bg-clash/20" />
        <p className="font-display text-sm font-bold uppercase tracking-[0.28em] text-clash">
          {label}
        </p>
      </div>
    </div>,
    document.body,
  );
}
