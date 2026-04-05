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
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; NEX/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const finalUrl = res.url;
    return extractSunoSongUuidFromUrlString(finalUrl);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
