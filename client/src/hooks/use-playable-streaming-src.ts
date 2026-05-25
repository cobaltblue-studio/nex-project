import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildSoundCloudPlayerSrc,
  buildStreamingIframeSrc,
  buildSunoEmbedFromCanonicalUuid,
  urlLooksLikeSoundCloudShare,
  urlLooksLikeSunoShare,
} from "@/lib/streamingEmbed";

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

  const [resolvedSunoSrc, setResolvedSunoSrc] = useState<string | null>(null);
  const [resolvedSoundCloudSrc, setResolvedSoundCloudSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsSunoResolve = !!rawUrl?.trim() && syncSrc === null && urlLooksLikeSunoShare(rawUrl);
  const needsSoundCloudResolve =
    !!rawUrl?.trim() &&
    syncSrc === null &&
    !needsSunoResolve &&
    urlLooksLikeSoundCloudShare(rawUrl);

  useEffect(() => {
    setResolvedSunoSrc(null);
    setResolvedSoundCloudSrc(null);
    setError(null);
    if (!rawUrl?.trim()) {
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
          const j = (await r.json()) as { songUuid?: string; message?: string };
          if (cancelled) return;
          if (!r.ok || !j.songUuid) {
            setError(
              typeof j.message === "string"
                ? j.message
                : t("suno.resolveFailed", "Could not resolve this Suno link."),
            );
            return;
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
  }, [rawUrl, syncSrc, autoplay, embedSeekSeconds, needsSunoResolve, needsSoundCloudResolve, t]);

  const iframeSrc = resolvedSunoSrc ?? resolvedSoundCloudSrc ?? syncSrc;
  return { iframeSrc, loading, error };
}
