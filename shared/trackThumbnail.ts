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

export function resolveTrackThumbnailUrl(opts: {
  coverImageUrl?: string | null;
  musicVideoUrl?: string | null;
  mvUrl?: string | null;
  audioUrl?: string | null;
}): string | null {
  const cover = typeof opts.coverImageUrl === "string" ? opts.coverImageUrl.trim() : "";
  if (cover) return cover;

  const mv = opts.musicVideoUrl ?? opts.mvUrl ?? null;
  return youtubeThumbnailFromUrl(mv) ?? youtubeThumbnailFromUrl(opts.audioUrl ?? undefined);
}
