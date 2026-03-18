import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Swords,
  ChevronRight,
  Trophy,
  Music2,
  Zap,
  Headphones,
  Vote,
  BarChart3,
  ListMusic,
  Plus,
} from "lucide-react";
import {
  YoutubePlayer,
  extractYoutubeId,
  buildIframeEmbedUrl,
} from "@/components/YoutubePlayer";

type Phase =
  | "genre-select"
  | "loading"
  | "track-a"
  | "track-b"
  | "vote"
  | "result";

interface BattleTrack {
  id: number;
  title: string;
  creatorName: string;
  genre: string;
  audioUrl: string;
  musicVideoUrl?: string;
  coverImage?: string;
  rankingScore: number;
}

interface BattleData {
  id: number;
  genre: string;
  trackAId: number;
  trackBId: number;
  trackAVotes: number;
  trackBVotes: number;
  winnerId: number | null;
  trackA: BattleTrack;
  trackB: BattleTrack;
}

const PREVIEW_DURATION = 20;

function PreviewProgressBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-3">
      <motion.div
        className="h-full bg-primary rounded-full animate-progress-glow"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: PREVIEW_DURATION, ease: "linear" }}
        style={{ boxShadow: "2px 0 8px hsla(189, 100%, 50%, 0.8)" }}
      />
    </div>
  );
}

function BattleTrackPlayer({
  track,
  label,
  autoplay = false,
  onEnded,
}: {
  track: BattleTrack;
  label: string;
  autoplay?: boolean;
  onEnded?: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!autoplay) return;

    timerRef.current = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (onEnded) onEnded();
    }, PREVIEW_DURATION * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoplay, onEnded]);

  const rawUrl = track.musicVideoUrl || track.audioUrl;
  const ytId = extractYoutubeId(rawUrl);
  const isDirectAudio = !ytId && rawUrl && (rawUrl.endsWith(".mp3") || rawUrl.endsWith(".wav") || rawUrl.endsWith(".ogg") || rawUrl.endsWith(".m4a") || rawUrl.endsWith(".webm"));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold tracking-[0.3em] text-primary/60 uppercase">
          {label}
        </span>
        <div className="h-px flex-1 bg-primary/10" />
        <span className="hidden md:inline text-[9px] font-bold tracking-[0.3em] text-zinc-600 uppercase">
          {PREVIEW_DURATION}s preview
        </span>
      </div>
      <div className={`border border-white/10 rounded-2xl overflow-hidden bg-black/40 transition-premium battle-player-container ${autoplay ? "animate-neon-pulse ring-1 ring-primary/30" : ""}`} style={{ maxHeight: "40vh" }}>
        {ytId ? (
          <YoutubePlayer
            videoId={ytId}
            autoplay={autoplay}
            battleMode={true}
            onEnded={onEnded}
          />
        ) : isDirectAudio ? (
          <div className="w-full aspect-video flex items-center justify-center bg-black/60" style={{ maxHeight: "40vh" }}>
            <audio
              ref={(el) => {
                audioRef.current = el;
                if (el && autoplay) {
                  el.currentTime = Math.max(0, (el.duration || 60) * 0.5);
                  el.play().catch(() => {});
                }
              }}
              src={rawUrl}
              className="hidden"
              onLoadedMetadata={(e) => {
                const audio = e.currentTarget;
                audio.currentTime = Math.max(0, audio.duration * 0.5);
              }}
            />
            <Music2 className="w-8 h-8 text-primary animate-pulse" />
          </div>
        ) : rawUrl ? (
          <div className="aspect-video" style={{ maxHeight: "40vh" }}>
            <iframe
              src={buildIframeEmbedUrl(rawUrl, autoplay)}
              className="w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen"
              allowFullScreen
              title={track.title}
            />
          </div>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center text-zinc-600" style={{ maxHeight: "40vh" }}>
            <Music2 className="w-8 h-8" />
          </div>
        )}
      </div>
      <PreviewProgressBar active={autoplay} />
      <div>
        <p
          className="text-sm font-bold text-white truncate"
          data-testid={`text-battle-title-${track.id}`}
        >
          {track.title}
        </p>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
          {track.creatorName}
        </p>
      </div>
    </div>
  );
}

export function Battle() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("genre-select");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [voteResult, setVoteResult] = useState<{
    trackAVotes: number;
    trackBVotes: number;
    winnerId: number;
    trackAWinStreak: number;
    trackBWinStreak: number;
  } | null>(null);
  const [listenedA, setListenedA] = useState(false);
  const [listenedB, setListenedB] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [showFlash, setShowFlash] = useState(false);
  const [votedId, setVotedId] = useState<number | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextBattleRef = useRef<() => void>(() => {});

  const { data: dailyCount } = useQuery<{ count: number; dailyMax: number }>({
    queryKey: ["/api/battles/daily-count"],
    enabled: isAuthenticated,
  });

  const { data: todayStats } = useQuery<{
    totalVotesToday: number;
    battlesPlayedToday: number;
    tracksInPool: number;
    newTracksToday: number;
  }>({
    queryKey: ["/api/stats/today"],
    refetchInterval: 60000,
  });

  const dailyMax = dailyCount?.dailyMax ?? 5;
  const displayCount = dailyCount ? Math.min(dailyCount.count, dailyMax) : 0;
  const limitReached = dailyCount ? dailyCount.count >= dailyMax : false;
  const limitReachedRef = useRef(limitReached);
  limitReachedRef.current = limitReached;

  const createBattleMutation = useMutation({
    mutationFn: (genre: string) =>
      apiRequest("POST", "/api/battles/new", { genre }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setBattle(data);
      setPhase("track-a");
    },
    onError: () => {
      toast({
        title: "Could not start battle",
        description: "Not enough tracks in this genre.",
        variant: "destructive",
      });
      setPhase("genre-select");
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({
      battleId,
      trackId,
    }: {
      battleId: number;
      trackId: number;
    }) => apiRequest("POST", `/api/battles/${battleId}/vote`, { trackId }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setVoteResult(data);
      setPhase("result");
      setVotedId(null);
      setCountdown(7);
      autoAdvanceRef.current = setTimeout(() => {
        nextBattleRef.current();
      }, 7000);
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/battles/daily-count"] });
    },
    onError: (err: any) => {
      setVotedId(null);
      if (err?.message?.includes("409") || err?.status === 409) {
        toast({
          title: "Already voted",
          description: "You can only vote once per battle.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Vote failed", variant: "destructive" });
      }
    },
  });

  const startBattle = useCallback(
    (genre: string) => {
      if (limitReachedRef.current) {
        setPhase("genre-select");
        return;
      }
      setSelectedGenre(genre);
      setPhase("loading");
      setListenedA(false);
      setListenedB(false);
      createBattleMutation.mutate(genre);
    },
    [createBattleMutation],
  );

  const nextBattle = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setCountdown(0);
    setBattle(null);
    setVoteResult(null);
    setListenedA(false);
    setListenedB(false);
    if (limitReachedRef.current) {
      setPhase("genre-select");
      return;
    }
    setPhase("loading");
    createBattleMutation.mutate(selectedGenre);
  }, [selectedGenre, createBattleMutation]);

  nextBattleRef.current = nextBattle;

  useEffect(() => {
    if (phase !== "result" || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, countdown > 0]);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    };
  }, []);

  const castVote = useCallback(
    (trackId: number) => {
      if (!isAuthenticated) {
        toast({
          title: "Login required",
          description: "You must be logged in to vote.",
          variant: "destructive",
        });
        return;
      }
      if (!battle) return;
      setVotedId(trackId);
      setShowFlash(true);
      setTimeout(() => {
        voteMutation.mutate({ battleId: battle.id, trackId });
      }, 300);
      setTimeout(() => {
        setShowFlash(false);
      }, 600);
    },
    [isAuthenticated, battle, voteMutation],
  );

  const winnerTrack =
    voteResult && battle
      ? voteResult.winnerId === battle.trackAId
        ? battle.trackA
        : battle.trackB
      : null;

  return (
    <div className="fixed inset-0 z-40 bg-black overflow-hidden flex items-center justify-center pt-20 battle-outer-wrapper">
    <div className="max-w-3xl w-full mx-auto px-6 md:px-12 h-full overflow-hidden battle-page-container">
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="vote-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-50 pointer-events-none bg-white"
            data-testid="vote-flash-overlay"
          />
        )}
      </AnimatePresence>
      <div className="mb-3 text-center pt-2">
        <div className="flex items-center justify-center gap-3 mb-1 mt-[10px] md:mt-0">
          <Swords className="w-4 h-4 text-primary" />
          <h1 className="text-[10px] font-bold tracking-[0.4em] uppercase text-primary text-center" data-testid="heading-battle-arena">
            NEX BATTLE ARENA
          </h1>
        </div>
        <h2 className="text-sm md:text-2xl font-display font-black text-white tracking-tight neon-text-green text-center">
          GLOBAL AI MUSIC BATTLE
        </h2>
        {selectedGenre && phase !== "genre-select" && (
          <p className="text-zinc-500 text-[10px] mt-1 uppercase tracking-widest">
            Any Genre Battle
          </p>
        )}
        {isAuthenticated && dailyCount && (
          <div className="mt-1 flex items-center justify-center gap-2" data-testid="battle-progress-indicator">
            <Headphones className="w-3 h-3 text-primary/60" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Battle {displayCount} / {dailyMax} today
            </span>
          </div>
        )}
      </div>

      <div className="mb-3 premium-card p-3 battle-stats-panel" data-testid="panel-today-stats">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400">
            🔥 TODAY BATTLE STATS
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="text-center" data-testid="stat-votes-today">
            <Vote className="w-3 h-3 text-primary mx-auto mb-0.5" />
            <p className="text-sm font-display font-bold text-white">{todayStats?.totalVotesToday ?? 0}</p>
            <p className="text-[7px] uppercase tracking-widest text-zinc-600">Votes Today</p>
          </div>
          <div className="text-center" data-testid="stat-battles-today">
            <BarChart3 className="w-3 h-3 text-primary mx-auto mb-0.5" />
            <p className="text-sm font-display font-bold text-white">{todayStats?.battlesPlayedToday ?? 0}</p>
            <p className="text-[7px] uppercase tracking-widest text-zinc-600">Battles Played</p>
          </div>
          <div className="text-center" data-testid="stat-tracks-pool">
            <ListMusic className="w-3 h-3 text-primary mx-auto mb-0.5" />
            <p className="text-sm font-display font-bold text-white">{todayStats?.tracksInPool ?? 0}</p>
            <p className="text-[7px] uppercase tracking-widest text-zinc-600">Battle Pool</p>
          </div>
          <div className="text-center" data-testid="stat-new-tracks">
            <Plus className="w-3 h-3 text-primary mx-auto mb-0.5" />
            <p className="text-sm font-display font-bold text-white">{todayStats?.newTracksToday ?? 0}</p>
            <p className="text-[7px] uppercase tracking-widest text-zinc-600">New Tracks</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "genre-select" && (
          <motion.div
            key="genre-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-8"
          >
            {limitReached ? (
              <p className="text-lg font-bold text-zinc-300 uppercase tracking-wider" data-testid="text-daily-limit-reached">
                Daily battle limit reached. Come back tomorrow.
              </p>
            ) : (
              <button
                onClick={() => startBattle("ALL")}
                data-testid="button-start-battle"
                className="px-10 py-5 glass-button text-primary text-sm font-bold uppercase tracking-[0.3em] rounded-xl transition-premium hover:scale-105"
              >
                ⚡ NOW START BATTLE ⚡
              </button>
            )}
          </motion.div>
        )}

        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 gap-3"
          >
            <Zap className="w-8 h-8 text-primary animate-pulse" />
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-500">
              Loading Battle…
            </p>
          </motion.div>
        )}

        {phase === "track-a" && battle && (
          <motion.div
            key="track-a"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-[10px] font-bold">
                A
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                Now Playing — Track A ({PREVIEW_DURATION}s Preview)
              </p>
            </div>
            <BattleTrackPlayer
              track={battle.trackA}
              label="Track A"
              autoplay={true}
              onEnded={() => {
                setListenedA(true);
                setPhase("track-b");
              }}
            />
          </motion.div>
        )}

        {phase === "vote" && (
          <div className="flex justify-center items-center my-1 md:my-3">
            <div
              className="text-xl md:text-3xl font-display font-black italic text-primary tracking-wider cursor-default select-none vs-glitch"
              data-testid="text-vs-label"
            >
              ⚡ VS ⚡
            </div>
          </div>
        )}

        {phase === "track-b" && battle && (
          <motion.div
            key="track-b"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[10px] font-bold">
                B
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                Now Playing — Track B ({PREVIEW_DURATION}s Preview)
              </p>
            </div>
            <BattleTrackPlayer
              track={battle.trackB}
              label="Track B"
              autoplay={true}
              onEnded={() => {
                setListenedB(true);
                setPhase("vote");
              }}
            />
          </motion.div>
        )}

        {phase === "vote" && battle && (
          <motion.div
            key="vote"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${listenedA ? "text-primary" : "text-zinc-600"}`}
              >
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] border ${listenedA ? "bg-primary/10 border-primary/40 text-primary" : "bg-white/3 border-white/10 text-zinc-600"}`}
                >
                  A
                </span>
                {listenedA ? "✓ Listened" : "Not listened"}
              </div>
              <div className="h-px flex-1 bg-white/5" />
              <div
                className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${listenedB ? "text-blue-400" : "text-zinc-600"}`}
              >
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] border ${listenedB ? "bg-blue-500/10 border-blue-500/40 text-blue-400" : "bg-white/3 border-white/10 text-zinc-600"}`}
                >
                  B
                </span>
                {listenedB ? "✓ Listened" : "Not listened"}
              </div>
            </div>

            {(!listenedA || !listenedB) && (
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest text-center mb-2">
                Listen to both tracks before voting
              </p>
            )}

            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-1 md:mb-3">
              Which track wins the {selectedGenre} battle?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 battle-vote-grid">
              <div
                className={`premium-card p-4 flex flex-col gap-3 transition-premium ${listenedA && listenedB ? "" : "opacity-60"}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-[9px] font-bold">
                    A
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500">
                    Track A
                  </span>
                </div>
                <div>
                  <p
                    className="font-bold text-white text-sm"
                    data-testid="text-vote-track-a-title"
                  >
                    {battle.trackA.title}
                  </p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">
                    {battle.trackA.creatorName}
                  </p>
                </div>
                <button
                  onClick={() => castVote(battle.trackAId)}
                  disabled={voteMutation.isPending || showFlash || !listenedA || !listenedB}
                  data-testid="button-vote-track-a"
                  className={`w-full py-2.5 glass-button text-primary text-[11px] font-bold uppercase tracking-[0.25em] rounded-xl transition-premium disabled:opacity-40 disabled:cursor-not-allowed ${votedId === battle.trackAId ? "animate-vote-pulse brightness-150 ring-2 ring-primary/60" : ""}`}
                >
                  Vote Track A
                </button>
              </div>

              <div
                className={`premium-card p-4 flex flex-col gap-3 transition-premium ${listenedA && listenedB ? "" : "opacity-60"}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[9px] font-bold">
                    B
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500">
                    Track B
                  </span>
                </div>
                <div>
                  <p
                    className="font-bold text-white text-sm"
                    data-testid="text-vote-track-b-title"
                  >
                    {battle.trackB.title}
                  </p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">
                    {battle.trackB.creatorName}
                  </p>
                </div>
                <button
                  onClick={() => castVote(battle.trackBId)}
                  disabled={voteMutation.isPending || showFlash || !listenedA || !listenedB}
                  data-testid="button-vote-track-b"
                  className={`w-full py-2.5 rounded-xl transition-premium disabled:opacity-40 disabled:cursor-not-allowed text-blue-400 text-[11px] font-bold uppercase tracking-[0.25em] ${votedId === battle.trackBId ? "animate-vote-pulse brightness-150 ring-2 ring-blue-400/60" : ""}`}
                  style={{ background: "hsla(220, 100%, 60%, 0.08)", backdropFilter: "blur(12px)", border: "1px solid hsla(220, 100%, 60%, 0.25)" }}
                >
                  Vote Track B
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "result" && battle && voteResult && (() => {
          const totalVotes = voteResult.trackAVotes + voteResult.trackBVotes;
          const pctA = totalVotes > 0 ? Math.round((voteResult.trackAVotes / totalVotes) * 100) : 50;
          const pctB = totalVotes > 0 ? 100 - pctA : 50;
          return (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-4"
          >
            <div className="space-y-2">
              <Trophy className="w-8 h-8 text-primary mx-auto" />
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">
                Battle Result
              </p>
            </div>

            {winnerTrack && (
              <div className="space-y-1">
                <p className="text-2xl font-display font-black text-white uppercase tracking-tight">
                  {winnerTrack.title}
                </p>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest">
                  by {winnerTrack.creatorName}
                </p>
                <p className="text-[8px] text-zinc-700 uppercase tracking-[0.2em]">AI Music Creator</p>
              </div>
            )}

            <div className="space-y-3 max-w-md mx-auto text-left">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{battle.trackA.title}</span>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-widest">{battle.trackA.creatorName}</p>
                    <p className="text-[7px] text-zinc-700 uppercase tracking-[0.2em]">AI Music Creator</p>
                    {voteResult.trackAWinStreak > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-lg text-[8px] font-bold border border-orange-500/20" data-testid="text-result-streak-a">
                        🔥 WIN STREAK: {voteResult.trackAWinStreak}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-white" data-testid="text-result-pct-a">{pctA}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pctA}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    data-testid="bar-result-a"
                    style={{ boxShadow: "2px 0 8px hsla(189, 100%, 50%, 0.6)" }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{battle.trackB.title}</span>
                    <p className="text-[8px] text-zinc-600 uppercase tracking-widest">{battle.trackB.creatorName}</p>
                    <p className="text-[7px] text-zinc-700 uppercase tracking-[0.2em]">AI Music Creator</p>
                    {voteResult.trackBWinStreak > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-lg text-[8px] font-bold border border-orange-500/20" data-testid="text-result-streak-b">
                        🔥 WIN STREAK: {voteResult.trackBWinStreak}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-white" data-testid="text-result-pct-b">{pctB}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pctB}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                    data-testid="bar-result-b"
                    style={{ boxShadow: "2px 0 8px hsla(220, 100%, 60%, 0.6)" }}
                  />
                </div>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-widest text-zinc-500" data-testid="text-total-votes">
              Total Votes: {totalVotes}
            </p>

            <div className="space-y-2">
              {countdown > 0 && (
                <div className="flex flex-col items-center gap-1" data-testid="text-next-battle-countdown">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={countdown}
                      initial={{ opacity: 0, scale: 1.3 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="text-lg font-display font-bold text-primary"
                    >
                      Next battle in {countdown}
                    </motion.p>
                  </AnimatePresence>
                </div>
              )}
              <button
                onClick={nextBattle}
                data-testid="button-next-battle"
                className="px-8 py-3 glass-button text-primary font-bold text-[11px] uppercase tracking-[0.25em] rounded-xl transition-premium"
              >
                Next Battle <ChevronRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
    </div>
  );
}
