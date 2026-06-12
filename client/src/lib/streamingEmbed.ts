/** Shared SoundCloud / Suno / Vimeo / YouTube embed URL building for track players. */

export type StreamingSourceKind = "youtube" | "soundcloud" | "suno" | "vimeo" | "udio" | "other";

export function urlLooksLikeSoundCloudShare(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  return /soundcloud\.com|on\.soundcloud\.com/i.test(url.trim());
}

/**
 * SoundCloud widget needs a track/set permalink — not profile, widget src, or discover URLs.
 * Returns null for on.soundcloud.com short links (use `/api/soundcloud/resolve`).
 */
export function normalizeSoundCloudPermalink(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  let url = normalizeStreamingUrl(raw.trim());

  if (/w\.soundcloud\.com\/player/i.test(url)) {
    try {
      const inner = new URL(url).searchParams.get("url");
      if (inner) return normalizeSoundCloudPermalink(inner);
    } catch {
      return null;
    }
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, "").replace(/^m\./i, "").toLowerCase();
  if (host === "on.soundcloud.com") return null;
  if (host !== "soundcloud.com") return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const blocked = new Set(["discover", "stream", "search", "tags", "you", "feed", "pages"]);
  if (blocked.has(segments[0].toLowerCase())) return null;

  return `https://soundcloud.com${parsed.pathname}`;
}

export function buildSoundCloudPlayerSrc(
  rawUrl: string | undefined | null,
  opts: { autoplay?: boolean; embedSeekSeconds?: number } = {},
): string | null {
  const permalink = normalizeSoundCloudPermalink(rawUrl);
  if (!permalink) return null;
  const autoplay = !!opts.autoplay;
  const seekSec =
    typeof opts.embedSeekSeconds === "number" && opts.embedSeekSeconds > 0
      ? opts.embedSeekSeconds
      : 0;
  const ap = autoplay ? "1" : "0";
  const timedUrl = seekSec > 0 ? withDeepLinkTime(permalink, seekSec) : permalink;
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(timedUrl)}&color=%2300f0ff&auto_play=${ap}&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=true`;
}

export function classifyStreamingSource(url: string | undefined | null): StreamingSourceKind {
  if (!url?.trim()) return "other";
  const u = url.trim();
  if (/youtu\.be|youtube\.com/i.test(u)) return "youtube";
  if (urlLooksLikeSoundCloudShare(u)) return "soundcloud";
  if (urlLooksLikeSunoShare(u)) return "suno";
  if (/vimeo\.com/i.test(u)) return "vimeo";
  if (/udio\.com/i.test(u)) return "udio";
  return "other";
}

/** True for suno.com / *.suno.ai share links (substring + proper hostname). */
export function urlLooksLikeSunoShare(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  if (/suno\.(com|ai)/i.test(u)) return true;
  try {
    const h = new URL(normalizeStreamingUrl(u)).hostname.replace(/^www\./i, "").toLowerCase();
    return h.endsWith(".suno.com") || h.endsWith(".suno.ai");
  } catch {
    return false;
  }
}

const SUNO_SONG_UUID_RE_STRICT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Suno iframe /embed/{id} only accepts the real song UUID, not /s/ short codes. */
export function isSunoSongUuid(id: string | undefined | null): boolean {
  if (!id?.trim()) return false;
  return SUNO_SONG_UUID_RE_STRICT.test(id.trim());
}

/** Suno share links use app.suno.ai, music.suno.ai, etc. — not only suno.com / suno.ai. */
function isSunoHostname(host: string): boolean {
  const h = host.replace(/^www\./i, "").toLowerCase();
  if (h === "suno.com" || h === "suno.ai") return true;
  return h.endsWith(".suno.com") || h.endsWith(".suno.ai");
}

function normalizeStreamingUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (!/^https?:\/\//i.test(t)) return `https://${t}`;
  return t;
}

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Loose ID check: Suno uses UUIDs, short codes, and opaque tokens in paths/query. */
function isPlausibleSunoId(segment: string): boolean {
  const s = segment.trim();
  if (s.length < 4 || s.length > 128) return false;
  if (/[/?#<>"']/.test(s)) return false;
  return true;
}

/**
 * Pull a song/share id from any Suno URL shape (share page, short /s/, embed, query params).
 * Used so the iframe always gets https://suno.com/embed/{id} — the share URL itself is not embeddable.
 */
function extractSunoSongId(raw: string): string | null {
  const urlStr = normalizeStreamingUrl(raw);
  if (!urlStr) return null;

  // Host-agnostic patterns (handles app.suno.ai, music.suno.ai, suno.com, etc.)
  const sunoHost = String.raw`(?:[a-z0-9-]+\.)*suno\.(?:com|ai)`;
  const stringPatterns: RegExp[] = [
    new RegExp(`${sunoHost}/(?:embed|song)/([^/?#]+)`, "i"),
    new RegExp(`${sunoHost}/s/([^/?#]+)`, "i"),
  ];
  for (const re of stringPatterns) {
    const m = urlStr.match(re);
    if (!m?.[1]) continue;
    const id = safeDecodeURIComponent(m[1].trim());
    if (isPlausibleSunoId(id)) return id;
  }

  try {
    const u = new URL(urlStr);
    const h = u.hostname.replace(/^www\./i, "");
    if (!isSunoHostname(h)) return null;

    for (const key of ["song", "songId", "id", "s"]) {
      const qp = u.searchParams.get(key);
      if (qp && isPlausibleSunoId(qp)) return qp.trim();
    }

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" && parts[1] && isPlausibleSunoId(parts[1])) return parts[1];
    const songAt = parts.indexOf("song");
    if (songAt !== -1 && parts[songAt + 1] && isPlausibleSunoId(parts[songAt + 1])) return parts[songAt + 1];
    const sAt = parts.indexOf("s");
    if (sAt !== -1 && parts[sAt + 1] && parts[sAt + 1] !== "song" && isPlausibleSunoId(parts[sAt + 1])) {
      return parts[sAt + 1];
    }
    const dAt = parts.indexOf("d");
    if (dAt !== -1 && parts[dAt + 1] && isPlausibleSunoId(parts[dAt + 1])) return parts[dAt + 1];
  } catch {
    return null;
  }
  return null;
}

function safariLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|chromium|crios|android/i.test(ua);
}

/** Build embed URL when the song UUID is already known (e.g. after `/api/suno/resolve`). */
export function buildSunoEmbedFromCanonicalUuid(songUuid: string, autoplay = false): string | null {
  if (!isSunoSongUuid(songUuid)) return null;
  const ap = autoplay && !safariLike() ? "1" : "0";
  return `https://suno.com/embed/${songUuid.trim().toLowerCase()}?autoplay=${ap}`;
}

/**
 * Sync-only: resolves share URLs that already contain `/song/{uuid}`.
 * Short links (`/s/…`) return null — use `/api/suno/resolve` + `buildSunoEmbedFromCanonicalUuid`.
 */
export function buildSunoEmbedIframeSrc(
  rawUrl: string | undefined | null,
  autoplay = false,
): string | null {
  if (!rawUrl?.trim()) return null;
  const sunoId = extractSunoSongId(rawUrl);
  if (!sunoId || !isSunoSongUuid(sunoId)) return null;
  return buildSunoEmbedFromCanonicalUuid(sunoId, autoplay);
}

/**
 * Build an iframe `src` for third-party streaming (and YouTube when not using the JS API player).
 */
function withDeepLinkTime(url: string, seconds: number): string {
  if (!url.trim() || !Number.isFinite(seconds) || seconds <= 0) return url;
  const t = Math.floor(seconds);
  const noHash = url.split("#")[0];
  return `${noHash}#t=${t}s`;
}

export function buildStreamingIframeSrc(
  rawUrl: string | undefined | null,
  opts: { autoplay?: boolean; enableJsApi?: boolean; embedSeekSeconds?: number } = {},
): string | null {
  if (!rawUrl?.trim()) return null;
  const url = normalizeStreamingUrl(rawUrl);
  const autoplay = !!opts.autoplay;
  const enableJsApi = !!opts.enableJsApi;
  const seekSec =
    typeof opts.embedSeekSeconds === "number" && opts.embedSeekSeconds > 0
      ? opts.embedSeekSeconds
      : 0;

  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/,
  );
  if (ytMatch) {
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      rel: "0",
      modestbranding: "1",
      controls: "1",
      showinfo: "0",
      disablekb: enableJsApi ? "1" : "0",
      fs: "1",
    });
    if (enableJsApi && typeof window !== "undefined") {
      params.set("enablejsapi", "1");
      params.set("origin", window.location.origin);
    }
    return `https://www.youtube.com/embed/${ytMatch[1]}?${params.toString()}`;
  }

  const sunoSrc = buildSunoEmbedIframeSrc(url, autoplay);
  if (sunoSrc) return sunoSrc;
  if (urlLooksLikeSunoShare(url)) return null;

  if (urlLooksLikeSoundCloudShare(url)) {
    return buildSoundCloudPlayerSrc(url, { autoplay, embedSeekSeconds: seekSec });
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    const base = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    const q = autoplay ? "?autoplay=1" : "";
    const hash = seekSec > 0 ? `#t=${Math.floor(seekSec)}s` : "";
    return `${base}${q}${hash}`;
  }

  if (/udio\.com/i.test(url)) return url;

  return url;
}

/**
 * Legacy helper — prefer `usePlayableStreamingSrc` for Suno (short links need `/api/suno/resolve`).
 * Suno share URLs without a resolvable UUID return "" so the iframe is not pointed at a blocked page.
 */
export function buildIframeEmbedUrl(url: string, autoplay = false): string {
  const built = buildStreamingIframeSrc(url, { autoplay });
  if (built !== null) return built;
  if (urlLooksLikeSunoShare(url)) return "";
  return url;
}
