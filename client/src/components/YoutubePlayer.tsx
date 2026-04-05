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
/** Start at 0 for immediate audio (30s offset caused long buffering / perceived delay). */
const BATTLE_START_OFFSET = 0;

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

    const inner = document.createElement("div");
    const uid = `yt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    inner.id = uid;
    wrapperRef.current.appendChild(inner);

    const startTime = battleMode ? BATTLE_START_OFFSET : 0;
    const endTime = battleMode ? BATTLE_START_OFFSET + BATTLE_PREVIEW_SECONDS : undefined;

    loadYTApi(() => {
      if (destroyed) return;
      playerRef.current = new window.YT.Player(uid, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          start: startTime,
          ...(endTime ? { end: endTime } : {}),
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
            if (battleMode && autoplay) {
              try {
                if (startTime > 0) p.seekTo(startTime, true);
                p.playVideo?.();
              } catch {}
              battleTimerRef.current = setTimeout(() => {
                try {
                  playerRef.current?.pauseVideo();
                } catch {}
                onEndedRef.current?.();
              }, BATTLE_PREVIEW_SECONDS * 1000);
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
