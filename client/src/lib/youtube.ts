// Extract YouTube video ID from any YouTube URL format
export function extractYoutubeId(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export { buildIframeEmbedUrl } from "./streamingEmbed";
