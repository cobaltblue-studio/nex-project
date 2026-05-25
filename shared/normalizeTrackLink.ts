import { normalizeSoundCloudPermalink, urlLooksLikeSoundCloudShare } from "./soundcloudPermalink";

/** Canonical track/stream URL for storage and embed (strips SoundCloud tracking query params). */
export function normalizeStoredTrackLink(url: string | null | undefined): string | null {
  if (url == null) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (urlLooksLikeSoundCloudShare(trimmed)) {
    return normalizeSoundCloudPermalink(trimmed) ?? trimmed;
  }
  return trimmed;
}
