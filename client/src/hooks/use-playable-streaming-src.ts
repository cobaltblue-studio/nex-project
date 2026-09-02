import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildStreamingIframeSrc,
  urlLooksLikeSoundCloudShare,
  urlLooksLikeSunoShare,
} from "@/lib/streamingEmbed";
import {
  ensureStreamingEmbedResolved,
  getCachedEmbedSrc,
  getStreamingEmbedCacheVersion,
  subscribeStreamingEmbedCache,
} from "@/lib/prefetchStreamingEmbed";

type Opts = { autoplay?: boolean; enableJsApi?: boolean; embedSeekSeconds?: number };

/**
 * Builds a third-party iframe `src`. Suno `/s/…` and SoundCloud short/profile URLs need a server hop.
 */
export function usePlayableStreamingSrc(rawUrl: string | undefined | null, opts: Opts = {}) {
  const { t } = useTranslation();
  const autoplay = !!opts.autoplay;
  const enableJsApi = !!opts.enableJsApi;
  const embedSeekSeconds =
    typeof opts.embedSeekSeconds === "number" && opts.embedSeekSeconds > 0
      ? opts.embedSeekSeconds
      : undefined;

  const embedOpts = useMemo(
    () => ({ autoplay, embedSeekSeconds }),
    [autoplay, embedSeekSeconds],
  );

  const [resolvedAsyncSrc, setResolvedAsyncSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheVersion, setCacheVersion] = useState(getStreamingEmbedCacheVersion);

  useEffect(() => subscribeStreamingEmbedCache(() => setCacheVersion((v) => v + 1)), []);

  const syncSrc = useMemo(
    () => buildStreamingIframeSrc(rawUrl, { autoplay, enableJsApi, embedSeekSeconds }),
    [rawUrl, autoplay, enableJsApi, embedSeekSeconds],
  );

  const cachedSrc = useMemo(
    () => (rawUrl?.trim() ? getCachedEmbedSrc(rawUrl, embedOpts) : undefined),
    [rawUrl, embedOpts, cacheVersion],
  );

  useEffect(() => {
    setResolvedAsyncSrc(null);
    setError(null);
    if (!rawUrl?.trim()) {
      setLoading(false);
      return;
    }
    const immediate = syncSrc ?? cachedSrc ?? null;
    if (immediate) {
      setResolvedAsyncSrc(immediate);
      setLoading(false);
      return;
    }

    const url = rawUrl.trim();
    const isSuno = urlLooksLikeSunoShare(url);
    const isSoundCloud = urlLooksLikeSoundCloudShare(url);
    if (!isSuno && !isSoundCloud) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void ensureStreamingEmbedResolved(url)
      .then(() => {
        if (cancelled) return;
        const embed = getCachedEmbedSrc(url, embedOpts);
        if (!embed) {
          throw new Error(
            isSuno ? t("suno.embedFailed") : "Could not build SoundCloud embed URL.",
          );
        }
        setResolvedAsyncSrc(embed);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : isSuno
                ? t("suno.requestFailed")
                : "Could not resolve SoundCloud link.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawUrl, syncSrc, cachedSrc, embedOpts, t, cacheVersion]);

  const iframeSrc = resolvedAsyncSrc ?? syncSrc ?? cachedSrc ?? null;
  return { iframeSrc, loading, error };
}
