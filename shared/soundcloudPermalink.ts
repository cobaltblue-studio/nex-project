/** Shared SoundCloud permalink normalization (client players + server resolve). */

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (!/^https?:\/\//i.test(t)) return `https://${t}`;
  return t;
}

export function normalizeSoundCloudPermalink(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  let url = normalizeUrl(raw.trim());

  if (/w\.soundcloud\.com\/player/i.test(url)) {
    try {
      const inner = new URL(url).searchParams.get("url");
      if (inner) return normalizeSoundCloudPermalink(inner);
    } catch {
      return null;
    }
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, "").replace(/^m\./i, "").toLowerCase();
  if (host === "on.soundcloud.com") return null;
  if (host !== "soundcloud.com") return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const blocked = new Set(["discover", "stream", "search", "tags", "you", "feed", "pages"]);
  if (blocked.has(segments[0].toLowerCase())) return null;

  return `https://soundcloud.com${parsed.pathname}`;
}

export function urlLooksLikeSoundCloudShare(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  return /soundcloud\.com|on\.soundcloud\.com/i.test(url.trim());
}
