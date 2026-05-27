import {
  buildSoundCloudPlayerSrc,
  buildStreamingIframeSrc,
  buildSunoEmbedFromCanonicalUuid,
  urlLooksLikeSoundCloudShare,
  urlLooksLikeSunoShare,
} from "@/lib/streamingEmbed";

const embedSrcCache = new Map<string, string>();
const inflight = new Set<string>();

function cacheKey(url: string): string {
  return url.trim().toLowerCase();
}

export function getCachedEmbedSrc(rawUrl: string | undefined | null): string | undefined {
  if (!rawUrl?.trim()) return undefined;
  return embedSrcCache.get(cacheKey(rawUrl));
}

/** DNS/TLS warm-up for third-party embed players (battle arena). */
export function warmStreamingEmbedOrigins(): void {
  if (typeof document === "undefined") return;
  for (const href of ["https://suno.com", "https://w.soundcloud.com"]) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }
}

/**
 * Resolve Suno / SoundCloud embed `src` before the visible player mounts (battle preload).
 * Sync `/song/{uuid}` Suno links are cached immediately without a network hop.
 */
export function prefetchPlayableStreamingEmbed(rawUrl: string | undefined | null): void {
  const url = rawUrl?.trim();
  if (!url) return;
  const key = cacheKey(url);
  if (embedSrcCache.has(key) || inflight.has(key)) return;

  const sync = buildStreamingIframeSrc(url, { autoplay: false });
  if (sync) {
    embedSrcCache.set(key, sync);
    return;
  }

  inflight.add(key);

  if (urlLooksLikeSunoShare(url)) {
    void fetch(`/api/suno/resolve?url=${encodeURIComponent(url)}`)
      .then(async (r) => {
        const j = (await r.json()) as { songUuid?: string };
        if (!r.ok || !j.songUuid) return;
        const embed = buildSunoEmbedFromCanonicalUuid(j.songUuid, false);
        if (embed) embedSrcCache.set(key, embed);
      })
      .catch(() => {})
      .finally(() => {
        inflight.delete(key);
      });
    return;
  }

  if (urlLooksLikeSoundCloudShare(url)) {
    void fetch(`/api/soundcloud/resolve?url=${encodeURIComponent(url)}`)
      .then(async (r) => {
        const j = (await r.json()) as { permalink?: string };
        if (!r.ok || !j.permalink) return;
        const embed = buildSoundCloudPlayerSrc(j.permalink, { autoplay: false });
        if (embed) embedSrcCache.set(key, embed);
      })
      .catch(() => {})
      .finally(() => {
        inflight.delete(key);
      });
    return;
  }

  inflight.delete(key);
}
