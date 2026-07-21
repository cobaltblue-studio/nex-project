import { normalizeSoundCloudPermalink } from "@shared/soundcloudPermalink";

function normalizeInputUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return withScheme.replace(/^http:\/\//i, "https://");
}

function isAllowedSoundCloudHost(host: string): boolean {
  const h = host.replace(/^www\./i, "").replace(/^m\./i, "").toLowerCase();
  return h === "soundcloud.com" || h === "on.soundcloud.com";
}

/**
 * Follow SoundCloud short links (on.soundcloud.com) to a track/set permalink for the widget.
 */
export async function resolveSoundCloudShareToPermalink(inputUrl: string): Promise<string | null> {
  const normalized = normalizeInputUrl(inputUrl);
  if (!normalized) return null;

  const sync = normalizeSoundCloudPermalink(normalized);
  if (sync) return sync;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (!isAllowedSoundCloudHost(parsed.hostname)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    let current = parsed.href;
    for (let hop = 0; hop < 5; hop++) {
      const res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "NEX-Music-Platform/1.0 (+https://nexmusic.ai)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return null;
        let nextUrl: URL;
        try {
          nextUrl = new URL(loc, current);
        } catch {
          return null;
        }
        if (nextUrl.protocol !== "https:") return null;
        if (!isAllowedSoundCloudHost(nextUrl.hostname)) return null;
        current = nextUrl.href;
        continue;
      }
      return normalizeSoundCloudPermalink(res.url || current);
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
