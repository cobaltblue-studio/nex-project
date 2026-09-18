/**
 * Creator Crest — client-side tier from public battle/chart stats.
 * Rules SoT: docs/superpowers/plans/2026-09-19-nex-arena-week6-creator-crest.md
 */

export type CrestTierId = "spark" | "contender" | "champion" | "legend";

export type CrestInputs = {
  battleWins: number;
  maxWinStreak?: number;
  /** Official chart position (1 = #1). null/undefined = not on chart */
  bestChartRank?: number | null;
};

export type CrestResult = {
  tier: CrestTierId | null;
  /** Violet resting always true for crest surface */
  resting: true;
  earned: boolean;
  battleWins: number;
  maxWinStreak: number;
  bestChartRank: number | null;
};

const TIER_ORDER: CrestTierId[] = ["spark", "contender", "champion", "legend"];

function finiteNonNeg(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.floor(v);
}

function meetsSpark(wins: number, streak: number): boolean {
  return wins >= 3 || streak >= 2;
}

function meetsContender(wins: number, streak: number, rank: number | null): boolean {
  return wins >= 10 || streak >= 5 || (rank != null && rank <= 50);
}

function meetsChampion(wins: number, streak: number, rank: number | null): boolean {
  return wins >= 25 || streak >= 10 || (rank != null && rank <= 10);
}

function meetsLegend(wins: number, rank: number | null): boolean {
  return wins >= 50 || (rank != null && rank <= 3);
}

/** Highest unlocked tier, or null (resting-only). */
export function resolveCreatorCrest(input: CrestInputs): CrestResult {
  const battleWins = finiteNonNeg(input.battleWins);
  const maxWinStreak = finiteNonNeg(input.maxWinStreak ?? 0);
  const rawRank = input.bestChartRank;
  const bestChartRank =
    rawRank == null || !Number.isFinite(Number(rawRank)) || Number(rawRank) < 1
      ? null
      : Math.floor(Number(rawRank));

  let tier: CrestTierId | null = null;
  if (meetsLegend(battleWins, bestChartRank)) tier = "legend";
  else if (meetsChampion(battleWins, maxWinStreak, bestChartRank)) tier = "champion";
  else if (meetsContender(battleWins, maxWinStreak, bestChartRank)) tier = "contender";
  else if (meetsSpark(battleWins, maxWinStreak)) tier = "spark";

  return {
    tier,
    resting: true,
    earned: tier != null,
    battleWins,
    maxWinStreak,
    bestChartRank,
  };
}

export function crestTierRank(tier: CrestTierId | null): number {
  if (!tier) return 0;
  return TIER_ORDER.indexOf(tier) + 1;
}

/** Aggregate from profile track list + optional chart rank map. */
export function crestInputsFromTracks(
  tracks: Array<{ wins?: number; winStreak?: number; id?: number }>,
  chartRankByTrackId?: Map<number, number>,
): CrestInputs {
  let battleWins = 0;
  let maxWinStreak = 0;
  let bestChartRank: number | null = null;
  for (const t of tracks) {
    battleWins += finiteNonNeg(t.wins);
    maxWinStreak = Math.max(maxWinStreak, finiteNonNeg(t.winStreak));
    if (chartRankByTrackId && t.id != null) {
      const r = chartRankByTrackId.get(t.id);
      if (r != null && (bestChartRank == null || r < bestChartRank)) bestChartRank = r;
    }
  }
  return { battleWins, maxWinStreak, bestChartRank };
}

/** Per-track chart row hint. */
export function crestInputsFromChartTrack(track: {
  wins?: number;
  winStreak?: number;
  rank?: number;
}): CrestInputs {
  return {
    battleWins: finiteNonNeg(track.wins),
    maxWinStreak: finiteNonNeg(track.winStreak),
    bestChartRank: track.rank != null && track.rank >= 1 ? track.rank : null,
  };
}
