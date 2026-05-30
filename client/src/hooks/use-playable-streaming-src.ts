import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCachedEmbedSrc } from "@/lib/prefetchStreamingEmbed";
import {
  buildSoundCloudPlayerSrc,
  buildStreamingIframeSrc,
  buildSunoEmbedFromCanonicalUuid,
  urlLooksLikeSoundCloudShare,
  urlLooksLikeSunoShare,
} from "@/lib/streamingEmbed";
import { extractSunoEmbedUuid } from "@/lib/extractSunoEmbedUuid";

type Opts = { autoplay?: boolean; enableJsApi?: boolean; embedSeekSeconds?: number };

/**
 * Builds a third-party iframe `src`. Suno `/s/…` short links need a server hop to get the song UUID.
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

  const [resolvedSunoSrc, setResolvedSunoSrc] = useState<string | null>(() => {
    if (!cachedSrc?.includes("suno.com/embed")) return null;
    return cachedSrc;
  });
  const [resolvedSoundCloudSrc, setResolvedSoundCloudSrc] = useState<string | null>(() => {
    if (!cachedSrc?.includes("w.soundcloud.com/player")) return null;
    return cachedSrc;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sunoDurationSeconds, setSunoDurationSeconds] = useState<number | null>(null);

  const needsSunoResolve = !!rawUrl?.trim() && syncSrc === null && urlLooksLikeSunoShare(rawUrl);
  const needsSoundCloudResolve =
    !!rawUrl?.trim() &&
    syncSrc === null &&
    !needsSunoResolve &&
    urlLooksLikeSoundCloudShare(rawUrl);

  useEffect(() => {
    setResolvedSunoSrc(null);
    setResolvedSoundCloudSrc(null);
    setSunoDurationSeconds(null);
    setError(null);
    if (!rawUrl?.trim()) {
      setLoading(false);
      return;
    }
    if (cachedSrc) {
      setLoading(false);
      return;
    }
    if (!needsSunoResolve && !needsSoundCloudResolve) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    if (needsSunoResolve) {
      fetch(`/api/suno/resolve?url=${encodeURIComponent(rawUrl.trim())}`)
        .then(async (r) => {
          const j = (await r.json()) as {
            songUuid?: string;
            durationSeconds?: number | null;
            message?: string;
          };
          if (cancelled) return;
          if (!r.ok || !j.songUuid) {
            setError(
              typeof j.message === "string"
                ? j.message
                : t("suno.resolveFailed", "Could not resolve this Suno link."),
            );
            return;
          }
          if (typeof j.durationSeconds === "number" && j.durationSeconds > 0) {
            setSunoDurationSeconds(j.durationSeconds);
          }
          const embed = buildSunoEmbedFromCanonicalUuid(j.songUuid, autoplay);
          if (embed) setResolvedSunoSrc(embed);
          else setError(t("suno.embedFailed", "This Suno track cannot be embedded."));
        })
        .catch(() => {
          if (!cancelled) setError(t("suno.requestFailed", "Could not reach the server."));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    fetch(`/api/soundcloud/resolve?url=${encodeURIComponent(rawUrl.trim())}`)
      .then(async (r) => {
        const j = (await r.json()) as { permalink?: string; message?: string };
        if (cancelled) return;
        if (!r.ok || !j.permalink) {
          setError(
            typeof j.message === "string"
              ? j.message
              : t(
                  "soundcloud.resolveFailed",
                  "Use a SoundCloud track link (Share → Copy link), not a profile or playlist-only URL.",
                ),
          );
          return;
        }
        const embed = buildSoundCloudPlayerSrc(j.permalink, { autoplay, embedSeekSeconds });
        if (embed) setResolvedSoundCloudSrc(embed);
        else
          setError(
            t(
              "soundcloud.embedFailed",
              "This SoundCloud link cannot be played here.",
            ),
          );
      })
      .catch(() => {
        if (!cancelled)
          setError(t("soundcloud.requestFailed", "Could not reach the server."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawUrl, syncSrc, cachedSrc, autoplay, embedSeekSeconds, needsSunoResolve, needsSoundCloudResolve, t]);

  const iframeSrc = useMemo(() => {
    const base = resolvedSunoSrc ?? resolvedSoundCloudSrc ?? syncSrc ?? cachedSrc ?? null;
    if (!base || !autoplay) return base;
    const sunoUuid = extractSunoEmbedUuid(base);
    if (sunoUuid) return buildSunoEmbedFromCanonicalUuid(sunoUuid, true);
    if (base.includes("w.soundcloud.com/player")) {
      return base.replace(/auto_play=0/, "auto_play=1");
    }
    return base;
  }, [resolvedSunoSrc, resolvedSoundCloudSrc, syncSrc, cachedSrc, autoplay]);

  const sunoEmbedUuid = useMemo(() => extractSunoEmbedUuid(iframeSrc), [iframeSrc]);

  useEffect(() => {
    if (!sunoEmbedUuid) return;

    let cancelled = false;
    fetch(`/api/suno/metadata?uuid=${encodeURIComponent(sunoEmbedUuid)}`)
      .then(async (r) => {
        const j = (await r.json()) as { durationSeconds?: number | null };
        if (cancelled) return;
        if (typeof j.durationSeconds === "number" && j.durationSeconds > 0) {
          setSunoDurationSeconds(j.durationSeconds);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sunoEmbedUuid]);

  return { iframeSrc, loading: loading && !iframeSrc, error, sunoDurationSeconds };
}
