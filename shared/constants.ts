/** Max battle votes per listener per UTC day (each completed battle = one vote). */
export const MAX_BATTLE_ROUNDS = 5;

/**
 * Cheer / heart likes: enforced per `(userId, trackId)` on the server (`storage.likeTrack`).
 * Same track: once per UTC calendar day only. Different tracks: no daily cap (many per day OK).
 */
export const LIKES_MAX_PER_TRACK_PER_UTC_DAY = 1;

/** Minimum continuous listen before play count +1 (client timer; server also enforces 10 min / user / track). */
export const LISTEN_PLAY_COUNT_MS = 60_000;

/** List/modal/detail player: auto-cheer (like +1) after this many ms of continuous listen. */
export const LISTEN_CHEER_MS = 60_000;

/** Track ownership provenance for catalog + B2B exports. */
export const TRACK_PROVENANCE_VERIFIED = "verified" as const;
export const TRACK_PROVENANCE_NEX_PICK = "nex_pick" as const;
export type TrackProvenanceStatus = typeof TRACK_PROVENANCE_VERIFIED | typeof TRACK_PROVENANCE_NEX_PICK;

export function normalizeTrackProvenanceStatus(raw: string | null | undefined): TrackProvenanceStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  return s === TRACK_PROVENANCE_NEX_PICK ? TRACK_PROVENANCE_NEX_PICK : TRACK_PROVENANCE_VERIFIED;
}

/** Max simultaneously active (non-archived) tracks per creator. */
export const MAX_ACTIVE_TRACKS_PER_CREATOR = 2;
/** Minimum lifetime before a creator can archive/replace a track. */
export const MIN_ACTIVE_HOURS = 48;
/** Cooldown after archiving before submitting a new active track. */
export const ROTATION_COOLDOWN_HOURS = 24;

/** Min trimmed length for creator track submission “artistic intent & prompt” (anti-spam). */
export const MIN_TRACK_ARTISTIC_INTENT_CHARS = 50;
/** Max length for the same field (matches DB / UI). */
export const MAX_TRACK_ARTISTIC_INTENT_CHARS = 2000;

/** After initial submit, a creator may change artistic intent / prompt at most this many times. */
export const MAX_CREATOR_AI_PROMPT_EDITS = 2;
/** Hours that must pass after the previous creator edit before the next aiPrompt change is allowed (edits 2+). */
export const HOURS_BETWEEN_CREATOR_AI_PROMPT_EDITS = 48;

/** Canonical NEX founder account (Google OAuth email). Override on server with NEX_FOUNDER_ADMIN_EMAIL (comma-separated). */
export const NEX_FOUNDER_ADMIN_EMAIL = "d9ckoblack@gmail.com,kidpink003@gmail.com";

export function normalizeAuthEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** Parse founder admin emails from env or default constant. */
export function parseFounderAdminEmails(configured?: string | null): string[] {
  const raw = (configured ?? NEX_FOUNDER_ADMIN_EMAIL).trim();
  if (!raw) return [];
  return [...new Set(raw.split(",").map(normalizeAuthEmail).filter(Boolean))];
}

/** True when the authenticated user's email is a platform founder (sole admin in production). */
export function isFounderAdminEmail(
  email: string | null | undefined,
  configured?: string | null,
): boolean {
  const list = parseFounderAdminEmails(configured);
  if (!list.length) return false;
  const normalized = normalizeAuthEmail(email);
  if (!normalized) return false;
  return list.includes(normalized);
}

/** Strict RBAC: only `creator` is creator-tier. */
export function isCreatorProfileRole(role: string | null | undefined): boolean {
  return role === "creator";
}

/** Strict RBAC studio access: `creator` or `admin` only. */
export function isCreatorStudioRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "creator";
}

/**
 * Audio tracks in these statuses appear in NEW, Radio, and Battle matching.
 * Music videos use status MV + trackType video and are excluded from battles.
 */
export const BATTLE_AND_NEW_AUDIO_STATUSES = [
  "PUBLISHED",
  "BATTLE_POOL",
  "APPROVED",
  "CHART",
] as const;

export type BattleAndNewAudioStatus = (typeof BATTLE_AND_NEW_AUDIO_STATUSES)[number];

export function isBattleEligibleAudioTrack(track: {
  status?: string | null;
  trackType?: string | null;
}): boolean {
  if (track.trackType === "video") return false;
  const s = (track.status ?? "").trim();
  return (BATTLE_AND_NEW_AUDIO_STATUSES as readonly string[]).includes(s);
}

/** MV chart uses trackType video; ranking is plays/likes/comments only. */
export function isMusicVideoChartTrack(track: { trackType?: string | null }): boolean {
  return track.trackType === "video";
}

/** Same query shape for Music chart, Radio, and any “NEX TOP 100” style list (audio chart). */
export function publicAudioChartSearchParams(limit: number, extra?: Record<string, string>): string {
  const p = new URLSearchParams();
  p.set("sortBy", "rankingScore");
  p.set("limit", String(limit));
  p.set("trackType", "audio");
  if (extra) {
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
  }
  return p.toString();
}
