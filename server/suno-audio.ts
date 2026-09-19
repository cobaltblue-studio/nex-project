/**
 * Resolve a playable Suno media URL without the Clerk /embed iframe.
 * Uses the public studio clip API (no auth) and prefers unsigned MP4 video_url,
 * then browser-native mp3. Progressive CloudFront m4a-opus (encoding 1.0.0) is
 * encrypted/custom and is NOT HTMLAudio/Video-playable — never treat HTTP 200 alone as success.
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
  encoding?: string;
};

/** True when the first bytes look like a browser-native media container (not Suno ciphertext). */
export function looksLikeBrowserMediaBytes(buf: ArrayBuffer | Uint8Array | Buffer): boolean {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (u8.length < 12) return false;
  // ISO BMFF (mp4 / m4a / mov): size + 'ftyp'
  if (u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70) return true;
  // ID3 / MP3
  if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) return true;
  if (u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0) return true;
  // Ogg
  if (u8[0] === 0x4f && u8[1] === 0x67 && u8[2] === 0x67 && u8[3] === 0x53) return true;
  // RIFF / WAV / AVI
  if (u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46) return true;
  // WebM / Matroska EBML
  if (u8[0] === 0x1a && u8[1] === 0x45 && u8[2] === 0xdf && u8[3] === 0xa3) return true;
  return false;
}

export function contentTypeFromMediaMagic(buf: ArrayBuffer | Uint8Array | Buffer, fallback: string): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (u8.length >= 8 && u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70) {
    const brand = String.fromCharCode(u8[8], u8[9], u8[10], u8[11]).toLowerCase();
    if (brand.startsWith("iso") || brand.startsWith("mp4") || brand.includes("avc") || brand === "dash") {
      return "video/mp4";
    }
    if (brand.startsWith("m4a") || brand.includes("mp4a")) return "audio/mp4";
    return fallback.includes("video") ? "video/mp4" : "audio/mp4";
  }
  if (u8.length >= 3 && u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) return "audio/mpeg";
  if (u8.length >= 2 && u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0) return "audio/mpeg";
  if (u8.length >= 4 && u8[0] === 0x4f && u8[1] === 0x67 && u8[2] === 0x67 && u8[3] === 0x53) {
    return "audio/ogg";
  }
  return fallback || "application/octet-stream";
}

type SunoClipPayload = {
  id?: string;
  title?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  media_urls?: ClipMediaUrl[] | null;
  /** When false, CDN social MP3/MP4 are typically 403 — only encrypted progressive m4a remains. */
  is_public?: boolean | null;
  metadata?: { duration?: number | null } | null;
};

export type SunoResolveFailureCode = "NO_PUBLIC_STREAM" | "SUNO_PRIVATE";

/** Why resolveSunoPlayableMediaVerified returned null (best-effort; for API messages). */
export async function diagnoseSunoResolveFailure(
  inputUrlOrUuid: string,
): Promise<SunoResolveFailureCode> {
  const raw = inputUrlOrUuid.trim();
  if (!raw) return "NO_PUBLIC_STREAM";

  let uuid: string | null = null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    uuid = raw.toLowerCase();
  } else {
    uuid =
      extractSunoSongUuidFromUrlString(raw) ||
      (await resolveSunoShareToSongUuid(raw));
  }
  if (!uuid) return "NO_PUBLIC_STREAM";

  const clip = await fetchSunoClipJson(uuid);
  if (clip && clip.is_public === false) return "SUNO_PRIVATE";
  return "NO_PUBLIC_STREAM";
}

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

  // Skip encoded progressive m4a-opus (Suno ciphertext). Plain m4a without encoding may still work.
  const m4a = media.find((m) => {
    if (typeof m?.url !== "string" || !isHttpUrl(m.url) || isForbiddenAudioUrl(m.url)) return false;
    const ct = String(m.content_type || "").toLowerCase();
    if (!/m4a/.test(ct)) return false;
    const enc = String(m.encoding || "").trim();
    // encoding 1.0.0 (and similar) = custom encrypted progressive — not HTML-playable
    if (enc && enc !== "0") return false;
    return true;
  });
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
  // Bare UUID (no scheme/path) vs full share URL
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    uuid = raw.toLowerCase();
  } else {
    uuid =
      extractSunoSongUuidFromUrlString(raw) ||
      (await resolveSunoShareToSongUuid(raw));
  }
  if (!uuid) return null;

  const clip = await fetchSunoClipJson(uuid);
  if (clip) {
    const fromClip = pickPlayableFromClip(clip, uuid);
    if (fromClip && fromClip.source !== "cdn_mp4") return fromClip;
    if (fromClip) return fromClip;
  }

  // Studio clip API may be unreachable from some hosts — still try known public CDN shapes.
  return {
    songUuid: uuid,
    kind: "video",
    upstreamUrl: `https://cdn1.suno.ai/${uuid}.mp4`,
    contentType: "video/mp4",
    source: "cdn_mp4",
    durationSeconds: null,
    title: null,
  };
}

/** Probe candidates until one responds 200/206 with browser-native media magic. */
export async function resolveSunoPlayableMediaVerified(
  inputUrlOrUuid: string,
): Promise<SunoPlayableMedia | null> {
  const picked = await resolveSunoPlayableMedia(inputUrlOrUuid);
  if (!picked) return null;

  const uuid = picked.songUuid;
  const candidates: SunoPlayableMedia[] = [];

  const pushUnique = (item: SunoPlayableMedia | null) => {
    if (!item) return;
    if (candidates.some((c) => c.upstreamUrl === item.upstreamUrl)) return;
    candidates.push(item);
  };

  // Prefer API-derived non-synthetic picks first
  if (picked.source !== "cdn_mp4") pushUnique(picked);

  const clip = await fetchSunoClipJson(uuid);
  if (clip) {
    const videoUrl = typeof clip.video_url === "string" ? clip.video_url.trim() : "";
    if (isHttpUrl(videoUrl) && !isForbiddenAudioUrl(videoUrl)) {
      pushUnique({
        songUuid: uuid,
        kind: "video",
        upstreamUrl: videoUrl,
        contentType: "video/mp4",
        source: "video_url",
        durationSeconds: picked.durationSeconds,
        title: picked.title,
      });
    }
    const media = Array.isArray(clip.media_urls) ? clip.media_urls : [];
    for (const m of media) {
      if (typeof m?.url !== "string" || !isHttpUrl(m.url) || isForbiddenAudioUrl(m.url)) continue;
      const ct = String(m.content_type || "").toLowerCase();
      const enc = String(m.encoding || "").trim();
      if (ct === "mp3") {
        pushUnique({
          songUuid: uuid,
          kind: "audio",
          upstreamUrl: m.url.trim(),
          contentType: "audio/mpeg",
          source: "media_mp3",
          durationSeconds: picked.durationSeconds,
          title: picked.title,
        });
      } else if (/m4a/.test(ct) && (!enc || enc === "0")) {
        pushUnique({
          songUuid: uuid,
          kind: "audio",
          upstreamUrl: m.url.trim(),
          contentType: "audio/mp4",
          source: "media_m4a",
          durationSeconds: picked.durationSeconds,
          title: picked.title,
        });
      }
    }
  }

  // Deterministic public patterns (no API required). Do NOT probe encoded CloudFront m4a —
  // it returns HTTP 200 ciphertext that browsers cannot decode.
  pushUnique({
    songUuid: uuid,
    kind: "video",
    upstreamUrl: `https://cdn1.suno.ai/${uuid}.mp4`,
    contentType: "video/mp4",
    source: "cdn_mp4",
    durationSeconds: picked.durationSeconds,
    title: picked.title,
  });
  pushUnique({
    songUuid: uuid,
    kind: "audio",
    upstreamUrl: `https://cdn1.suno.ai/${uuid}.mp3`,
    contentType: "audio/mpeg",
    source: "media_mp3",
    durationSeconds: picked.durationSeconds,
    title: picked.title,
  });

  for (const candidate of candidates) {
    if (await probeUpstreamReachable(candidate.upstreamUrl)) {
      return candidate;
    }
  }
  // Never return unverified ciphertext / 403 CDN guesses.
  return null;
}

async function probeUpstreamReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const get = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        ...SUNO_FETCH_HEADERS,
        Accept: "*/*",
        Range: "bytes=0-63",
      },
    });
    if (!(get.ok || get.status === 206)) return false;
    const buf = Buffer.from(await get.arrayBuffer());
    return looksLikeBrowserMediaBytes(buf);
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
