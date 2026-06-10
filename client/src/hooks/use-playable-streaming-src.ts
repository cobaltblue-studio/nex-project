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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResolvedSunoSrc(null);
    setError(null);
    if (!rawUrl?.trim()) {
      setLoading(false);
      return;
    }
    if (syncSrc !== null || !urlLooksLikeSunoShare(rawUrl)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/suno/resolve?url=${encodeURIComponent(rawUrl.trim())}`)
      .then(async (r) => {
        const j = (await r.json()) as { songUuid?: string; message?: string };
        if (cancelled) return;
        if (!r.ok || !j.songUuid) {
          setError(
            typeof j.message === "string"
              ? j.message
              : t("suno.resolveFailed"),
          );
          return;
        }
        const embed = buildSunoEmbedFromCanonicalUuid(j.songUuid, autoplay);
        if (embed) setResolvedSunoSrc(embed);
        else setError(t("suno.embedFailed"));
      })
      .catch(() => {
        if (!cancelled) setError(t("suno.requestFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawUrl, syncSrc, autoplay, t]);

  const iframeSrc = resolvedSunoSrc ?? syncSrc;
  return { iframeSrc, loading, error };
}
