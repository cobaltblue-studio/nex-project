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

interface Props {
  videoId: string;
  autoplay?: boolean;
  battleMode?: boolean;
  onEnded?: () => void;
  className?: string;
}

const BATTLE_PREVIEW_SECONDS = 20;
const BATTLE_START_OFFSET = 30;

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
          onReady: () => {
            if (battleMode && autoplay) {
              battleTimerRef.current = setTimeout(() => {
                try {
                  playerRef.current?.pauseVideo();
                } catch {}
                onEndedRef.current?.();
              }, BATTLE_PREVIEW_SECONDS * 1000);
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
        paddingTop: battleMode ? "47.8%" : "56.25%",
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

export function buildIframeEmbedUrl(url: string, autoplay = false): string {
  if (url.includes("suno.com")) {
    const base = url.replace("/song/", "/embed/");
    return autoplay ? `${base}?autoplay=1` : base;
  }
  if (url.includes("soundcloud.com") && !url.includes("w.soundcloud.com")) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%2300f0ff&auto_play=${autoplay}&hide_related=true&show_comments=false`;
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo)
    return `https://player.vimeo.com/video/${vimeo[1]}${autoplay ? "?autoplay=1" : ""}`;
  return url;
}
