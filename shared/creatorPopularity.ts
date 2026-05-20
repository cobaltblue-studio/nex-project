/** Directory sort: plays + likes + battle wins (higher = more popular). */
export function computeCreatorPopularityScore(input: {
  totalPlays: number;
  totalLikes: number;
  battleWins: number;
}): number {
  return (
    Math.max(0, input.totalPlays) * 10 +
    Math.max(0, input.totalLikes) * 8 +
    Math.max(0, input.battleWins) * 25
  );
}
