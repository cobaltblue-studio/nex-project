const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Extract YouTube video ID from common share / watch URL shapes. */
export function extractYoutubeId(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();

  const direct = u.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/,
  );
  if (direct?.[1]) return direct[1];

  const music = u.match(/music\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/);
  if (music?.[1]) return music[1];

  try {
    const parsed = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id && YT_ID_RE.test(id)) return id;
    }
    if (host.endsWith("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v && YT_ID_RE.test(v)) return v;
    }
  } catch {
    /* ignore malformed URLs */
  }

  return null;
}
