/**
 * Resolve a playable Suno media URL without the Clerk /embed iframe.
 * Uses the public studio clip API (no auth) and prefers unsigned MP4 video_url,
 * then progressive media_urls (m4a-opus). Direct cdn1 *.mp3 is usually signed/403.
 */

import { extractSunoSongUuidFromUrlString, resolveSunoShareToSongUuid } from "./suno-resolve";

const SUNO_CLIP_API = "https://studio-api-prod.suno.com/api/clip";
const SUNO_FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (compatible; NEX/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Origin: "https://suno.com",
  Referer: "https://suno.com/",
} as const;

export type SunoPlayableKind = "video" | "audio";

export type SunoPlayableMedia = {
  songUuid: string;
  kind: SunoPlayableKind;
  /** Upstream CDN / CloudFront URL (server may proxy this). */
  upstreamUrl: string;
  contentType: string;
  source: "video_url" | "media_mp3" | "media_m4a" | "cdn_mp4";
  durationSeconds: number | null;
  title: string | null;
};

type ClipMediaUrl = {
  url?: string;
  content_type?: string;
  delivery?: string;
};

type SunoClipPayload = {
  id?: string;
  title?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  media_urls?: ClipMediaUrl[] | null;
  metadata?: { duration?: number | null } | null;
};

const CLIP_CACHE_MAX = 400;
const clipCache = new Map<string, { at: number; clip: SunoClipPayload }>();
const CLIP_CACHE_TTL_MS = 10 * 60 * 1000;

function cacheGet(uuid: string): SunoClipPayload | null {
  const hit = clipCache.get(uuid);
  if (!hit) return null;
  if (Date.now() - hit.at > CLIP_CACHE_TTL_MS) {
    clipCache.delete(uuid);
    return null;
  }
  return hit.clip;
}

function cacheSet(uuid: string, clip: SunoClipPayload): void {
  if (clipCache.size >= CLIP_CACHE_MAX) {
    const first = clipCache.keys().next().value;
    if (first) clipCache.delete(first);
  }
  clipCache.set(uuid, { at: Date.now(), clip });
}

function isHttpUrl(raw: string | null | undefined): raw is string {
  if (!raw?.trim()) return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function isForbiddenAudioUrl(url: string): boolean {
  return /\/api\/forbidden\b/i.test(url) || /audio_url.*forbidden/i.test(url);
}

function isAllowedUpstreamHost(host: string): boolean {
  const h = host.replace(/^www\./i, "").toLowerCase();
  if (h === "suno.com" || h === "suno.ai") return true;
  if (h.endsWith(".suno.com") || h.endsWith(".suno.ai")) return true;
  if (h.endsWith(".cloudfront.net")) return true;
  return false;
}

/** Exported for tests — pick best in-app source from a clip JSON blob. */
export function pickPlayableFromClip(clip: SunoClipPayload, songUuid: string): SunoPlayableMedia | null {
  const uuid = (clip.id || songUuid).trim().toLowerCase();
  if (!uuid) return null;

  const durationRaw = clip.metadata?.duration;
  const durationSeconds =
    typeof durationRaw === "number" && Number.isFinite(durationRaw) && durationRaw > 0
      ? Math.round(durationRaw)
      : null;
  const title = typeof clip.title === "string" && clip.title.trim() ? clip.title.trim() : null;

  const videoUrl = typeof clip.video_url === "string" ? clip.video_url.trim() : "";
  if (isHttpUrl(videoUrl) && !isForbiddenAudioUrl(videoUrl)) {
    return {
      songUuid: uuid,
      kind: "video",
      upstreamUrl: videoUrl,
      contentType: "video/mp4",
      source: "video_url",
      durationSeconds,
      title,
    };
  }

  const media = Array.isArray(clip.media_urls) ? clip.media_urls : [];
  const mp3 = media.find(
    (m) =>
      typeof m?.url === "string" &&
      isHttpUrl(m.url) &&
      !isForbiddenAudioUrl(m.url) &&
      String(m.content_type || "").toLowerCase() === "mp3",
  );
  if (mp3?.url) {
    return {
      songUuid: uuid,
      kind: "audio",
      upstreamUrl: mp3.url.trim(),
      contentType: "audio/mpeg",
      source: "media_mp3",
      durationSeconds,
      title,
    };
  }

  const m4a = media.find(
    (m) =>
      typeof m?.url === "string" &&
      isHttpUrl(m.url) &&
      !isForbiddenAudioUrl(m.url) &&
      /m4a/i.test(String(m.content_type || "")),
  );
  if (m4a?.url) {
    return {
      songUuid: uuid,
      kind: "audio",
      upstreamUrl: m4a.url.trim(),
      contentType: "audio/mp4",
      source: "media_m4a",
      durationSeconds,
      title,
    };
  }

  // Last resort: unsigned social MP4 often exists even when video_url is blank.
  const cdnMp4 = `https://cdn1.suno.ai/${uuid}.mp4`;
  return {
    songUuid: uuid,
    kind: "video",
    upstreamUrl: cdnMp4,
    contentType: "video/mp4",
    source: "cdn_mp4",
    durationSeconds,
    title,
  };
}

export async function fetchSunoClipJson(songUuid: string): Promise<SunoClipPayload | null> {
  const uuid = songUuid.trim().toLowerCase();
  if (!extractSunoSongUuidFromUrlString(`https://suno.com/song/${uuid}`)) return null;

  const cached = cacheGet(uuid);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${SUNO_CLIP_API}/${uuid}/`, {
      method: "GET",
      signal: controller.signal,
      headers: SUNO_CLIP_HEADERS_JSON(),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as SunoClipPayload;
    if (!json || typeof json !== "object") return null;
    cacheSet(uuid, json);
    return json;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function SUNO_CLIP_HEADERS_JSON(): Record<string, string> {
  return { ...SUNO_FETCH_HEADERS };
}

export async function resolveSunoPlayableMedia(
  inputUrlOrUuid: string,
): Promise<SunoPlayableMedia | null> {
  const raw = inputUrlOrUuid.trim();
  if (!raw) return null;

  let uuid: string | null = null;
  if (extractSunoSongUuidFromUrlString(`https://suno.com/song/${raw}`)) {
    uuid = raw.toLowerCase();
  } else {
    uuid =
      extractSunoSongUuidFromUrlString(raw) ||
      (await resolveSunoShareToSongUuid(raw));
  }
  if (!uuid) return null;

  const clip = await fetchSunoClipJson(uuid);
  if (!clip) return null;
  return pickPlayableFromClip(clip, uuid);
}

/** HEAD/GET probe — drop synthetic cdn_mp4 if upstream is not reachable. */
export async function resolveSunoPlayableMediaVerified(
  inputUrlOrUuid: string,
): Promise<SunoPlayableMedia | null> {
  const picked = await resolveSunoPlayableMedia(inputUrlOrUuid);
  if (!picked) return null;

  if (picked.source !== "cdn_mp4") return picked;

  const ok = await probeUpstreamReachable(picked.upstreamUrl);
  if (ok) return picked;

  // Fall back: only m4a/mp3 from the same clip (already preferred above if present).
  const clip = await fetchSunoClipJson(picked.songUuid);
  if (!clip) return null;
  const media = Array.isArray(clip.media_urls) ? clip.media_urls : [];
  const m4a = media.find(
    (m) =>
      typeof m?.url === "string" &&
      isHttpUrl(m.url) &&
      !isForbiddenAudioUrl(m.url) &&
      /m4a/i.test(String(m.content_type || "")),
  );
  if (!m4a?.url) return null;
  return {
    ...picked,
    kind: "audio",
    upstreamUrl: m4a.url.trim(),
    contentType: "audio/mp4",
    source: "media_m4a",
  };
}

async function probeUpstreamReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        ...SUNO_FETCH_HEADERS,
        Accept: "*/*",
      },
    });
    if (head.ok || head.status === 206) return true;
    // Some CDNs reject HEAD — try a tiny ranged GET.
    const get = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        ...SUNO_FETCH_HEADERS,
        Accept: "*/*",
        Range: "bytes=0-64",
      },
    });
    return get.ok || get.status === 206;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function assertAllowedSunoUpstream(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (!isAllowedUpstreamHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function sunoUpstreamFetchHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    ...SUNO_FETCH_HEADERS,
    Accept: "*/*",
    ...extra,
  };
}
