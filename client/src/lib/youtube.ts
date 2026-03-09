// Extract YouTube video ID from any YouTube URL format
export function extractYoutubeId(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Build a plain iframe embed URL (for non-YouTube platforms)
export function buildIframeEmbedUrl(url: string, autoplay = false): string {
  if (url.includes("suno.com")) {
    const base = url.replace("/song/", "/embed/");
    return autoplay ? `${base}?autoplay=1` : base;
  }
  if (url.includes("soundcloud.com") && !url.includes("w.soundcloud.com")) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%2300f0ff&auto_play=${autoplay}&hide_related=true&show_comments=false`;
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}${autoplay ? "?autoplay=1" : ""}`;
  return url;
}
