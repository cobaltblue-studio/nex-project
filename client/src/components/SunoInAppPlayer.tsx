import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  normalizeSunoCoverImageUrl,
  sunoCoverUrlFromSongUuid,
} from "@shared/trackThumbnail";
import {
  extractSunoSongIdFromUrl,
  isSunoSongUuid,
} from "@/lib/streamingEmbed";
import { SunoListenFallback } from "@/components/SunoListenFallback";

type AudioApiOk = {
  songUuid: string;
  kind: "video" | "audio";
  streamUrl: string;
  upstreamUrl?: string;
  contentType: string;
  source: string;
  durationSeconds: number | null;
};

type Props = {
  shareUrl?: string | null;
  coverImageUrl?: string | null;
  title?: string;
  compact?: boolean;
  autoplay?: boolean;
  /** When set, stop playback after N seconds (battle preview). */
  previewSeconds?: number;
  onEnded?: () => void;
  /** Parent open flag — when false, media must pause/reset. */
  active?: boolean;
};

/**
 * In-NEX Suno playback via server-resolved stream (MP4 / m4a-opus proxy).
 * Falls back to Open-on-Suno CTA when resolve fails. Modal unmount or active=false stops audio.
 */
export function SunoInAppPlayer({
  shareUrl,
  coverImageUrl,
  title,
  compact = false,
  autoplay = true,
  previewSeconds,
  onEnded,
  active = true,
}: Props) {
  const { t } = useTranslation();
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [meta, setMeta] = useState<AudioApiOk | null>(null);
  const [playing, setPlaying] = useState(false);
  const [coverBroken, setCoverBroken] = useState(false);

  const uuid = extractSunoSongIdFromUrl(shareUrl);
  const cover =
    normalizeSunoCoverImageUrl(coverImageUrl) ??
    (uuid && isSunoSongUuid(uuid) ? sunoCoverUrlFromSongUuid(uuid) : null);

  useEffect(() => {
    if (!active || !shareUrl?.trim()) {
      setMeta(null);
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setMeta(null);
    setPlaying(false);

    void fetch(`/api/suno/audio?url=${encodeURIComponent(shareUrl.trim())}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("resolve_failed");
        return (await res.json()) as AudioApiOk;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data?.streamUrl && !data?.upstreamUrl) throw new Error("no_stream");
        // Prefer direct CDN/CloudFront in the browser; proxy is fallback if direct fails.
        const primary = data.upstreamUrl || data.streamUrl || "";
        setMeta({
          ...data,
          streamUrl: primary,
          upstreamUrl: data.streamUrl && data.upstreamUrl !== data.streamUrl ? data.streamUrl : data.upstreamUrl,
        });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
          setMeta(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shareUrl, active]);

  // Hard-stop whenever inactive / unmount / track changes
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (!active) {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
      setPlaying(false);
    }
    return () => {
      el.pause();
      try {
        el.removeAttribute("src");
        el.load();
      } catch {
        /* ignore */
      }
    };
  }, [active, meta?.streamUrl]);

  useEffect(() => {
    if (!meta || !autoplay || !active) return;
    const el = mediaRef.current;
    if (!el) return;
    void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [meta, autoplay, active]);

  useEffect(() => {
    if (!previewSeconds || !meta || !active) return;
    const id = window.setTimeout(() => {
      const el = mediaRef.current;
      if (el) {
        el.pause();
        try {
          el.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      setPlaying(false);
      onEnded?.();
    }, previewSeconds * 1000);
    return () => window.clearTimeout(id);
  }, [previewSeconds, meta?.streamUrl, active, onEnded]);

  // Safety advance when native onEnded is flaky (some m4a-opus paths).
  useEffect(() => {
    if (previewSeconds || !meta?.durationSeconds || !onEnded || !active) return;
    const id = window.setTimeout(() => {
      stop();
      onEnded();
    }, (meta.durationSeconds + 2) * 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stop is stable enough via mediaRef
  }, [previewSeconds, meta?.durationSeconds, meta?.streamUrl, active, onEnded]);

  const togglePlay = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const stop = () => {
    const el = mediaRef.current;
    if (!el) return;
    el.pause();
    try {
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
    setPlaying(false);
  };

  if (!active) return null;

  if (loading) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-black text-zinc-500 ${
          compact ? "min-h-[120px]" : "min-h-[200px]"
        }`}
        data-testid="suno-inapp-loading"
      >
        <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
        <p className="text-[9px] font-bold uppercase tracking-widest">{t("suno.resolving")}</p>
      </div>
    );
  }

  if (error || !meta) {
    return (
      <SunoListenFallback
        shareUrl={shareUrl}
        coverImageUrl={coverImageUrl}
        title={title}
        compact={compact}
      />
    );
  }

  const showCover = !!cover && !coverBroken;

  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden bg-black ${
        compact ? "min-h-[120px]" : "min-h-[200px]"
      }`}
      data-testid="suno-inapp-player"
    >
      {showCover ? (
        <img
          src={cover}
          alt={title ? `${title} cover` : ""}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          onError={() => setCoverBroken(true)}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />

      {meta.kind === "video" ? (
        <video
          ref={(el) => {
            mediaRef.current = el;
          }}
          key={meta.streamUrl}
          src={meta.streamUrl}
          className="relative z-[1] h-full w-full object-contain"
          playsInline
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            onEnded?.();
          }}
          onError={() => {
            const el = mediaRef.current;
            const fallback = meta.upstreamUrl;
            if (el && fallback && el.src !== fallback && !el.src.includes(fallback)) {
              el.src = fallback;
              void el.play().catch(() => setError(true));
              return;
            }
            setError(true);
          }}
        />
      ) : (
        <audio
          ref={(el) => {
            mediaRef.current = el;
          }}
          key={meta.streamUrl}
          src={meta.streamUrl}
          preload="auto"
          className="hidden"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            onEnded?.();
          }}
          onError={() => {
            const el = mediaRef.current;
            const fallback = meta.upstreamUrl;
            if (el && fallback && el.currentSrc !== fallback) {
              el.src = fallback;
              void el.play().catch(() => setError(true));
              return;
            }
            setError(true);
          }}
        />
      )}

      <div className="relative z-10 mt-auto flex items-center justify-center gap-3 px-4 py-4">
        <button
          type="button"
          onClick={togglePlay}
          data-testid="button-suno-play-pause"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/50 bg-primary/20 text-primary transition-premium hover:bg-primary/30"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={stop}
          data-testid="button-suno-stop"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-zinc-200 transition-premium hover:bg-white/10"
          aria-label="Stop"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      </div>
    </div>
  );
}
