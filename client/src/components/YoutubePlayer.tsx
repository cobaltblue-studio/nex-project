import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let _apiReady = false;
let _callbacks: Array<() => void> = [];

function loadYTApi(cb: () => void) {
  if (_apiReady && window.YT?.Player) {
    cb();
    return;
  }
  _callbacks.push(cb);
  if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    _apiReady = true;
    _callbacks.forEach((f) => f());
    _callbacks = [];
    prev?.();
  };
  const s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(s);
}

/** Start loading the YouTube IFrame API early (e.g. battle arena) so the first player mounts faster. */
export function warmYoutubeIframeApi(): void {
  loadYTApi(() => {});
}

interface Props {
  videoId: string;
  autoplay?: boolean;
  battleMode?: boolean;
  onEnded?: () => void;
  className?: string;
}

const BATTLE_PREVIEW_SECONDS = 20;

/** Exported for battle direct-audio / iframe preview windows (same rule as YouTube battle). */
export function randomMiddlePreviewStart(durationSec: number, previewLen: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= previewLen + 2) return 0;
  const low = Math.max(0, durationSec * 0.25);
  const high = Math.max(
    low,
    Math.min(durationSec * 0.75 - previewLen, durationSec - previewLen),
  );
  return low + Math.random() * (high - low);
}

export function YoutubePlayer({
  videoId,
  autoplay = false,
  battleMode = false,
  onEnded,
  className,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const onEndedRef = useRef(onEnded);
  const battleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    if (!videoId || !wrapperRef.current) return;
    let destroyed = false;
    let battlePollTimer: ReturnType<typeof setTimeout> | null = null;

    const inner = document.createElement("div");
    const uid = `yt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    inner.id = uid;
    wrapperRef.current.appendChild(inner);

    const battleAutoplay = battleMode && autoplay;

    const clearBattlePoll = () => {
      if (battlePollTimer) {
        clearTimeout(battlePollTimer);
        battlePollTimer = null;
      }
    };

    const armBattleEndTimer = () => {
      if (battleTimerRef.current) clearTimeout(battleTimerRef.current);
      battleTimerRef.current = setTimeout(() => {
        try {
          playerRef.current?.pauseVideo();
        } catch {}
        onEndedRef.current?.();
      }, BATTLE_PREVIEW_SECONDS * 1000);
    };

    /** getDuration() is often 0 on onReady; wait until the player reports a real length. */
    const startBattleFromRandomMiddle = (p: any) => {
      let attempts = 0;
      const maxAttempts = 50;
      const tick = () => {
        if (destroyed) return;
        const rawDur = typeof p.getDuration === "function" ? p.getDuration() : 0;
        const dur = Number(rawDur);
        if (Number.isFinite(dur) && dur > BATTLE_PREVIEW_SECONDS + 2) {
          clearBattlePoll();
          try {
            const start = randomMiddlePreviewStart(dur, BATTLE_PREVIEW_SECONDS);
            if (start > 0) p.seekTo(start, true);
            p.playVideo?.();
          } catch {}
          armBattleEndTimer();
          return;
        }
        if (++attempts >= maxAttempts) {
          clearBattlePoll();
          try {
            p.playVideo?.();
          } catch {}
          armBattleEndTimer();
          return;
        }
        battlePollTimer = setTimeout(tick, 64);
      };
      tick();
    };

    loadYTApi(() => {
      if (destroyed) return;
      playerRef.current = new window.YT.Player(uid, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          // Battle: avoid autoplay=1 before seek (audible start at 0:00 + long buffer on deep start=).
          autoplay: battleAutoplay ? 0 : autoplay ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          controls: battleMode ? 0 : 1,
          showinfo: 0,
          disablekb: battleMode ? 1 : 0,
          fs: battleMode ? 0 : 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === 0) onEndedRef.current?.();
          },
          onReady: (ev: { target: any }) => {
            const p = ev.target;
            if (battleAutoplay) {
              startBattleFromRandomMiddle(p);
            } else if (autoplay) {
              try {
                p.playVideo?.();
              } catch {}
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      clearBattlePoll();
      if (battleTimerRef.current) clearTimeout(battleTimerRef.current);
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
      if (wrapperRef.current) wrapperRef.current.innerHTML = "";
    };
  }, [videoId, autoplay, battleMode]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingTop: battleMode ? "42%" : "56.25%",
      }}
    >
      <div
        ref={wrapperRef}
        className={className}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
      {battleMode && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 10,
            cursor: "default",
          }}
        />
      )}
    </div>
  );
}

export function extractYoutubeId(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

export { buildIframeEmbedUrl } from "@/lib/streamingEmbed";
