export function extractYoutubeVideoId(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  const m = url.trim().match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

export function youtubeThumbnailFromUrl(url: string | undefined | null): string | null {
  const id = extractYoutubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

const SUNO_COVER_UUID_RE =
  /^\/(?:image_large_|image_)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpe?g|png|webp)$/i;

/**
 * Prefer cdn1 + `image_large_` for Suno CDN covers.
 * cdn2 non-large `image_{uuid}` intermittently returns 403 and breaks list thumbs
 * (and matches the asset Suno’s own embed uses as the initial `<img src>`).
 */
export function normalizeSunoCoverImageUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return trimmed;

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  if (!host.endsWith(".suno.ai") && host !== "suno.ai") return trimmed;

  const m = parsed.pathname.match(SUNO_COVER_UUID_RE);
  if (!m) {
    if (host === "cdn2.suno.ai") {
      parsed.hostname = "cdn1.suno.ai";
      return parsed.href;
    }
    return trimmed;
  }

  const uuid = m[1].toLowerCase();
  const extRaw = m[2].toLowerCase();
  const ext = extRaw === "jpg" ? "jpeg" : extRaw;
  return `https://cdn1.suno.ai/image_large_${uuid}.${ext}`;
}

export function resolveTrackThumbnailUrl(opts: {
  coverImageUrl?: string | null;
  musicVideoUrl?: string | null;
  mvUrl?: string | null;
  audioUrl?: string | null;
}): string | null {
  const cover = typeof opts.coverImageUrl === "string" ? opts.coverImageUrl.trim() : "";
  if (cover) return normalizeSunoCoverImageUrl(cover) ?? cover;

  const mv = opts.musicVideoUrl ?? opts.mvUrl ?? null;
  return youtubeThumbnailFromUrl(mv) ?? youtubeThumbnailFromUrl(opts.audioUrl ?? undefined);
}
