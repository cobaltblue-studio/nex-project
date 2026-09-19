/**
 * Friday Clash Night — shared activation + B/C rules (Founder-adjustable).
 * Product TZ: Asia/Seoul. See docs/superpowers/plans/2026-09-19-nex-arena-week5-friday-clash-pool-rules.md
 */

export const CLASH_NIGHT_TZ = "Asia/Seoul";

/** C — flat rankingScore added to the winner on each clash-night vote win. */
export const CLASH_NIGHT_WIN_RANKING_BONUS = 25;

/** B — matchmaking weight multipliers (stacked × with fairness/boost). */
export const CLASH_NIGHT_POOL = {
  /** winStreak ≥ this → streakMul */
  streakMin: 2,
  streakMul: 2.25,
  /** created within this many days → recentMul */
  recentDays: 7,
  recentMul: 2.0,
  /**
   * Activity: 1 + min(activityCap, log1p(playCount) / activityDiv).
   * Uses playCount (existing field); no separate volatility column.
   */
  activityDiv: 10,
  activityCap: 1.0,
} as const;

/** Process-lifetime accumulator so ranking recompute does not wipe Friday bonuses. */
const fridayRankingBonusByTrackId = new Map<number, number>();

export function getFridayRankingBonus(trackId: number): number {
  return fridayRankingBonusByTrackId.get(trackId) ?? 0;
}

export function addFridayRankingBonus(trackId: number, amount: number): number {
  const next = (fridayRankingBonusByTrackId.get(trackId) ?? 0) + amount;
  fridayRankingBonusByTrackId.set(trackId, next);
  return next;
}

export type ClashNightReason = "disabled" | "force" | "friday" | "preview" | "off";

export type ClashNightState = {
  active: boolean;
  timezone: string;
  weekday: string;
  reason: ClashNightReason;
  nowIso: string;
  rules: {
    pool: typeof CLASH_NIGHT_POOL;
    winBonus: { rankingScoreFlat: number };
  };
};

function kstWeekday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLASH_NIGHT_TZ,
    weekday: "long",
  }).format(now);
}

/** True when NODE_ENV is not production (local / staging smoke). */
export function isNonProductionClashPreviewAllowed(): boolean {
  return String(process.env.NODE_ENV || "").trim() !== "production";
}

/**
 * Resolve Friday Clash Night for server-side B/C.
 * Preview request flag is honored only when non-production (or CLASH_NIGHT_ALLOW_PREVIEW=1).
 */
export function resolveClashNight(opts?: {
  previewRequest?: boolean;
  now?: Date;
}): ClashNightState {
  const now = opts?.now ?? new Date();
  const weekday = kstWeekday(now);
  const force = String(process.env.CLASH_NIGHT_FORCE || "").trim() === "1";
  const disabled = String(process.env.CLASH_NIGHT_DISABLED || "").trim() === "1";
  const allowPreviewEnv = String(process.env.CLASH_NIGHT_ALLOW_PREVIEW || "").trim() === "1";
  const previewOk =
    Boolean(opts?.previewRequest) &&
    (isNonProductionClashPreviewAllowed() || allowPreviewEnv);

  let active = false;
  let reason: ClashNightReason = "off";
  if (disabled) {
    active = false;
    reason = "disabled";
  } else if (force) {
    active = true;
    reason = "force";
  } else if (previewOk) {
    active = true;
    reason = "preview";
  } else if (weekday === "Friday") {
    active = true;
    reason = "friday";
  }

  return {
    active,
    timezone: CLASH_NIGHT_TZ,
    weekday,
    reason,
    nowIso: now.toISOString(),
    rules: {
      pool: CLASH_NIGHT_POOL,
      winBonus: { rankingScoreFlat: CLASH_NIGHT_WIN_RANKING_BONUS },
    },
  };
}

/** Read preview flag from JSON body or `x-clash-night-preview: 1` header. */
export function readClashNightPreviewFlag(req: {
  body?: unknown;
  headers?: Record<string, unknown>;
}): boolean {
  const body = req.body as Record<string, unknown> | undefined;
  const rawBody = body?.clashNightPreview;
  if (rawBody === true || rawBody === 1 || rawBody === "1") return true;
  const h = req.headers?.["x-clash-night-preview"];
  const hv = Array.isArray(h) ? h[0] : h;
  return String(hv ?? "").trim() === "1";
}

/**
 * B — excitement multiplier for one pool candidate (Founder-adjustable constants).
 * Stacks with existing boost / fairness multipliers.
 */
export function clashNightPoolExcitementMul(track: {
  winStreak?: number | null;
  playCount?: number | null;
  createdAt?: Date | string | null;
}): number {
  let m = 1;
  const streak = Number(track.winStreak ?? 0);
  if (Number.isFinite(streak) && streak >= CLASH_NIGHT_POOL.streakMin) {
    m *= CLASH_NIGHT_POOL.streakMul;
  }
  const created = track.createdAt ? new Date(track.createdAt) : null;
  if (created && Number.isFinite(created.getTime())) {
    const ageMs = Date.now() - created.getTime();
    const days = ageMs / (1000 * 60 * 60 * 24);
    if (days >= 0 && days <= CLASH_NIGHT_POOL.recentDays) {
      m *= CLASH_NIGHT_POOL.recentMul;
    }
  }
  const plays = Math.max(0, Number(track.playCount ?? 0));
  const activity =
    1 + Math.min(CLASH_NIGHT_POOL.activityCap, Math.log1p(plays) / CLASH_NIGHT_POOL.activityDiv);
  m *= activity;
  return m;
}
