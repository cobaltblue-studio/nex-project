import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildSoundCloudPlayerSrc,
  buildStreamingIframeSrc,
  buildSunoEmbedFromCanonicalUuid,
  urlLooksLikeSoundCloudShare,
  urlLooksLikeSunoShare,
} from "@/lib/streamingEmbed";
import { getCachedEmbedSrc } from "@/lib/prefetchStreamingEmbed";

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

  const syncSrc = useMemo(
    () => buildStreamingIframeSrc(rawUrl, { autoplay, enableJsApi, embedSeekSeconds }),
    [rawUrl, autoplay, enableJsApi, embedSeekSeconds],
  );

  const cachedSrc = useMemo(
    () => (rawUrl?.trim() ? getCachedEmbedSrc(rawUrl) : undefined),
    [rawUrl],
  );

  const [resolvedAsyncSrc, setResolvedAsyncSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResolvedAsyncSrc(null);
    setError(null);
    if (!rawUrl?.trim()) {
      setLoading(false);
      return;
    }
    if (syncSrc !== null || cachedSrc) {
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

    const resolve = isSuno
      ? fetch(`/api/suno/resolve?url=${encodeURIComponent(url)}`).then(async (r) => {
          const j = (await r.json()) as { songUuid?: string; message?: string };
          if (!r.ok || !j.songUuid) {
            throw new Error(
              typeof j.message === "string" ? j.message : t("suno.resolveFailed"),
            );
          }
          const embed = buildSunoEmbedFromCanonicalUuid(j.songUuid, autoplay);
          if (!embed) throw new Error(t("suno.embedFailed"));
          return embed;
        })
      : fetch(`/api/soundcloud/resolve?url=${encodeURIComponent(url)}`).then(async (r) => {
          const j = (await r.json()) as { permalink?: string; message?: string };
          if (!r.ok || !j.permalink) {
            throw new Error(
              typeof j.message === "string"
                ? j.message
                : "Need a SoundCloud track share link (Share → Copy link on the track page).",
            );
          }
          const embed = buildSoundCloudPlayerSrc(j.permalink, { autoplay, embedSeekSeconds });
          if (!embed) throw new Error("Could not build SoundCloud embed URL.");
          return embed;
        });

    void resolve
      .then((embed) => {
        if (!cancelled) setResolvedAsyncSrc(embed);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("suno.requestFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawUrl, syncSrc, cachedSrc, autoplay, embedSeekSeconds, t]);

  const iframeSrc = resolvedAsyncSrc ?? syncSrc ?? cachedSrc ?? null;
  return { iframeSrc, loading, error };
}
