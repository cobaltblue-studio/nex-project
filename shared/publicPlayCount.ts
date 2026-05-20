/** Unified play count for charts, NEW, and creator directory (tracks.play_count vs track_metrics.plays_count). */
export function resolvePublicPlayCount(opts: {
  playCount?: number | null;
  playsCount?: number | null;
}): number {
  const chart = Number(opts.playCount ?? 0);
  const metrics = Number(opts.playsCount ?? 0);
  return Math.max(0, chart, metrics);
}

export function hasPublicCount(value: number | null | undefined): boolean {
  return Number(value) > 0;
}
