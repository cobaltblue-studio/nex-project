import {
  buildSoundCloudPlayerSrc,
  buildStreamingIframeSrc,
  buildSunoEmbedFromCanonicalUuid,
  urlLooksLikeSoundCloudShare,
  urlLooksLikeSunoShare,
} from "@/lib/streamingEmbed";

const sunoUuidCache = new Map<string, string>();
const soundCloudPermalinkCache = new Map<string, string>();
const inflight = new Map<string, Promise<void>>();

function cacheKey(url: string): string {
  return url.trim().toLowerCase();
}

type EmbedOpts = { autoplay?: boolean; embedSeekSeconds?: number };

function buildCachedEmbedSrc(url: string, opts: EmbedOpts = {}): string | undefined {
  const key = cacheKey(url);
  const sync = buildStreamingIframeSrc(url, opts);
  if (sync) return sync;

  const sunoUuid = sunoUuidCache.get(key);
  if (sunoUuid) {
    return buildSunoEmbedFromCanonicalUuid(sunoUuid, !!opts.autoplay) ?? undefined;
  }

  const permalink = soundCloudPermalinkCache.get(key);
  if (permalink) {
    return buildSoundCloudPlayerSrc(permalink, opts) ?? undefined;
  }

  return undefined;
}

export function getCachedEmbedSrc(
  rawUrl: string | undefined | null,
  opts: EmbedOpts = {},
): string | undefined {
  if (!rawUrl?.trim()) return undefined;
  return buildCachedEmbedSrc(rawUrl.trim(), opts);
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

function needsAsyncResolve(url: string): boolean {
  if (buildStreamingIframeSrc(url, { autoplay: false })) return false;
  return urlLooksLikeSunoShare(url) || urlLooksLikeSoundCloudShare(url);
}

function resolveStreamingUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  const key = cacheKey(trimmed);
  if (buildCachedEmbedSrc(trimmed)) return Promise.resolve();

  const existing = inflight.get(key);
  if (existing) return existing;

  if (!needsAsyncResolve(trimmed)) return Promise.resolve();

  let task: Promise<void>;

  if (urlLooksLikeSunoShare(trimmed)) {
    task = fetch(`/api/suno/resolve?url=${encodeURIComponent(trimmed)}`)
      .then(async (r) => {
        const j = (await r.json()) as { songUuid?: string; message?: string };
        if (!r.ok || !j.songUuid) {
          throw new Error(typeof j.message === "string" ? j.message : "Suno resolve failed");
        }
        sunoUuidCache.set(key, j.songUuid);
      })
      .finally(() => {
        inflight.delete(key);
      });
  } else {
    task = fetch(`/api/soundcloud/resolve?url=${encodeURIComponent(trimmed)}`)
      .then(async (r) => {
        const j = (await r.json()) as { permalink?: string; message?: string };
        if (!r.ok || !j.permalink) {
          throw new Error(
            typeof j.message === "string"
              ? j.message
              : "Need a SoundCloud track share link (Share → Copy link on the track page).",
          );
        }
        soundCloudPermalinkCache.set(key, j.permalink);
      })
      .finally(() => {
        inflight.delete(key);
      });
  }

  inflight.set(key, task);
  return task;
}

/**
 * Resolve Suno / SoundCloud embed `src` before the visible player mounts (battle preload).
 * Sync `/song/{uuid}` Suno links are cached immediately without a network hop.
 */
export function prefetchPlayableStreamingEmbed(rawUrl: string | undefined | null): void {
  const url = rawUrl?.trim();
  if (!url) return;
  void resolveStreamingUrl(url).catch(() => {});
}

/** Shared with `usePlayableStreamingSrc` — dedupes in-flight resolve with prefetch. */
export function ensureStreamingEmbedResolved(rawUrl: string): Promise<void> {
  return resolveStreamingUrl(rawUrl.trim());
}
