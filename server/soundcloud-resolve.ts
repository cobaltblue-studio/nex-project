import { normalizeSoundCloudPermalink } from "@shared/soundcloudPermalink";

function normalizeInputUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
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

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!isAllowedSoundCloudHost(parsed.hostname)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(parsed.href, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "NEX-Music-Platform/1.0 (+https://nexmusic.ai)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    return normalizeSoundCloudPermalink(res.url);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
