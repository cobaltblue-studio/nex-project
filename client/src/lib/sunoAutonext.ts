/** Padding after the reported duration before AUTO NEXT (Suno iframe loops with no onEnded). */
const SUNO_END_PAD_MS = 14_000;
/** Never advance before ~1.5 min (avoids instant skip on bad metadata). */
const SUNO_MIN_MS = 90_000;
/** Cap even when metadata is wrong (8 min). */
const SUNO_MAX_MS = 480_000;
/** When Suno length is unknown, wait up to 6 min so ~4 min songs are not cut off. */
const SUNO_FALLBACK_MS = 360_000;

/**
 * Delay before advancing to the next track for Suno embeds.
 * Known length: duration + pad. Unknown: generous fallback (short songs may loop once).
 */
export function computeSunoAutonextDelayMs(durationSeconds: number | null | undefined): number {
  if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return SUNO_FALLBACK_MS;
  }
  const raw = Math.round(durationSeconds * 1000) + SUNO_END_PAD_MS;
  return Math.min(SUNO_MAX_MS, Math.max(SUNO_MIN_MS, raw));
}

export function formatSunoAutonextHint(durationSeconds: number | null | undefined): string {
  if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return "Suno: up to ~6 min, then next (length unknown)";
  }
  const m = Math.floor(durationSeconds / 60);
  const s = Math.round(durationSeconds % 60);
  return `Suno: ~${m}:${String(s).padStart(2, "0")} + buffer, then next`;
}
