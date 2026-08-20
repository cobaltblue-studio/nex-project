/** First calendar day (KST) that can show a NEW badge. Tracks registered before this stay unmarked. */
export const NEW_BADGE_EARLIEST_KST = "2026-08-20T00:00:00+09:00";

export const NEW_BADGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const EARLIEST_MS = Date.parse(NEW_BADGE_EARLIEST_KST);

export function isTrackNewBadgeVisible(
  createdAt: string | Date | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (createdAt == null || createdAt === "") return false;
  const createdMs = createdAt instanceof Date ? createdAt.getTime() : Date.parse(String(createdAt));
  if (!Number.isFinite(createdMs)) return false;
  if (createdMs < EARLIEST_MS) return false;
  const age = nowMs - createdMs;
  return age >= 0 && age < NEW_BADGE_WINDOW_MS;
}
