import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useToast } from "@/hooks/use-toast";
import {
  Radio, SkipForward, Heart, Shuffle, Play,
  Music2, Mic2, Zap, Waves, Bot, ChevronRight,
  Loader2, List
} from "lucide-react";
import { YoutubePlayer, extractYoutubeId, buildIframeEmbedUrl } from "@/components/YoutubePlayer";

type Track = {
  id: number;
  title: string;
  creatorName: string;
  genre: string;
  audioUrl: string;
  musicVideoUrl?: string;
  lyrics?: string;
  votes: number;
  rankingScore: number;
  neoScore: number;
  status: string;
};

type Station = {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  genre?: string;
  color: string;
};

const STATIONS: Station[] = [
  { id: "top100",     label: "NEX TOP 100",       sublabel: "Ranked by NEX Score",    icon: Radio,  genre: undefined,     color: "text-primary border-primary/40 bg-primary/5"     },
  { id: "electronic", label: "Electronic Radio",  sublabel: "Electronic genre",       icon: Zap,    genre: "Electronic",  color: "text-blue-400 border-blue-400/40 bg-blue-400/5"  },
  { id: "synth",      label: "Synth Radio",       sublabel: "Synth Pop genre",        icon: Music2, genre: "Synth Pop",   color: "text-violet-400 border-violet-400/40 bg-violet-400/5" },
  { id: "aipop",      label: "AI Pop Radio",      sublabel: "AI Pop genre",           icon: Bot,    genre: "AI Pop",      color: "text-pink-400 border-pink-400/40 bg-pink-400/5"  },
  { id: "ambient",    label: "Ambient Radio",     sublabel: "Ambient genre",          icon: Waves,  genre: "Ambient",     color: "text-teal-400 border-teal-400/40 bg-teal-400/5"  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function NexRadio() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [activeStation, setActiveStation] = useState<Station>(STATIONS[0]);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [radioStarted, setRadioStarted] = useState(false);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [showQueue, setShowQueue] = useState(false);
  const playerKey = useRef(0);

  const playlistRef = useRef<Track[]>([]);
  const currentIndexRef = useRef(0);

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ["/api/tracks", "radio", activeStation.genre],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100", sortBy: "neoScore" });
      if (activeStation.genre) params.set("genre", activeStation.genre);
      const res = await fetch(`/api/tracks?${params.toString()}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (tracks.length > 0) {
      const shuffled = shuffle(tracks);
      setPlaylist(shuffled);
      setCurrentIndex(0);
      playerKey.current += 1;
    }
  }, [activeStation.id, tracks.length]);

  const currentTrack = playlist[currentIndex] ?? null;
  const neoRank = currentTrack
    ? tracks.findIndex((t) => t.id === currentTrack.id) + 1
    : null;

  // Prefer YouTube (musicVideoUrl) over other platforms — YT gives reliable end-of-video events
  const activeUrl = radioStarted && currentTrack
    ? (currentTrack.musicVideoUrl || currentTrack.audioUrl)
    : null;
  const ytVideoId = activeUrl ? extractYoutubeId(activeUrl) : null;
  const iframeUrl = (activeUrl && !ytVideoId)
    ? buildIframeEmbedUrl(activeUrl, true)
    : null;

  const advanceTrack = useCallback(() => {
    const len = Math.max(playlistRef.current.length, 1);
    const next = (currentIndexRef.current + 1) % len;
    playerKey.current += 1;
    setCurrentIndex(next);
  }, []);

  const startRadio = (station: Station) => {
    setActiveStation(station);
    setRadioStarted(true);
    playerKey.current += 1;
  };

  const handleNext = () => {
    playerKey.current += 1;
    const len = Math.max(playlist.length, 1);
    setCurrentIndex((i) => (i + 1) % len);
  };

  const likeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/tracks/${id}/like`).then((r) => r.json()),
    onSuccess: (_, id) => {
      setLiked((prev) => new Set([...prev, id]));
      toast({ title: "Liked!", description: "Added to your liked tracks." });
    },
    onError: () =>
      toast({ title: "Login required", description: "Log in to like tracks.", variant: "destructive" }),
  });

  const handleLike = () => {
    if (!currentTrack) return;
    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Log in to like tracks.", variant: "destructive" });
      return;
    }
    if (!liked.has(currentTrack.id)) {
      likeMutation.mutate(currentTrack.id);
    }
  };

  const stationColor = activeStation.color.split(" ")[0];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 mb-1">NEX Platform</p>
        <h1 data-testid="heading-radio" className="text-2xl font-black uppercase tracking-[0.15em] text-white flex items-center gap-3">
          <Radio className="w-5 h-5 text-primary" />
          NEX RADIO
        </h1>
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">
          AI Music · Continuous Playback · Top Tracks
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* ── Station List ── */}
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 px-1 mb-3">Stations</p>
          {STATIONS.map((station) => {
            const Icon = station.icon;
            const isActive = activeStation.id === station.id;
            return (
              <button
                key={station.id}
                onClick={() => startRadio(station)}
                data-testid={`button-station-${station.id}`}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-sm border transition-all text-left",
                  isActive
                    ? station.color
                    : "border-white/5 text-zinc-500 hover:text-white hover:border-white/10 bg-black/20"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className={clsx("text-[10px] font-black uppercase tracking-widest leading-none", isActive ? "" : "")}>{station.label}</p>
                  <p className="text-[8px] uppercase tracking-widest opacity-60 mt-0.5 leading-none">{station.sublabel}</p>
                </div>
                {isActive && radioStarted && (
                  <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest animate-pulse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    Live
                  </span>
                )}
              </button>
            );
          })}

          {/* Queue toggle */}
          {radioStarted && playlist.length > 0 && (
            <button
              onClick={() => setShowQueue((v) => !v)}
              data-testid="button-toggle-queue"
              className="w-full flex items-center gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-300 border border-white/5 rounded-sm transition-all mt-2"
            >
              <List className="w-3 h-3" />
              {showQueue ? "Hide Queue" : `Queue · ${playlist.length} tracks`}
            </button>
          )}

          {/* Queue list */}
          <AnimatePresence>
            {showQueue && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-white/5 rounded-sm overflow-hidden bg-black/20"
              >
                <div className="max-h-64 overflow-y-auto">
                  {playlist.slice(0, 20).map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => { setCurrentIndex(i); playerKey.current += 1; }}
                      data-testid={`button-queue-item-${t.id}`}
                      className={clsx(
                        "w-full flex items-center gap-2 px-3 py-2 text-left transition-all border-b border-white/5 last:border-0",
                        i === currentIndex
                          ? "bg-primary/10 text-primary"
                          : "text-zinc-500 hover:text-white hover:bg-white/3"
                      )}
                    >
                      <span className="text-[8px] font-mono w-4 shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase tracking-wider truncate">{t.title}</p>
                        <p className="text-[8px] opacity-60 truncate">{t.creatorName}</p>
                      </div>
                    </button>
                  ))}
                  {playlist.length > 20 && (
                    <div className="px-3 py-2 text-[8px] text-zinc-700 uppercase tracking-widest text-center">
                      +{playlist.length - 20} more tracks
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Player Area ── */}
        <div className="space-y-4">
          {!radioStarted ? (
            /* Welcome / Start screen */
            <div className="border border-white/5 rounded-sm bg-black/20 flex flex-col items-center justify-center py-24 px-8 text-center">
              <div className="w-16 h-16 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mb-6">
                <Radio className="w-7 h-7 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 mb-2">
                NEX Platform
              </p>
              <h2 className="text-xl font-black uppercase tracking-[0.15em] text-white mb-2">
                NEX Radio
              </h2>
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-8 max-w-xs">
                Continuous AI music from the NEX chart. Select a station or start the top 100.
              </p>
              <button
                onClick={() => startRadio(STATIONS[0])}
                data-testid="button-start-radio"
                className="flex items-center gap-3 px-8 py-3 border border-primary/40 text-primary bg-primary/10 hover:bg-primary/25 rounded-sm text-[11px] font-black uppercase tracking-[0.3em] transition-all"
              >
                <Play className="w-4 h-4" />
                Start Radio
              </button>
              <p className="text-[8px] text-zinc-700 uppercase tracking-widest mt-4">
                {isLoading ? "Loading tracks..." : `${tracks.length} tracks available`}
              </p>
            </div>
          ) : (
            <>
              {/* NOW PLAYING header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-primary animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    On Air
                  </span>
                  <span className="text-[8px] text-zinc-700 uppercase tracking-widest">{activeStation.label}</span>
                </div>
                <div className="flex items-center gap-1 text-[8px] text-zinc-700 uppercase tracking-widest">
                  <Shuffle className="w-3 h-3" />
                  Shuffled
                </div>
              </div>

              {/* Player embed */}
              <div className="border border-white/5 rounded-sm overflow-hidden bg-black relative">
                {isLoading ? (
                  <div className="aspect-video flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
                  </div>
                ) : ytVideoId ? (
                  <YoutubePlayer
                    key={playerKey.current}
                    videoId={ytVideoId}
                    autoplay={true}
                    onEnded={advanceTrack}
                  />
                ) : iframeUrl ? (
                  <div className="aspect-video">
                    <iframe
                      key={playerKey.current}
                      src={iframeUrl}
                      data-testid="iframe-radio-player"
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; fullscreen"
                      allowFullScreen
                      title={`Radio: ${currentTrack?.title ?? "Track"}`}
                    />
                  </div>
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center gap-3">
                    <Music2 className="w-10 h-10 text-zinc-800" strokeWidth={1} />
                    <p className="text-[10px] text-zinc-700 uppercase tracking-widest">
                      {playlist.length === 0 ? "No tracks available for this station" : "No playable link for this track"}
                    </p>
                    {playlist.length > 0 && (
                      <button onClick={handleNext} className="text-[9px] text-primary/70 hover:text-primary uppercase tracking-widest transition-colors">
                        Try next track →
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Track info + controls */}
              {currentTrack ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="border border-white/5 rounded-sm bg-black/20 p-5"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {neoRank && (
                            <span className="text-[8px] font-black text-primary/60 border border-primary/20 px-1.5 py-0.5 rounded-sm">
                              #{neoRank}
                            </span>
                          )}
                          <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest border border-white/5 px-1.5 py-0.5 rounded-sm">
                            {currentTrack.genre}
                          </span>
                        </div>
                        <h2
                          data-testid="text-now-playing-title"
                          className="text-lg font-black uppercase tracking-[0.1em] text-white leading-tight truncate"
                        >
                          {currentTrack.title}
                        </h2>
                        <p
                          data-testid="text-now-playing-artist"
                          className="text-[11px] text-zinc-400 uppercase tracking-widest mt-0.5 flex items-center gap-1"
                        >
                          <Mic2 className="w-3 h-3 shrink-0" />
                          {currentTrack.creatorName}
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={handleLike}
                          disabled={liked.has(currentTrack.id) || likeMutation.isPending}
                          data-testid="button-like"
                          title={liked.has(currentTrack.id) ? "Liked" : "Like this track"}
                          className={clsx(
                            "flex items-center gap-1.5 px-3 py-2 border rounded-sm text-[9px] font-bold uppercase tracking-widest transition-all",
                            liked.has(currentTrack.id)
                              ? "text-pink-400 border-pink-400/40 bg-pink-400/10"
                              : "text-zinc-500 border-white/10 hover:text-pink-400 hover:border-pink-400/30 hover:bg-pink-400/5"
                          )}
                        >
                          <Heart className={clsx("w-3.5 h-3.5", liked.has(currentTrack.id) && "fill-current")} />
                          {liked.has(currentTrack.id) ? "Liked" : "Like"}
                        </button>
                        <button
                          onClick={handleNext}
                          data-testid="button-next-track"
                          className="flex items-center gap-1.5 px-3 py-2 border border-white/10 rounded-sm text-[9px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                          Next
                        </button>
                      </div>
                    </div>

                    {/* Track stats */}
                    <div className="flex items-center gap-4 text-[8px] text-zinc-600 uppercase tracking-widest border-t border-white/5 pt-3 mb-4">
                      <span>{currentTrack.votes.toLocaleString()} votes</span>
                      <span>NEX {currentTrack.neoScore?.toFixed(1)}</span>
                      <span>Rank {currentTrack.rankingScore?.toFixed(0)}</span>
                      <span className="ml-auto">{currentIndex + 1} / {playlist.length}</span>
                    </div>

                    {/* Lyrics */}
                    {currentTrack.lyrics && (
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-700 mb-3 flex items-center gap-2">
                          <ChevronRight className="w-3 h-3" />
                          Lyrics
                        </p>
                        <div className="max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                          <pre
                            data-testid="text-lyrics"
                            className="text-[10px] text-zinc-500 leading-relaxed font-sans whitespace-pre-wrap"
                          >
                            {currentTrack.lyrics}
                          </pre>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              ) : !isLoading && playlist.length === 0 ? (
                <div className="border border-white/5 rounded-sm bg-black/10 p-6 text-center">
                  <Music2 className="w-8 h-8 text-zinc-800 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                    No tracks available for this station yet
                  </p>
                  <p className="text-[9px] text-zinc-700 mt-1 uppercase tracking-widest">
                    Try another station or submit tracks
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
