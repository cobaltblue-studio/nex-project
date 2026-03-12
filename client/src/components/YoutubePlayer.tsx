import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Singleton loader — script injected once, all callbacks queued
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
  onEnded?: () => void;
  className?: string;
}

export function YoutubePlayer({
  videoId,
  autoplay = false,
  onEnded,
  className,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const onEndedRef = useRef(onEnded);
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

    loadYTApi(() => {
      if (destroyed) return;
      playerRef.current = new window.YT.Player(uid, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          start: 0,
          rel: 0,
          modestbranding: 1,
          controls: 0,
          showinfo: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === 0) onEndedRef.current?.(); // 0 = YT.PlayerState.ENDED
          },
        },
      });
    });

    return () => {
      destroyed = true;
      try {
        playerRef.current?.destroy();
      } catch {}
      playerRef.current = null;
      if (wrapperRef.current) wrapperRef.current.innerHTML = "";
    };
  }, [videoId, autoplay]); // remount fully when videoId or autoplay changes

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        ref={wrapperRef}
        className={className}
        style={{
          width: "100%",
          maxWidth: "900px",
          aspectRatio: "16/9",
          position: "relative",
        }}
      />
    </div>
  );
}

// Extract YouTube video ID from any YouTube URL format
export function extractYoutubeId(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

// Build a plain iframe embed URL (for non-YouTube platforms)
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
