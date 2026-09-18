type RankSpikeProps = {
  delta: number;
  threshold?: number;
  className?: string;
};

/**
 * Ember ↑ badge for chart climbs. Returns null below threshold.
 * Rank delta comes from session snapshot heuristic when API has no previous rank.
 */
export function RankSpike({ delta, threshold = 5, className = "" }: RankSpikeProps) {
  if (!Number.isFinite(delta) || delta < threshold) return null;
  return (
    <span
      className={`nex-spike-anim inline-flex items-center gap-0.5 rounded-full bg-[hsl(var(--nex-wow-ember))] px-1.5 py-0.5 text-[9px] font-black text-[hsl(var(--nex-on-wow))] ${className}`}
      data-testid="badge-rank-spike"
      title={`Climbed ${delta} ranks`}
    >
      ↑ +{Math.floor(delta)}
    </span>
  );
}
