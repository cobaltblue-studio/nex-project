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
  SkipForward,
  Music2,
  Zap,
  Headphones,
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

function TrackPlayer({
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
  useEffect(() => {
    if (!autoplay) return;

    const timer = setTimeout(() => {
      if (onEnded) onEnded();
    }, 10000);

    return () => clearTimeout(timer);
  }, [autoplay]);
  const randomStart = Math.floor(Math.random() * 60) + 30;
  const rawUrl = track.musicVideoUrl || track.audioUrl;
  const ytId = extractYoutubeId(rawUrl);
  const iframeUrl =
    !ytId && rawUrl ? buildIframeEmbedUrl(rawUrl, autoplay) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-bold tracking-[0.3em] text-primary/60 uppercase">
          {label}
        </span>
        <div className="h-px flex-1 bg-primary/10" />
      </div>
      <div className="border border-white/10 rounded-sm overflow-hidden bg-black/40">
        {ytId ? (
          <YoutubePlayer
            videoId={ytId}
            autoplay={autoplay}
            onEnded={onEnded}
            className="w-full h-[200px] md:h-[260px]"
          />
        ) : iframeUrl ? (
          <iframe
            src={iframeUrl}
            className="w-full h-[200px] md:h-[260px]"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen"
            allowFullScreen
            title={track.title}
          />
        ) : (
          <div className="w-full h-[200px] flex items-center justify-center text-zinc-600">
            <Music2 className="w-8 h-8" />
          </div>
        )}
      </div>
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
  } | null>(null);
  const [listenedA, setListenedA] = useState(false);
  const [listenedB, setListenedB] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextBattleRef = useRef<() => void>(() => {});

  const { data: genres = [], isLoading: genresLoading } = useQuery<string[]>({
    queryKey: ["/api/battles/genres"],
  });

  const { data: dailyCount } = useQuery<{ count: number; dailyMax: number }>({
    queryKey: ["/api/battles/daily-count"],
    enabled: isAuthenticated,
  });

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
      setCountdown(7);
      autoAdvanceRef.current = setTimeout(() => {
        nextBattleRef.current();
      }, 7000);
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/battles/daily-count"] });
    },
    onError: (err: any) => {
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
      voteMutation.mutate({ battleId: battle.id, trackId });
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
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Swords className="w-5 h-5 text-primary" />
          <h1 className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary">
            NEX Battle Arena
          </h1>
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight">
          AI MUSIC DUEL
        </h2>
        {selectedGenre && phase !== "genre-select" && (
          <p className="text-zinc-500 text-sm mt-2 uppercase tracking-widest">
            {selectedGenre === "ALL"
              ? "Any Genre Battle"
              : `${selectedGenre} Battle`}
          </p>
        )}
        {isAuthenticated && dailyCount && (
          <div className="mt-3 flex items-center gap-2" data-testid="battle-progress-indicator">
            <Headphones className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Battle {dailyCount.count} / {dailyCount.dailyMax} today
            </span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Phase: Genre Selection */}
        {phase === "genre-select" && (
          <motion.div
            key="genre-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-zinc-400 text-sm mb-6">
              Choose a genre to start a battle between two AI-generated tracks.
            </p>
            {genresLoading ? (
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-28 bg-white/5 rounded-sm animate-pulse"
                  />
                ))}
              </div>
            ) : genres.length === 0 ? (
              <p className="text-zinc-600 text-sm">
                No genres available yet. Tracks need to be published first.
              </p>
            ) : (
              <div
                className="flex flex-wrap gap-3"
                data-testid="genre-selector"
              >
                {genres.map((genre) => {
                  const isAll = genre === "ALL";
                  return (
                    <button
                      key={genre}
                      onClick={() => startBattle(genre)}
                      data-testid={`button-genre-${genre.toLowerCase().replace(/\s/g, "-")}`}
                      className={
                        isAll
                          ? "px-5 py-2.5 border rounded-sm text-[11px] font-bold uppercase tracking-[0.2em] transition-all border-primary/50 text-primary bg-primary/10 hover:bg-primary/25"
                          : "px-5 py-2.5 border border-white/10 rounded-sm text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                      }
                    >
                      {isAll ? "⚡ Any Genre" : genre}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Phase: Loading */}
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <Zap className="w-8 h-8 text-primary animate-pulse" />
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-500">
              Loading Battle…
            </p>
          </motion.div>
        )}

        {/* Phase: Track A */}
        {phase === "track-a" && battle && (
          <motion.div
            key="track-a"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="w-7 h-7 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-[11px] font-bold">
                A
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                Now Playing — Track A
              </p>
            </div>
            <TrackPlayer
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

        <div className="flex justify-center items-center my-6">
          <div className="text-4xl text-primary animate-pulse">⚡</div>
        </div>
        {/* Phase: Track B */}
        {phase === "track-b" && battle && (
          <motion.div
            key="track-b"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="w-7 h-7 rounded-sm bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[11px] font-bold">
                B
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                Now Playing — Track B
              </p>
            </div>
            <TrackPlayer
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

        {/* Phase: Vote */}
        {phase === "vote" && battle && (
          <motion.div
            key="vote"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
          >
            {/* Listen status bar */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ${listenedA ? "text-primary" : "text-zinc-600"}`}
              >
                <span
                  className={`w-4 h-4 rounded-sm flex items-center justify-center text-[8px] border ${listenedA ? "bg-primary/10 border-primary/40 text-primary" : "bg-white/3 border-white/10 text-zinc-600"}`}
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
                  className={`w-4 h-4 rounded-sm flex items-center justify-center text-[8px] border ${listenedB ? "bg-blue-500/10 border-blue-500/40 text-blue-400" : "bg-white/3 border-white/10 text-zinc-600"}`}
                >
                  B
                </span>
                {listenedB ? "✓ Listened" : "Not listened"}
              </div>
            </div>

            {(!listenedA || !listenedB) && (
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest text-center mb-4">
                Listen to both tracks before voting
              </p>
            )}

            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-5">
              Which track wins the {selectedGenre} battle?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Track A Vote Card */}
              <div
                className={`border rounded-sm p-5 flex flex-col gap-4 transition-all ${listenedA && listenedB ? "border-white/10 bg-black/30" : "border-white/5 bg-black/15 opacity-60"}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-sm bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-[10px] font-bold">
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
                  disabled={voteMutation.isPending || !listenedA || !listenedB}
                  data-testid="button-vote-track-a"
                  className="w-full py-3 border border-primary/40 bg-primary/10 hover:bg-primary/25 text-primary text-[11px] font-bold uppercase tracking-[0.25em] rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {voteMutation.isPending ? "Voting…" : "Vote Track A"}
                </button>
              </div>

              {/* Track B Vote Card */}
              <div
                className={`border rounded-sm p-5 flex flex-col gap-4 transition-all ${listenedA && listenedB ? "border-white/10 bg-black/30" : "border-white/5 bg-black/15 opacity-60"}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-sm bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-[10px] font-bold">
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
                  disabled={voteMutation.isPending || !listenedA || !listenedB}
                  data-testid="button-vote-track-b"
                  className="w-full py-3 border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/25 text-blue-400 text-[11px] font-bold uppercase tracking-[0.25em] rounded-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {voteMutation.isPending ? "Voting…" : "Vote Track B"}
                </button>
              </div>
            </div>

            {!isAuthenticated && (
              <p className="text-center text-zinc-600 text-[10px] uppercase tracking-widest mt-4">
                <a href="/api/login" className="text-primary hover:underline">
                  Login
                </a>{" "}
                to cast your vote
              </p>
            )}
          </motion.div>
        )}

        {/* Phase: Result */}
        {phase === "result" &&
          battle &&
          voteResult &&
          winnerTrack &&
          (() => {
            const total = voteResult.trackAVotes + voteResult.trackBVotes;
            const pctA =
              total > 0
                ? Math.round((voteResult.trackAVotes / total) * 100)
                : 50;
            const pctB =
              total > 0
                ? Math.round((voteResult.trackBVotes / total) * 100)
                : 50;
            const winnerIsA = voteResult.winnerId === battle.trackAId;
            return (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center text-center gap-6"
              >
                <div className="relative">
                  <Trophy className="w-12 h-12 text-primary mx-auto drop-shadow-[0_0_24px_rgba(0,240,255,0.8)]" />
                </div>

                <div>
                  <p className="text-[10px] font-bold tracking-[0.5em] uppercase text-zinc-500 mb-2">
                    Winner
                  </p>
                  <h3
                    className="text-3xl md:text-4xl font-display font-bold text-primary neon-text"
                    data-testid="text-battle-winner"
                  >
                    {winnerTrack.title}
                  </h3>
                  <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest">
                    {winnerTrack.creatorName}
                  </p>
                </div>

                {/* Vote tally with % */}
                <div className="w-full">
                  <div className="flex items-stretch gap-0 w-full mb-3">
                    {/* Track A bar */}
                    <div
                      className="flex flex-col items-center justify-center py-4 px-3 transition-all"
                      style={{
                        width: `${pctA}%`,
                        minWidth: "30%",
                        background: winnerIsA
                          ? "rgba(0,240,255,0.08)"
                          : "rgba(255,255,255,0.03)",
                        borderLeft: "1px solid rgba(255,255,255,0.08)",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <p
                        className={`text-2xl font-display font-bold ${winnerIsA ? "text-primary" : "text-zinc-400"}`}
                        data-testid="text-pct-a"
                      >
                        {pctA}%
                      </p>
                      <p
                        className={`text-[11px] font-bold mt-0.5 ${winnerIsA ? "text-primary/70" : "text-zinc-600"}`}
                        data-testid="text-votes-a"
                      >
                        {voteResult.trackAVotes} vote
                        {voteResult.trackAVotes !== 1 ? "s" : ""}
                      </p>
                      <p className="text-[8px] uppercase tracking-widest text-zinc-600 mt-1 truncate max-w-[90px]">
                        {battle.trackA.title}
                      </p>
                    </div>

                    {/* Track B bar */}
                    <div
                      className="flex flex-col items-center justify-center py-4 px-3 transition-all"
                      style={{
                        width: `${pctB}%`,
                        minWidth: "30%",
                        background: !winnerIsA
                          ? "rgba(96,165,250,0.08)"
                          : "rgba(255,255,255,0.03)",
                        borderRight: "1px solid rgba(255,255,255,0.08)",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <p
                        className={`text-2xl font-display font-bold ${!winnerIsA ? "text-blue-400" : "text-zinc-400"}`}
                        data-testid="text-pct-b"
                      >
                        {pctB}%
                      </p>
                      <p
                        className={`text-[11px] font-bold mt-0.5 ${!winnerIsA ? "text-blue-400/70" : "text-zinc-600"}`}
                        data-testid="text-votes-b"
                      >
                        {voteResult.trackBVotes} vote
                        {voteResult.trackBVotes !== 1 ? "s" : ""}
                      </p>
                      <p className="text-[8px] uppercase tracking-widest text-zinc-600 mt-1 truncate max-w-[90px]">
                        {battle.trackB.title}
                      </p>
                    </div>
                  </div>

                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
                    +2 ranking score awarded to the winner
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-3 w-full max-w-sm">
                  <button
                    onClick={nextBattle}
                    data-testid="button-next-battle"
                    className="w-full flex items-center justify-center gap-2 py-3.5 border border-primary/40 bg-primary/10 hover:bg-primary/25 text-primary text-[11px] font-bold uppercase tracking-[0.25em] rounded-sm transition-all"
                  >
                    <SkipForward className="w-4 h-4" />
                    Next Battle
                  </button>
                  {countdown > 0 && (
                    <p
                      className="text-[10px] text-zinc-500 uppercase tracking-widest text-center"
                      data-testid="text-countdown"
                    >
                      Auto-advancing in {countdown}s…
                    </p>
                  )}

                  <a
                    href={`/track/${winnerTrack.id}`}
                    data-testid="button-listen-full-track"
                    className="w-full flex items-center justify-center gap-2 py-3.5 border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 text-white text-[11px] font-bold uppercase tracking-[0.25em] rounded-sm transition-all"
                  >
                    <Headphones className="w-4 h-4" />
                    Listen Full Track
                  </a>

                  <button
                    onClick={() => {
                      if (autoAdvanceRef.current) {
                        clearTimeout(autoAdvanceRef.current);
                        autoAdvanceRef.current = null;
                      }
                      setCountdown(0);
                      setBattle(null);
                      setVoteResult(null);
                      setSelectedGenre("");
                      setPhase("genre-select");
                    }}
                    data-testid="button-change-genre"
                    className="w-full py-3 text-zinc-600 hover:text-zinc-400 text-[10px] font-bold uppercase tracking-[0.25em] transition-all"
                  >
                    Change Genre
                  </button>
                </div>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}
