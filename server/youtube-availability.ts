type YoutubeAvailabilityStatus = "ok" | "blocked" | "unknown";
type YoutubeBlockedReason = "private_or_removed" | "embed_blocked";

export type YoutubeAvailabilityResult =
  | { status: "ok" }
  | { status: "unknown" }
  | { status: "blocked"; reason: YoutubeBlockedReason };

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const YT_FETCH_HEADERS = {
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (compatible; NEX/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
} as const;

function extractYoutubeId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const u = raw.trim();

  const direct = u.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/,
  );
  if (direct?.[1]) return direct[1];

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
    return null;
  }

  return null;
}

function textSuggestsPrivateOrRemoved(html: string): boolean {
  return [
    /this video is private/i,
    /video unavailable/i,
    /this video isn't available anymore/i,
    /this video has been removed/i,
    /watch on youtube/i,
  ].some((re) => re.test(html));
}

function textSuggestsEmbedBlocked(html: string): boolean {
  return [
    /playback on other websites has been disabled by the video owner/i,
    /video owner has not made this video available in your country/i,
    /sign in to confirm your age/i,
    /this video may be inappropriate for some users/i,
  ].some((re) => re.test(html));
}

async function fetchHtml(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number; html: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: YT_FETCH_HEADERS,
    });
    const html = await res.text();
    return { ok: res.ok, status: res.status, html };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchStatus(url: string, timeoutMs = 8000): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: YT_FETCH_HEADERS,
    });
    return res.status;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function inspectYoutubeVideoAvailability(
  inputUrl: string | null | undefined,
): Promise<YoutubeAvailabilityResult> {
  const videoId = extractYoutubeId(inputUrl);
  if (!videoId) return { status: "unknown" };

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  // Current YouTube behavior often returns 401 for public videos here, but 403/404 is a strong
  // signal that the source video is not available for normal public embedding.
  const oembedStatus = await fetchStatus(oembedUrl);
  if (oembedStatus === 403 || oembedStatus === 404) {
    return { status: "blocked", reason: "private_or_removed" };
  }

  const watch = await fetchHtml(watchUrl);
  if (!watch) return { status: "unknown" };
  if (!watch.ok && [403, 404, 410, 451].includes(watch.status)) {
    return { status: "blocked", reason: "private_or_removed" };
  }
  if (textSuggestsPrivateOrRemoved(watch.html)) {
    return { status: "blocked", reason: "private_or_removed" };
  }

  const embed = await fetchHtml(embedUrl);
  if (!embed) return { status: "unknown" };
  if (!embed.ok && [403, 404, 410, 451].includes(embed.status)) {
    return { status: "blocked", reason: "private_or_removed" };
  }
  if (textSuggestsPrivateOrRemoved(embed.html)) {
    return { status: "blocked", reason: "private_or_removed" };
  }
  if (textSuggestsEmbedBlocked(embed.html)) {
    return { status: "blocked", reason: "embed_blocked" };
  }

  const finalStatus: YoutubeAvailabilityStatus = "ok";
  return { status: finalStatus };
}
