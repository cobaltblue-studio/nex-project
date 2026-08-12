type YoutubeAvailabilityStatus = "ok" | "blocked" | "unknown";
type YoutubeBlockedReason = "private_or_removed" | "embed_blocked";

export type YoutubeAvailabilityResult =
  | { status: "ok" }
  | { status: "unknown" }
  | { status: "blocked"; reason: YoutubeBlockedReason };

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Real browser UA — YouTube often serves bot/consent shells to custom "compatible; Bot" agents. */
const YT_FETCH_HEADERS = {
  Accept: "text/html,application/xhtml+xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

function parsePlayability(html: string): {
  status: string | null;
  playableInEmbed: boolean | null;
} {
  const statusMatch = html.match(
    /"playabilityStatus"\s*:\s*\{[^}]*?"status"\s*:\s*"(OK|ERROR|UNPLAYABLE|LOGIN_REQUIRED|LIVE_STREAM_OFFLINE)"/i,
  );
  const embedMatch = html.match(/"playableInEmbed"\s*:\s*(true|false)/i);
  return {
    status: statusMatch?.[1]?.toUpperCase() ?? null,
    playableInEmbed: embedMatch ? embedMatch[1].toLowerCase() === "true" : null,
  };
}

/** High-confidence unavailable phrases only — avoid loose UI copy like "Watch on YouTube". */
function textSuggestsPrivateOrRemoved(html: string): boolean {
  return [
    /this video is private/i,
    /video unavailable\.?\s*this video is private/i,
    /this video isn't available anymore/i,
    /this video has been removed/i,
    /"reason"\s*:\s*"This video is private"/i,
    /"status"\s*:\s*"ERROR"[^}]{0,120}"reason"\s*:\s*"[^"]*private/i,
  ].some((re) => re.test(html));
}

function textSuggestsEmbedBlocked(html: string): boolean {
  return [
    /playback on other websites has been disabled by the video owner/i,
    /video owner has not made this video available in your country/i,
    /sign in to confirm your age/i,
    /this video may be inappropriate for some users/i,
    /"playableInEmbed"\s*:\s*false/i,
  ].some((re) => re.test(html));
}

async function fetchHtml(
  url: string,
  timeoutMs = 10000,
): Promise<{ ok: boolean; status: number; html: string } | null> {
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

async function fetchOembed(
  watchUrl: string,
  timeoutMs = 10000,
): Promise<{ status: number; okJson: boolean } | null> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(oembedUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: YT_FETCH_HEADERS,
    });
    if (!res.ok) return { status: res.status, okJson: false };
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { title?: unknown };
      return { status: res.status, okJson: typeof json?.title === "string" && json.title.length > 0 };
    } catch {
      return { status: res.status, okJson: false };
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Decide whether a YouTube URL is usable as a NEX track source.
 * Prefer structured signals (oEmbed / playabilityStatus) over loose HTML phrase matching —
 * YouTube pages embed i18n/UI strings that caused false "private/removed" rejects.
 */
export async function inspectYoutubeVideoAvailability(
  inputUrl: string | null | undefined,
): Promise<YoutubeAvailabilityResult> {
  const videoId = extractYoutubeId(inputUrl);
  if (!videoId) return { status: "unknown" };

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  // oEmbed 200 + title is the strongest "publicly known video" signal.
  // (Some environments still get 401 on oEmbed for public videos — treat that as inconclusive.)
  const oembed = await fetchOembed(watchUrl);
  if (oembed?.okJson) {
    return { status: "ok" };
  }
  if (oembed && (oembed.status === 403 || oembed.status === 404)) {
    return { status: "blocked", reason: "private_or_removed" };
  }

  const watch = await fetchHtml(watchUrl);
  if (!watch) return { status: "unknown" };
  if (!watch.ok && [403, 404, 410, 451].includes(watch.status)) {
    return { status: "blocked", reason: "private_or_removed" };
  }

  const playability = parsePlayability(watch.html);
  if (playability.status === "OK" || playability.playableInEmbed === true) {
    return { status: "ok" };
  }
  if (playability.status === "LOGIN_REQUIRED") {
    return { status: "blocked", reason: "embed_blocked" };
  }
  if (playability.status === "ERROR" || playability.status === "UNPLAYABLE") {
    if (textSuggestsPrivateOrRemoved(watch.html)) {
      return { status: "blocked", reason: "private_or_removed" };
    }
    if (playability.playableInEmbed === false || textSuggestsEmbedBlocked(watch.html)) {
      return { status: "blocked", reason: "embed_blocked" };
    }
    return { status: "blocked", reason: "private_or_removed" };
  }

  if (textSuggestsPrivateOrRemoved(watch.html)) {
    return { status: "blocked", reason: "private_or_removed" };
  }

  const embed = await fetchHtml(embedUrl);
  if (!embed) {
    // Watch page didn't give a clear verdict; don't reject on network flake.
    return { status: "unknown" };
  }
  if (!embed.ok && [403, 404, 410, 451].includes(embed.status)) {
    return { status: "blocked", reason: "private_or_removed" };
  }

  const embedPlayability = parsePlayability(embed.html);
  if (embedPlayability.status === "OK" || embedPlayability.playableInEmbed === true) {
    return { status: "ok" };
  }
  if (textSuggestsPrivateOrRemoved(embed.html)) {
    return { status: "blocked", reason: "private_or_removed" };
  }
  if (embedPlayability.playableInEmbed === false || textSuggestsEmbedBlocked(embed.html)) {
    return { status: "blocked", reason: "embed_blocked" };
  }

  // Inconclusive (consent wall, bot interstitial, etc.) — allow submit rather than false reject.
  // Battle playback will still surface real embed failures to the listener.
  return { status: "unknown" };
}
