import { useRoute, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useWork, useWorks } from "@/hooks/use-works";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowLeft, Music, ChevronUp, SkipForward, Infinity } from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Universal embed URL builder
function getEmbedUrl(url: string | undefined, enableJsApi = false): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (ytMatch) {
    const params = new URLSearchParams({ autoplay: "0", rel: "0", modestbranding: "1", controls: "1", showinfo: "0", disablekb: "1", fs: "0" });
    if (enableJsApi) { params.set("enablejsapi", "1"); params.set("origin", window.location.origin); }
    return `https://www.youtube.com/embed/${ytMatch[1]}?${params.toString()}`;
  }
  if (url.includes("suno.com")) return url.replace("/song/", "/embed/");
  if (url.includes("soundcloud.com")) return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%2300f0ff&auto_play=false&hide_related=true&show_comments=false&show_artwork=true`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  if (url.includes("udio.com")) return url;
  return url;
}

export function TrackDetail() {
  const [, params] = useRoute("/track/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // currentTrackId is the source of truth for the player — decoupled from URL
  const [currentTrackId, setCurrentTrackId] = useState<number>(() => Number(params?.id) || 0);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const playerKey = useRef(0); // forces iframe remount on track change
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playCountedRef = useRef<Set<number>>(new Set()); // tracks recorded this session

  // Sync currentTrackId if user navigates directly (e.g. browser back/forward)
  useEffect(() => {
    const newId = Number(params?.id);
    if (newId && newId !== currentTrackId) {
      setCurrentTrackId(newId);
    }
  }, [params?.id]);

  // 20-second play timer — records a play after user listens for 20+ seconds
  useEffect(() => {
    if (!currentTrackId || !isAuthenticated) return;
    // Clear any existing timer when track changes
    if (playTimerRef.current) clearTimeout(playTimerRef.current);

    playTimerRef.current = setTimeout(async () => {
      // Skip if already recorded in this session
      if (playCountedRef.current.has(currentTrackId)) return;
      try {
        await apiRequest("POST", `/api/tracks/${currentTrackId}/play`, {});
        playCountedRef.current.add(currentTrackId);
        queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      } catch { /* silent — play count is best-effort */ }
    }, 20_000); // 20 seconds

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [currentTrackId, isAuthenticated]);

  const { data: trackData, isLoading: isTrackLoading } = useWork(String(currentTrackId));
  const { data: allTracks, isLoading: areTracksLoading } = useWorks();

  // Normalize raw API response
  const track = useMemo(() => {
    if (!trackData) return null;
    return {
      ...trackData,
      creatorName: trackData.creator?.username || "NEX CREATOR",
      votes: trackData.listenerVotes || 0,
    };
  }, [trackData]);

  const sortedTracks = useMemo(() =>
    [...(allTracks || [])].sort((a, b) => (b?.votes || 0) - (a?.votes || 0))
  , [allTracks]);

  const rankIndex = useMemo(() =>
    track ? sortedTracks.findIndex(st => st.id === track.id) : -1
  , [sortedTracks, track]);

  const rank = rankIndex !== -1 ? rankIndex + 1 : null;

  const nextTrack = useMemo(() => {
    if (sortedTracks.length === 0 || rankIndex === -1) return null;
    return sortedTracks[(rankIndex + 1) % sortedTracks.length];
  }, [sortedTracks, rankIndex]);

  // Navigate to next track (smooth — only updates state + URL, no full reload)
  const goToNext = useCallback(() => {
    if (!nextTrack || isTransitioning) return;
    setIsTransitioning(true);
    playerKey.current += 1;
    setCurrentTrackId(nextTrack.id);
    setLocation(`/track/${nextTrack.id}`, { replace: false });
    setTimeout(() => setIsTransitioning(false), 400);
  }, [nextTrack, isTransitioning, setLocation]);

  // YouTube postMessage listener — detects video end (state === 0)
  useEffect(() => {
    if (!autoPlayNext) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === "onStateChange" && data.info === 0) {
          // YouTube video ended
          goToNext();
        }
      } catch { /* non-JSON message, ignore */ }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [autoPlayNext, goToNext]);

  const handleVote = async () => {
    if (!track || isVoting) return;
    const votedTracks = JSON.parse(localStorage.getItem("nex_voted_tracks") || "[]");
    if (votedTracks.includes(track.id)) {
      toast({ title: "ALREADY VOTED", description: "Neural signature already recorded for this track.", variant: "destructive" });
      return;
    }
    setIsVoting(true);
    try {
      await apiRequest("POST", `/api/tracks/${track.id}/vote`);
      votedTracks.push(track.id);
      localStorage.setItem("nex_voted_tracks", JSON.stringify(votedTracks));
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${track.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      toast({ title: "VOTE RECORDED", description: "Your resonance has been synthesized." });
    } catch {
      toast({ title: "CONNECTION ERROR", description: "Failed to transmit vote to the core.", variant: "destructive" });
    } finally {
      setIsVoting(false);
    }
  };

  if (isTrackLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-primary/60">Loading Neural Data...</p>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="p-20 text-center space-y-6">
        <div className="font-display text-2xl uppercase tracking-widest text-zinc-500 border border-white/5 border-dashed p-12">
          Track Not Found
        </div>
        <Link href="/music" className="inline-block text-primary font-bold uppercase tracking-widest hover:underline">
          Return to Music Board
        </Link>
      </div>
    );
  }

  const isYouTube = !!(track.mvUrl || track.audioUrl || "").match(/youtu/);
  const videoEmbedUrl = getEmbedUrl(track.mvUrl, isYouTube);
  const audioEmbedUrl = getEmbedUrl(track.audioUrl, isYouTube && !track.mvUrl);
  const isWidePlayer = !!videoEmbedUrl;
  const activeEmbedUrl = videoEmbedUrl || audioEmbedUrl;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-12 pb-20">
      <Link href="/music" className="inline-flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-[0.2em]">
        <ArrowLeft className="w-4 h-4" /> Back to Music
      </Link>

      <div className="bg-[#050505] border border-white/5 p-8 md:p-16 rounded-sm relative overflow-hidden">
        <div className="flex flex-col items-center space-y-10 relative z-10">

          {/* PLAYER + CONTROLS */}
          <div className={`w-full flex flex-col items-center gap-3 ${isWidePlayer ? "max-w-2xl" : "max-w-md"}`}>

            {/* Player */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrackId}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className={`w-full bg-zinc-900 border border-white/10 rounded-sm relative overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.08)] ${isWidePlayer ? "aspect-video" : "aspect-square"}`}
              >
                {activeEmbedUrl ? (
                  <iframe
                    src={activeEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: "none" }}
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-24 h-24 text-zinc-800" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Player Controls Bar */}
            <div className="w-full flex items-center justify-between px-1">
              {/* Auto Play Toggle */}
              <button
                onClick={() => setAutoPlayNext(v => !v)}
                data-testid="button-autoplay-toggle"
                title={autoPlayNext ? "Auto-play ON" : "Auto-play OFF"}
                className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${autoPlayNext ? "text-primary" : "text-zinc-700 hover:text-zinc-500"}`}
              >
                <Infinity className="w-3.5 h-3.5" />
                <span className="hidden sm:block">{autoPlayNext ? "AUTO" : "MANUAL"}</span>
              </button>

              {/* Up Next hint */}
              {nextTrack && (
                <div className="flex-1 text-center px-4">
                  <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest truncate">
                    <span className="text-zinc-600">UP NEXT</span>
                    {" · "}
                    <span className="text-zinc-500">{nextTrack.title}</span>
                    {" — "}
                    <span className="text-zinc-600">{nextTrack.creatorName}</span>
                  </p>
                </div>
              )}

              {/* NEXT Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToNext}
                disabled={!nextTrack || isTransitioning}
                data-testid="button-next-track"
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-white/10 px-3 py-1.5 rounded-sm text-zinc-400 hover:text-white hover:border-white/30 transition-all disabled:opacity-30"
              >
                NEXT <SkipForward className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          {/* TRACK INFO */}
          <div className="text-center space-y-6 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={`info-${currentTrackId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tighter uppercase leading-none">
                  {track.title}
                </h1>
                <Link href={`/profile/${track.creatorName.toLowerCase()}`}>
                  <p className="text-primary font-bold uppercase tracking-[0.4em] text-xs cursor-pointer hover:text-white transition-colors">
                    BY {track.creatorName}
                  </p>
                </Link>
              </motion.div>
            </AnimatePresence>

            {/* TRACK INFORMATION BLOCK */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-y border-white/5 text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-widest">
              <div className="space-y-1">
                <div className="text-zinc-600">RANK</div>
                <div className="text-white text-xs">
                  {rank ? `NEX #${String(rank).padStart(3, "0")}` : (areTracksLoading ? "..." : "-")}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-600">TITLE</div>
                <div className="text-white text-xs truncate">{track.title}</div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-600">ARTIST</div>
                <div className="text-white text-xs">{track.creatorName}</div>
              </div>
              <div className="space-y-1 flex flex-col items-center">
                <div className="text-zinc-600">VOTES</div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleVote}
                  disabled={isVoting}
                  className="flex flex-col items-center group mt-1"
                  data-testid="button-vote"
                >
                  <ChevronUp className={`w-4 h-4 ${isVoting ? "animate-bounce text-primary" : "text-primary group-hover:text-white"} transition-colors`} />
                  <span className="text-white text-xs">{track.votes}</span>
                </motion.button>
              </div>
            </div>

            {/* UP NEXT SECTION */}
            {nextTrack && (
              <div className="pt-6 space-y-3">
                <div className="flex items-center gap-3 justify-center">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">
                    {autoPlayNext && <Infinity className="w-3 h-3 text-primary/60" />}
                    UP NEXT
                  </span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={goToNext}
                  data-testid="button-up-next-card"
                  className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-sm border border-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group max-w-sm mx-auto w-full"
                >
                  <div className="w-12 h-12 bg-zinc-900 rounded-sm flex-shrink-0 flex items-center justify-center border border-white/10 group-hover:border-primary/20 overflow-hidden">
                    {nextTrack.coverImage ? (
                      <img src={nextTrack.coverImage} alt={nextTrack.title} className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-5 h-5 text-zinc-700 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-bold text-white uppercase truncate group-hover:text-primary transition-colors">{nextTrack.title}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">by {nextTrack.creatorName}</p>
                  </div>
                  <SkipForward className="w-4 h-4 text-zinc-700 group-hover:text-primary transition-colors flex-shrink-0" />
                </motion.button>
              </div>
            )}

            {/* LYRICS SECTION */}
            <div className="pt-12 w-full max-w-2xl mx-auto">
              <div className="flex items-center gap-3 justify-center mb-6 text-zinc-500">
                <div className="h-[1px] flex-1 bg-white/5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">LYRICS</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              <div className="space-y-6 text-xl md:text-2xl font-bold text-zinc-400 text-center leading-relaxed">
                {track.lyrics ? (
                  track.lyrics.split("\n").map((line: string, i: number) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0.3 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="hover:text-white transition-colors cursor-default"
                    >
                      {line}
                    </motion.p>
                  ))
                ) : (
                  <p className="italic opacity-30 text-sm uppercase tracking-widest">Synthesizing narrative streams...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
