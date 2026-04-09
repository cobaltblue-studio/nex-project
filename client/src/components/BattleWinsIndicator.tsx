import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type ShowFrom = "sm" | "md";

/** Compact battle win count (replaces misleading win-% when sample size is tiny). */
export function BattleWinsIndicator({
  wins,
  showFrom = "md",
  className,
  testId,
}: {
  wins: number;
  showFrom?: ShowFrom;
  className?: string;
  testId?: string;
}) {
  const n = typeof wins === "number" && Number.isFinite(wins) ? wins : 0;
  if (n < 1) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 shrink-0 tabular-nums",
        showFrom === "sm" ? "hidden sm:flex" : "hidden md:flex",
        className,
      )}
      title={`${n} battle win${n === 1 ? "" : "s"}`}
      data-testid={testId}
    >
      <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="text-xs font-black text-orange-400">{n}</span>
    </div>
  );
}
