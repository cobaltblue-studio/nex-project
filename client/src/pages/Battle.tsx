import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ChevronRight,
  Trophy,
  Music2,
  Zap,
  Vote,
  BarChart3,
  ListMusic,
  Plus,
  CircleHelp,
  Loader2,
} from "lucide-react";
import {
  YoutubePlayer,
  extractYoutubeId,
  warmYoutubeIframeApi,
} from "@/components/YoutubePlayer";
import { classifyStreamingSource } from "@/lib/streamingEmbed";
import { usePlayableStreamingSrc } from "@/hooks/use-playable-streaming-src";
import { SunoEmbedOutboundShield } from "@/components/SunoEmbedOutboundShield";

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
  coverImageUrl?: string | null;
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

function isDirectAudioUrl(rawUrl: string, ytId: string | null): boolean {
  return (
    !ytId &&
    !!rawUrl &&
    (rawUrl.endsWith(".mp3") ||
      rawUrl.endsWith(".wav") ||
      rawUrl.endsWith(".ogg") ||
      rawUrl.endsWith(".m4a") ||
      rawUrl.endsWith(".webm"))
  );
}

function BattleBlindCard({
  track,
  badge,
  accentClass,
  buttonClassName,
  canVote,
  disabled,
  isVoted,
  isWinner,
  isRevealed,
  voteReady,
  onVote,
  dataTestIdPrefix,
}: {
  track: BattleTrack;
  badge: string;
  accentClass: string;
  buttonClassName: string;
  canVote: boolean;
  disabled: boolean;
  isVoted: boolean;
  isWinner: boolean;
  isRevealed: boolean;
  voteReady: boolean;
  onVote: () => void;
  dataTestIdPrefix: string;
}) {
  const maskedLabel = "[ ????? ]  🤫 UNLOCK AFTER VOTE";
  return (
    <motion.div
      className={[
        "premium-card p-4 flex flex-col gap-3 transition-premium battle-blind-card",
        canVote ? "" : "opacity-60",
        isVoted && isWinner ? "battle-winner-focus" : "",
        isVoted && !isWinner ? "battle-loser-dimmed" : "",
      ].join(" ")}
      animate={{
        opacity: isVoted && !isWinner ? 0.3 : 1,
        scale: isVoted && isWinner ? 1.02 : 1,
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-6 h-6 rounded-lg border flex items-center justify-center text-[9px] font-bold ${accentClass}`}
        >
          {badge}
        </div>
        <span className="text-[9px] uppercase tracking-widest text-zinc-500">
          Track {badge}
        </span>
      </div>
      <div className="battle-cover-shell">
        {track.coverImageUrl ? (
          <img
            src={track.coverImageUrl}
            alt={`${track.title} cover`}
            className={[
              "battle-cover-image transition-premium",
              isRevealed ? "battle-cover-revealed" : "battle-cover-hidden",
            ].join(" ")}
          />
        ) : (
          <div className="battle-cover-fallback">
            <Music2 className="w-8 h-8 text-zinc-700" />
          </div>
        )}
        {!isRevealed && (
          <div className="battle-cover-overlay">
            <CircleHelp className="w-7 h-7 text-primary/80" />
          </div>
        )}
      </div>
      <div>
        {isRevealed ? (
          <>
            <p
              className="font-bold text-white text-sm transition-premium battle-reveal-text"
              data-testid={`text-${dataTestIdPrefix}-title`}
            >
              {track.title}
            </p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5 transition-premium battle-reveal-text">
              {track.creatorName}
            </p>
          </>
        ) : (
          <p
            className="font-bold text-white text-[11px] uppercase tracking-[0.14em] transition-premium whitespace-pre"
            data-testid={`text-${dataTestIdPrefix}-title`}
          >
            {maskedLabel}
          </p>
        )}
      </div>
      <button
        onClick={onVote}
        disabled={disabled}
        data-testid={`button-vote-${dataTestIdPrefix.replace("vote-", "")}`}
        className={`${buttonClassName} relative overflow-hidden ${voteReady && !isVoted ? "battle-vote-ready-glow" : ""}`}
      >
        {!isVoted && <span className="battle-vote-lock-fill" style={{ width: `${voteReady ? 100 : 0}%` }} aria-hidden="true" />}
        <span className="relative z-[1]">
          {isVoted
            ? `VOTED TRACK ${badge}`
            : voteReady
              ? `VOTE TRACK ${badge}`
              : "LISTEN FIRST"}
        </span>
      </button>
    </motion.div>
  );
}

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
  const isDirectAudio = isDirectAudioUrl(rawUrl, ytId);
  const iframeKind = rawUrl && !ytId ? classifyStreamingSource(rawUrl) : "other";
  const { iframeSrc: battleIframeSrc, loading: battleStreamLoading } = usePlayableStreamingSrc(
    rawUrl && !ytId && !isDirectAudio ? rawUrl : undefined,
    { autoplay, enableJsApi: false },
  );

  return (
    <div className="flex flex-col gap-2 battle-player-stage">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold tracking-[0.3em] text-primary/60 uppercase">
          {label}
        </span>
        <div className="h-px flex-1 bg-primary/10" />
        <span className="hidden md:inline text-[9px] font-bold tracking-[0.3em] text-zinc-600 uppercase">
          20S PREVIEW
        </span>
      </div>
      <span className="battle-preview-label md:hidden text-zinc-600 uppercase">
        (20S PREVIEW)
      </span>
      <div className={`border border-white/10 rounded-2xl overflow-hidden bg-black/40 transition-premium battle-player-container ${autoplay ? "animate-neon-pulse ring-1 ring-primary/30" : ""}`} style={{ maxHeight: "32vh" }}>
        {ytId ? (
          <YoutubePlayer
            videoId={ytId}
            autoplay={autoplay}
            battleMode={true}
            onEnded={onEnded}
          />
        ) : isDirectAudio ? (
          <div className="w-full aspect-[21/9] flex items-center justify-center bg-black/60" style={{ maxHeight: "32vh" }}>
            <audio
              ref={(el) => {
                audioRef.current = el;
              }}
              src={rawUrl}
              preload="auto"
              className="hidden"
              onLoadedMetadata={(e) => {
                const audio = e.currentTarget;
                if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
                audio.currentTime = Math.max(0, audio.duration * 0.5);
                if (autoplay) audio.play().catch(() => {});
              }}
            />
            <Music2 className="w-8 h-8 text-primary animate-pulse" />
          </div>
        ) : rawUrl ? (
          <div className="aspect-[21/9] flex items-center justify-center" style={{ maxHeight: "32vh" }}>
            {battleStreamLoading && !battleIframeSrc ? (
              <Loader2 className="w-8 h-8 text-primary/60 animate-spin" />
            ) : battleIframeSrc ? (
              <div className="relative w-full h-full min-h-[120px]">
                <iframe
                  key={battleIframeSrc}
                  src={battleIframeSrc}
                  className="w-full h-full min-h-[120px]"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={track.title}
                  {...(iframeKind === "suno"
                    ? { referrerPolicy: "strict-origin-when-cross-origin" as const }
                    : {})}
                />
                {iframeKind === "suno" ? <SunoEmbedOutboundShield /> : null}
              </div>
            ) : (
              <Music2 className="w-8 h-8 text-zinc-600" />
            )}
          </div>
        ) : (
          <div className="w-full aspect-[21/9] flex items-center justify-center text-zinc-600" style={{ maxHeight: "32vh" }}>
            <Music2 className="w-8 h-8" />
          </div>
        )}
      </div>
      <PreviewProgressBar active={autoplay} />
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
  const [showFlash, setShowFlash] = useState(false);
  const [votedId, setVotedId] = useState<number | null>(null);
  const [isVoted, setIsVoted] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultPhaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setIsVoted(true);
      setIsRevealed(true);
      setVotedId(data.winnerId);

      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
      revealTimerRef.current = setTimeout(() => {
        setShowSharePopup(true);
      }, 1000);

      if (resultPhaseTimerRef.current) clearTimeout(resultPhaseTimerRef.current);
      resultPhaseTimerRef.current = setTimeout(() => {
        setShowSharePopup(false);
        setPhase("result");
        setVotedId(null);
      }, 3200);

      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/battles/daily-count"] });
    },
    onError: (err: any) => {
      setVotedId(null);
      setIsVoted(false);
      setIsRevealed(false);
      setShowSharePopup(false);
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
      setIsVoted(false);
      setIsRevealed(false);
      setShowSharePopup(false);
      createBattleMutation.mutate(genre);
    },
    [createBattleMutation],
  );

  const nextBattle = useCallback(() => {
    setBattle(null);
    setVoteResult(null);
    setListenedA(false);
    setListenedB(false);
    setIsVoted(false);
    setIsRevealed(false);
    setShowSharePopup(false);
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (resultPhaseTimerRef.current) {
      clearTimeout(resultPhaseTimerRef.current);
      resultPhaseTimerRef.current = null;
    }
    if (limitReachedRef.current) {
      setPhase("genre-select");
      return;
    }
    setPhase("loading");
    createBattleMutation.mutate(selectedGenre);
  }, [selectedGenre, createBattleMutation]);

  useEffect(() => {
    warmYoutubeIframeApi();
  }, []);

  useEffect(() => {
    if (!battle) return;
    const urls: string[] = [];
    for (const t of [battle.trackA, battle.trackB]) {
      const raw = t.musicVideoUrl || t.audioUrl;
      const yid = extractYoutubeId(raw);
      if (raw && isDirectAudioUrl(raw, yid)) urls.push(raw);
    }
    const players = urls.map((url) => {
      const a = new Audio();
      a.preload = "auto";
      a.src = url;
      a.load();
      return a;
    });
    return () => {
      for (const a of players) {
        a.removeAttribute("src");
        a.load();
      }
    };
  }, [battle?.id]);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
      if (resultPhaseTimerRef.current) {
        clearTimeout(resultPhaseTimerRef.current);
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
      voteMutation.mutate({ battleId: battle.id, trackId });
      setTimeout(() => {
        setShowFlash(false);
      }, 300);
    },
    [isAuthenticated, battle, voteMutation],
  );

  const winnerTrack =
    voteResult && battle
      ? voteResult.winnerId === battle.trackAId
        ? battle.trackA
        : battle.trackB
      : null;
  const voteReady = listenedA && listenedB;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-5 h-5 text-primary" />
          <h1
            className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary"
            data-testid="text-battle-label"
          >
            Arena
          </h1>
        </div>
        <h2
          className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green"
          data-testid="text-battle-arena-title"
        >
          BATTLE ARENA
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          Head-to-head track battles where the community decides the winner.
        </p>
      </div>
      <div className="battle-page-container">
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
        <p
          className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 mt-[10px] md:mt-0"
          data-testid="battle-progress-indicator"
          style={{ letterSpacing: "0.35em" }}
        >
          {`TODAY'S BATTLES ${displayCount} / ${dailyMax} (DAILY LIMIT ${dailyMax})`}
        </p>
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
            <p className="text-[7px] uppercase tracking-widest text-zinc-600">Current Battle Pool</p>
          </div>
          <div className="text-center" data-testid="stat-new-tracks">
            <Plus className="w-3 h-3 text-primary mx-auto mb-0.5" />
            <p className="text-sm font-display font-bold text-white">{todayStats?.newTracksToday ?? 0}</p>
            <p className="text-[7px] uppercase tracking-widest text-zinc-600">New Today (Created)</p>
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
                Daily limit of {dailyMax} reached. Come back tomorrow.
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
            className="relative"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
          >
            {(() => {
              const prefetchId = extractYoutubeId(battle.trackB.musicVideoUrl || battle.trackB.audioUrl);
              return prefetchId ? (
                <div
                  className="battle-yt-prefetch"
                  aria-hidden
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: "none",
                    overflow: "hidden",
                    clipPath: "inset(50%)",
                  }}
                >
                  <YoutubePlayer videoId={prefetchId} autoplay={false} battleMode={false} />
                </div>
              ) : null;
            })()}
            <div className="battle-stage-frame">
              <BattleTrackPlayer
                track={battle.trackA}
                label="Track A"
                autoplay={true}
                onEnded={() => {
                  setListenedA(true);
                  setPhase("track-b");
                }}
              />
            </div>
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
            className="relative"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
          >
            <div className="battle-stage-frame">
              <BattleTrackPlayer
                track={battle.trackB}
                label="Track B"
                autoplay={true}
                onEnded={() => {
                  setListenedB(true);
                  setPhase("vote");
                }}
              />
            </div>
          </motion.div>
        )}

        {phase === "vote" && battle && (
          <motion.div
            key="vote"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="battle-vote-stage"
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
            {voteReady && !isVoted && (
              <p className="text-[10px] text-primary uppercase tracking-widest text-center mb-2 animate-pulse">
                Voting unlocked. Choose your winner.
              </p>
            )}

            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-1 md:mb-3">
              Which track wins the {selectedGenre} battle?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 battle-vote-grid">
              <BattleBlindCard
                track={battle.trackA}
                badge="A"
                accentClass="bg-primary/10 border-primary/30 text-primary"
                canVote={listenedA && listenedB}
                disabled={voteMutation.isPending || showFlash || !voteReady || isVoted}
                isVoted={isVoted}
                isWinner={voteResult?.winnerId === battle.trackAId}
                isRevealed={isRevealed}
                voteReady={voteReady}
                onVote={() => castVote(battle.trackAId)}
                dataTestIdPrefix="vote-track-a"
                buttonClassName={`w-full py-2.5 glass-button text-primary text-[11px] font-bold uppercase tracking-[0.25em] rounded-xl transition-premium disabled:opacity-40 disabled:cursor-not-allowed ${votedId === battle.trackAId ? "animate-vote-pulse brightness-150 ring-2 ring-primary/60" : ""}`}
              />

              <BattleBlindCard
                track={battle.trackB}
                badge="B"
                accentClass="bg-blue-500/10 border-blue-500/30 text-blue-400"
                canVote={listenedA && listenedB}
                disabled={voteMutation.isPending || showFlash || !voteReady || isVoted}
                isVoted={isVoted}
                isWinner={voteResult?.winnerId === battle.trackBId}
                isRevealed={isRevealed}
                voteReady={voteReady}
                onVote={() => castVote(battle.trackBId)}
                dataTestIdPrefix="vote-track-b"
                buttonClassName={`w-full py-2.5 rounded-xl transition-premium disabled:opacity-40 disabled:cursor-not-allowed text-blue-400 text-[11px] font-bold uppercase tracking-[0.25em] battle-vote-button-b ${votedId === battle.trackBId ? "animate-vote-pulse brightness-150 ring-2 ring-blue-400/60" : ""}`}
              />
            </div>
            <AnimatePresence>
              {showSharePopup && winnerTrack && (
                <motion.div
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="battle-share-popup"
                  data-testid="battle-share-popup"
                >
                  You can't fool my ears! I found {winnerTrack.creatorName}!
                </motion.div>
              )}
            </AnimatePresence>
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
                <div className="pt-2 flex justify-center">
                  <Link
                    href={`/track/${winnerTrack.id}`}
                    data-testid="button-view-winner-track-detail"
                    className="inline-block text-[8px] font-bold uppercase tracking-[0.2em] text-primary/90 border border-primary/35 px-3 py-1.5 rounded-sm bg-primary/5 hover:bg-primary/15 transition-premium"
                  >
                    View Track Detail
                  </Link>
                </div>
              </div>
            )}

            <div className="space-y-3 max-w-md mx-auto w-full flex flex-col items-center">
              <div className="space-y-2 w-full">
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
              <div className="space-y-2 w-full">
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
