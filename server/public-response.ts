import type { Profile } from "@shared/schema";
import { normalizeStoredTrackLink } from "@shared/normalizeTrackLink";
import { normalizeSoundCloudPermalink } from "@shared/soundcloudPermalink";
import { resolveSoundCloudShareToPermalink } from "./soundcloud-resolve";
import { resolveSunoShareToSongUuid } from "./suno-resolve";

const SUNO_SONG_UUID_IN_URL =
  /\/song\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Public track payload sanitizer (keeps artistic intent/prompt for UI storytelling). */
type PublicTrackLike = Record<string, unknown> & {
  audioUrl?: unknown;
  mvUrl?: unknown;
  musicVideoUrl?: unknown;
};

export function sanitizePublicTrack<T extends PublicTrackLike>(t: T): T {
  const out: PublicTrackLike = { ...t };
  if (typeof out.audioUrl === "string") {
    const n = normalizeStoredTrackLink(out.audioUrl);
    if (n) out.audioUrl = n;
  }
  if (typeof out.mvUrl === "string") {
    const n = normalizeStoredTrackLink(out.mvUrl);
    if (n) out.mvUrl = n;
  }
  if (typeof out.musicVideoUrl === "string") {
    const n = normalizeStoredTrackLink(out.musicVideoUrl);
    if (n) out.musicVideoUrl = n;
  } else if (typeof out.mvUrl === "string" && out.mvUrl) {
    out.musicVideoUrl = out.mvUrl;
  }
  return out as T;
}

export function sanitizePublicProfileForDirectory(p: Profile): Omit<Profile, "userId"> {
  const { userId: _u, ...rest } = p;
  return rest as Omit<Profile, "userId">;
}

export function sanitizePublicProfileDetail(
  full: Profile & { tracks: unknown[]; followerCount?: number },
): Omit<typeof full, "userId"> {
  const { userId: _u, tracks, ...rest } = full;
  const safeTracks = Array.isArray(tracks)
    ? tracks.map((t) =>
        t && typeof t === "object" ? sanitizePublicTrack(t as Record<string, unknown>) : t,
      )
    : tracks;
  return { ...rest, tracks: safeTracks } as Omit<typeof full, "userId">;
}

/** Single track detail (`getTrack`) with nested `creator` profile. */
export function sanitizeTrackDetailForPublic(t: Record<string, unknown>): Record<string, unknown> {
  const { creator, ...rest } = t;
  const base = sanitizePublicTrack(rest);
  if (creator && typeof creator === "object") {
    const { userId: _u, ...cPub } = creator as Record<string, unknown>;
    return { ...base, creator: cPub };
  }
  return base;
}

export function sanitizeBattleForPublic(battle: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!battle) return null;
  const out = { ...battle };
  for (const key of ["trackA", "trackB"] as const) {
    const tr = out[key];
    if (tr && typeof tr === "object") {
      out[key] = sanitizePublicTrack(tr as Record<string, unknown>);
    }
  }
  return out;
}

function sunoShareNeedsResolve(url: string): boolean {
  if (!/suno\.(com|ai)/i.test(url)) return false;
  return !SUNO_SONG_UUID_IN_URL.test(url);
}

function soundCloudShareNeedsResolve(url: string): boolean {
  if (normalizeSoundCloudPermalink(url)) return false;
  return /soundcloud\.com|on\.soundcloud\.com/i.test(url);
}

async function resolvePublicStreamUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (sunoShareNeedsResolve(trimmed)) {
    const uuid = await resolveSunoShareToSongUuid(trimmed);
    if (uuid) return `https://suno.com/song/${uuid}`;
  }

  if (soundCloudShareNeedsResolve(trimmed)) {
    const permalink = await resolveSoundCloudShareToPermalink(trimmed);
    if (permalink) return permalink;
  }

  return trimmed;
}

/** Resolve Suno /s/… and SoundCloud short links so clients can embed synchronously (battle arena). */
export async function enrichPublicTrackPlaybackUrls<T extends PublicTrackLike>(
  t: T,
): Promise<T> {
  const out = sanitizePublicTrack(t);
  for (const key of ["audioUrl", "mvUrl", "musicVideoUrl"] as const) {
    const raw = out[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    out[key] = await resolvePublicStreamUrl(raw);
  }
  if (typeof out.mvUrl === "string" && out.mvUrl && !out.musicVideoUrl) {
    out.musicVideoUrl = out.mvUrl;
  }
  return out as T;
}

export async function enrichTrackDetailForPublic(
  t: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { creator, ...rest } = t;
  const base = await enrichPublicTrackPlaybackUrls(rest);
  if (creator && typeof creator === "object") {
    const { userId: _u, ...cPub } = creator as Record<string, unknown>;
    return { ...base, creator: cPub };
  }
  return base;
}

export async function enrichBattleForPublic(
  battle: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> {
  if (!battle) return null;
  const out = { ...battle };
  for (const key of ["trackA", "trackB"] as const) {
    const tr = out[key];
    if (tr && typeof tr === "object") {
      out[key] = await enrichPublicTrackPlaybackUrls(tr as Record<string, unknown>);
    }
  }
  return out;
}
