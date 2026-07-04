import type { Profile } from "@shared/schema";
import { normalizeStoredTrackLink } from "@shared/normalizeTrackLink";

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
