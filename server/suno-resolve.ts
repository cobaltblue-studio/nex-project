/** Follow Suno share/short URLs server-side — embed only works with /song/{uuid}, not /s/{shortCode}. */

const SUNO_SONG_UUID_RE =
  /\/song\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function extractSunoSongUuidFromUrlString(url: string): string | null {
  const m = url.match(SUNO_SONG_UUID_RE);
  return m ? m[1].toLowerCase() : null;
}

function isAllowedSunoFetchHost(host: string): boolean {
  const h = host.replace(/^www\./i, "").toLowerCase();
  if (h === "suno.com" || h === "suno.ai") return true;
  return h.endsWith(".suno.com") || h.endsWith(".suno.ai");
}

/**
 * Returns the canonical song UUID for iframe embedding, or null.
 * Short links are resolved via HTTP redirect to /song/{uuid}.
 */
const SUNO_FETCH_HEADERS = {
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (compatible; NEX/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
} as const;

/** Normalize Suno HTML/JSON duration hints to whole seconds (typical songs: 30s–8min). */
export function normalizeSunoDurationHint(raw: number): number | null {
  if (!Number.isFinite(raw) || raw <= 0) return null;
  let sec = raw;
  if (sec > 7200) return null;
  if (sec > 600) sec = Math.round(sec / 1000);
  sec = Math.round(sec);
  if (sec < 15 || sec > 7200) return null;
  return sec;
}

/** Best-effort parse of song length from a Suno song/share HTML payload. */
export function parseSunoDurationSecondsFromHtml(html: string): number | null {
  const patterns = [
    /"duration"\s*:\s*(\d+(?:\.\d+)?)/i,
    /"duration_sec(?:onds)?"\s*:\s*(\d+(?:\.\d+)?)/i,
    /"metadata_duration"\s*:\s*(\d+(?:\.\d+)?)/i,
    /"audio_length"\s*:\s*(\d+(?:\.\d+)?)/i,
    /property="og:audio:duration"\s+content="(\d+(?:\.\d+)?)"/i,
    /"length"\s*:\s*(\d+(?:\.\d+)?)/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    const normalized = normalizeSunoDurationHint(parseFloat(m[1]));
    if (normalized != null) return normalized;
  }
  return null;
}

export async function fetchSunoSongDurationSeconds(songUuid: string): Promise<number | null> {
  const uuid = songUuid.trim().toLowerCase();
  if (!extractSunoSongUuidFromUrlString(`https://suno.com/song/${uuid}`)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`https://suno.com/song/${uuid}`, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: SUNO_FETCH_HEADERS,
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseSunoDurationSecondsFromHtml(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveSunoShareToSongUuid(inputUrl: string): Promise<string | null> {
  let parsed: URL;
  try {
    const raw = inputUrl.trim();
    if (!raw) return null;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!isAllowedSunoFetchHost(parsed.hostname)) return null;

  const fromInput = extractSunoSongUuidFromUrlString(parsed.href);
  if (fromInput) return fromInput;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(parsed.href, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: SUNO_FETCH_HEADERS,
    });
    const finalUrl = res.url;
    return extractSunoSongUuidFromUrlString(finalUrl);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
