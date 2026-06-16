import { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/lib/loginRedirect";
import {
  ChevronRight,
  Trophy,
  Music2,
  Zap,
  Eye,
  EyeOff,
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
  randomMiddlePreviewStart,
} from "@/components/YoutubePlayer";
import { classifyStreamingSource } from "@/lib/streamingEmbed";
import { usePlayableStreamingSrc } from "@/hooks/use-playable-streaming-src";
import { SunoEmbedOutboundShield } from "@/components/SunoEmbedOutboundShield";
import { ShareButtons } from "@/components/ShareButtons";
import { trackShareUrl } from "@/lib/siteUrl";
import { useTranslation } from "react-i18next";
import { hasPublicCount } from "@/lib/displayStats";

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
  winStreak?: number;
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
  trackId,
  badge,
  accentClass,
  canVote,
  disabled,
  pickedTrackId,
  isWinner,
  isRevealed,
  voteReady,
  onVote,
  dataTestIdPrefix,
}: {
  track: BattleTrack;
  trackId: number;
  badge: string;
  accentClass: string;
  canVote: boolean;
  disabled: boolean;
  pickedTrackId: number | null;
  isWinner: boolean;
  isRevealed: boolean;
  voteReady: boolean;
  onVote: () => void;
  dataTestIdPrefix: string;
}) {
  const maskedLabel = "[HIDDEN] · UNLOCK AFTER VOTE";
  const isPicked = pickedTrackId === trackId;
  const voteLocked = pickedTrackId != null;
  const selectStateLabel = isPicked
    ? `YOUR PICK · TRACK ${badge}`
    : voteLocked
      ? `TRACK ${badge}`
      : voteReady
        ? `TAP TO VOTE TRACK ${badge}`
        : "LISTEN FIRST";

  const onSelect = () => {
    if (!disabled) onVote();
  };
  return (
    <motion.div
      className={[
        "premium-card p-4 flex flex-col gap-3 transition-premium battle-blind-card",
        canVote ? "cursor-pointer" : "opacity-60",
        isPicked && isWinner ? "battle-winner-focus" : "",
        voteLocked && !isPicked ? "battle-loser-dimmed" : "",
      ].join(" ")}
      onClick={onSelect}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onVote();
        }
      }}
      animate={{
        opacity: voteLocked && !isPicked ? 0.3 : 1,
        scale: isPicked && isWinner ? 1.02 : 1,
      }}
      transition={{ duration: voteLocked ? 0.12 : 0.25, ease: "easeOut" }}
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
              "battle-cover-image",
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
              className="font-bold text-white text-sm battle-reveal-text"
              data-testid={`text-${dataTestIdPrefix}-title`}
            >
              {track.title}
            </p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5 battle-reveal-text">
              {track.creatorName}
            </p>
          </>
        ) : (
          <p
            className="font-bold text-white text-[11px] uppercase tracking-[0.08em] whitespace-normal break-words leading-relaxed"
            data-testid={`text-${dataTestIdPrefix}-title`}
          >
            {maskedLabel}
          </p>
        )}
      </div>
      <div
        data-testid={`button-vote-${dataTestIdPrefix.replace("vote-", "")}`}
        className={`w-full py-2 text-center rounded-xl border uppercase tracking-[0.18em] text-[10px] font-bold transition-premium ${voteReady && !voteLocked ? "battle-vote-ready-glow border-primary/50 text-primary" : "border-white/15 text-zinc-500"}`}
      >
        {selectStateLabel}
      </div>
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
  blindMode = true,
  onEnded,
}: {
  track: BattleTrack;
  label: string;
  autoplay?: boolean;
  blindMode?: boolean;
  onEnded?: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [iframeGuessSeek, setIframeGuessSeek] = useState(0);

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

  useEffect(() => {
    if (!autoplay || ytId || isDirectAudio || !rawUrl) {
      setIframeGuessSeek(0);
      return;
    }
    setIframeGuessSeek(Math.floor(45 + Math.random() * 135));
  }, [autoplay, rawUrl, ytId, isDirectAudio, track.id]);

  const {
    iframeSrc: battleIframeSrc,
    loading: battleStreamLoading,
    error: battleStreamError,
  } = usePlayableStreamingSrc(
    rawUrl && !ytId && !isDirectAudio ? rawUrl : undefined,
    {
      autoplay,
      enableJsApi: false,
      embedSeekSeconds: iframeGuessSeek > 0 ? iframeGuessSeek : undefined,
    },
  );

  useLayoutEffect(() => {
    const el = audioRef.current;
    if (!el || !autoplay || !isDirectAudio) return;
    void el.play().catch(() => {});
  }, [autoplay, isDirectAudio, rawUrl]);

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
      <div className={`relative border border-white/10 rounded-2xl overflow-hidden bg-black/40 transition-premium battle-player-container ${autoplay ? "animate-neon-pulse ring-1 ring-primary/30" : ""}`} style={{ maxHeight: "32vh" }}>
        {ytId ? (
          <div className="w-full h-full pointer-events-none select-none">
            <YoutubePlayer
              videoId={ytId}
              autoplay={autoplay}
              battleMode={true}
              onEnded={onEnded}
            />
          </div>
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
                audio.currentTime = randomMiddlePreviewStart(audio.duration, PREVIEW_DURATION);
                if (autoplay) void audio.play().catch(() => {});
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
                  className="w-full h-full min-h-[120px] pointer-events-none"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={track.title}
                  {...(iframeKind === "suno"
                    ? { referrerPolicy: "strict-origin-when-cross-origin" as const }
                    : {})}
                />
                {iframeKind === "suno" ? <SunoEmbedOutboundShield /> : null}
              </div>
            ) : battleStreamError ? (
              <p className="text-[10px] text-zinc-500 text-center px-4 leading-relaxed max-w-md">
                {battleStreamError}
              </p>
            ) : (
              <Music2 className="w-8 h-8 text-zinc-600" />
            )}
          </div>
        ) : (
          <div className="w-full aspect-[21/9] flex items-center justify-center text-zinc-600" style={{ maxHeight: "32vh" }}>
            <Music2 className="w-8 h-8" />
          </div>
        )}
        {blindMode ? (
          <div
            className="pointer-events-none absolute inset-0 z-[15] rounded-2xl bg-black/45 backdrop-blur-md motion-reduce:backdrop-blur-none"
            aria-hidden
          />
        ) : null}
        {blindMode ? (
          <div className="pointer-events-none absolute top-2 left-2 z-20">
            <span className="rounded-md border border-primary/35 bg-black/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-primary/90">
              Blind Mode
            </span>
          </div>
        ) : null}
      </div>
      <PreviewProgressBar active={autoplay} />
    </div>
  );
}

export function Battle() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const battleLoginHref = getLoginUrl(location.startsWith("/") ? location : "/battle");

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
  /** Bump to remount preview players if server sync fails so the user can retry. */
  const [listenReplayA, setListenReplayA] = useState(0);
  const [listenReplayB, setListenReplayB] = useState(0);
  const [votedId, setVotedId] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const activeBattleIdRef = useRef<number | null>(null);
  const [blindMode, setBlindMode] = useState(() => {
    try {
      const saved = window.localStorage.getItem("nex.battle.blindMode");
      if (saved === "off") return false;
      return true;
    } catch {
      return true;
    }
  });
  const [showSharePopup, setShowSharePopup] = useState(false);
  const countedImpressionsRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    try {
      window.localStorage.setItem("nex.battle.blindMode", blindMode ? "on" : "off");
    } catch {
      /* ignore localStorage write errors */
    }
  }, [blindMode]);

  const createBattleMutation = useMutation({
    mutationFn: (genre: string) =>
      apiRequest("POST", "/api/battles/new", { genre }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setBattle(data);
      setVoteResult(null);
      setVotedId(null);
      setListenReplayA(0);
      setListenReplayB(0);
      setIsRevealed(false);
      setShowSharePopup(false);
      setPhase("track-a");
    },
    onError: (err: Error) => {
      const msg = (err?.message ?? "").trim();
      if (msg.startsWith("401")) {
        toast({
          title: "Login required",
          description: "Start with Google to enter battles. Tap START WITH GOOGLE, then Continue with Google.",
          variant: "destructive",
        });
      } else if (msg.startsWith("409")) {
        toast({
          title: "Could not start battle",
          description: msg.replace(/^409:\s*/, "") || "Not enough audio tracks for this match-up.",
          variant: "destructive",
        });
      } else if (msg.startsWith("429")) {
        toast({
          title: "Daily limit reached",
          description: msg.replace(/^429:\s*/, "") || "Come back tomorrow.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Could not start battle",
          description: msg || "Please try again.",
          variant: "destructive",
        });
      }
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
    onSuccess: async (res: any, variables) => {
      if (variables.battleId !== activeBattleIdRef.current) return;
      const data = await res.json();
      setVoteResult(data);

      void queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/battles/daily-count"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (err: any, _variables, _ctx) => {
      if (_variables.battleId !== activeBattleIdRef.current) return;
      setVotedId(null);
      setIsRevealed(!blindMode);
      setShowSharePopup(false);
      setVoteResult(null);
      setPhase("vote");
      if (err?.message?.includes("409") || err?.status === 409) {
        toast({
          title: "Already voted",
          description: "You can only vote once per battle.",
          variant: "destructive",
        });
      } else if (String(err?.message ?? "").includes("400")) {
        const detail = String(err?.message ?? "").replace(/^400:\s*/, "").trim();
        toast({
          title: "Cannot vote yet",
          description: detail || "Listen to both previews first.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Vote failed", variant: "destructive" });
      }
    },
  });

  const onBattleTrackAEnded = useCallback(() => {
    if (!battle) return;
    const battleId = battle.id;
    const trackId = battle.trackAId;
    // Optimistic step transition for snappier UX; rollback only if sync fails.
    setListenedA(true);
    setPhase("track-b");
    void (async () => {
      try {
        await apiRequest("POST", `/api/battles/${battleId}/listen-complete`, {
          trackId,
        });
      } catch (e: any) {
        const raw = String(e?.message ?? "").trim();
        const detail = raw.includes(":") ? raw.split(":").slice(1).join(":").trim() : raw;
        toast({
          title: "Could not save listen progress",
          description: detail || "Check your connection and try again.",
          variant: "destructive",
        });
        setListenedA(false);
        setPhase("track-a");
        setListenReplayA((n) => n + 1);
      }
    })();
  }, [battle, toast]);

  const onBattleTrackBEnded = useCallback(() => {
    if (!battle) return;
    const battleId = battle.id;
    const trackId = battle.trackBId;
    // Optimistic step transition for snappier UX; rollback only if sync fails.
    setListenedB(true);
    setVotedId(null);
    setVoteResult(null);
    setPhase("vote");
    void (async () => {
      try {
        await apiRequest("POST", `/api/battles/${battleId}/listen-complete`, {
          trackId,
        });
      } catch (e: any) {
        const raw = String(e?.message ?? "").trim();
        const detail = raw.includes(":") ? raw.split(":").slice(1).join(":").trim() : raw;
        toast({
          title: "Could not save listen progress",
          description: detail || "Check your connection and try again.",
          variant: "destructive",
        });
        setListenedB(false);
        setPhase("track-b");
        setListenReplayB((n) => n + 1);
      }
    })();
  }, [battle, toast]);

  const startBattle = useCallback(
    (genre: string) => {
      if (!isAuthenticated) {
        toast({
          title: "Login required",
          description: "Battles require a NEX account. Tap START WITH GOOGLE, then Continue with Google.",
          variant: "destructive",
        });
        setPhase("genre-select");
        return;
      }
      if (limitReachedRef.current) {
        setPhase("genre-select");
        return;
      }
      setSelectedGenre(genre);
      setPhase("loading");
      setListenedA(false);
      setListenedB(false);
      setListenReplayA(0);
      setListenReplayB(0);
      setVotedId(null);
      setVoteResult(null);
      setIsRevealed(false);
      setShowSharePopup(false);
      createBattleMutation.mutate(genre);
    },
    [createBattleMutation, isAuthenticated, toast],
  );

  const nextBattle = useCallback(() => {
    setBattle(null);
    setVoteResult(null);
    setListenedA(false);
    setListenedB(false);
    setListenReplayA(0);
    setListenReplayB(0);
    setIsRevealed(false);
    setVotedId(null);
    setShowSharePopup(false);
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
    activeBattleIdRef.current = battle?.id ?? null;
    countedImpressionsRef.current.clear();
  }, [battle?.id]);

  /** Recover if pick state was set but result phase did not mount (stale mutation, etc.). */
  useEffect(() => {
    if (phase === "vote" && votedId != null && voteResult) {
      setPhase("result");
    }
  }, [phase, votedId, voteResult]);

  useEffect(() => {
    if (!battle) return;
    const visibleTrackId =
      phase === "track-a" ? battle.trackA.id : phase === "track-b" ? battle.trackB.id : null;
    if (!visibleTrackId) return;
    const dedupeKey = `${battle.id}:${visibleTrackId}`;
    if (countedImpressionsRef.current.has(dedupeKey)) return;
    countedImpressionsRef.current.add(dedupeKey);
    void fetch("/api/boost/increment-impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ trackId: visibleTrackId }),
    }).catch(() => {
      /* best-effort exposure counter; UI must not break */
    });
  }, [battle, phase]);

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
      if (!battle || voteMutation.isPending) return;

      const isA = trackId === battle.trackAId;
      const optimisticAVotes = battle.trackAVotes + (isA ? 1 : 0);
      const optimisticBVotes = battle.trackBVotes + (isA ? 0 : 1);
      const optimisticWinner =
        optimisticAVotes >= optimisticBVotes ? battle.trackAId : battle.trackBId;

      setVotedId(trackId);
      setVoteResult({
        trackAVotes: optimisticAVotes,
        trackBVotes: optimisticBVotes,
        winnerId: optimisticWinner,
        trackAWinStreak:
          optimisticWinner === battle.trackAId ? (battle.trackA.winStreak ?? 0) + 1 : 0,
        trackBWinStreak:
          optimisticWinner === battle.trackBId ? (battle.trackB.winStreak ?? 0) + 1 : 0,
      });
      setIsRevealed(true);
      setShowSharePopup(true);
      setPhase("result");

      voteMutation.mutate({ battleId: battle.id, trackId });
    },
    [isAuthenticated, battle, voteMutation, toast],
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
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Zap className="w-5 h-5 text-primary shrink-0" />
            <h1
              className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary"
              data-testid="text-battle-label"
            >
              Arena
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setBlindMode((v) => !v)}
            data-testid="toggle-battle-blind-mode"
            aria-pressed={blindMode}
            title={
              blindMode
                ? "Blind mode: track titles stay hidden until you vote. Click to reveal titles sooner."
                : "Blind mode off. Click for blind judging (titles hidden until vote)."
            }
            className={[
              "inline-flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-[0.18em] transition-premium",
              blindMode
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-white/20 text-zinc-400 bg-white/5 hover:border-white/30 hover:text-zinc-300",
            ].join(" ")}
          >
            {blindMode ? (
              <EyeOff className="w-3.5 h-3.5 text-current shrink-0" aria-hidden strokeWidth={2.25} />
            ) : (
              <Eye className="w-3.5 h-3.5 text-current shrink-0" aria-hidden strokeWidth={2.25} />
            )}
            <span className="whitespace-nowrap">
              Blind <span className="opacity-80">·</span> {blindMode ? "On" : "Off"}
            </span>
          </button>
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
      <div className={`mb-2 text-center ${phase === "vote" ? "pt-0" : "pt-1"}`}>
        <p
          className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500 mt-[4px] md:mt-0"
          data-testid="battle-progress-indicator"
          style={{ letterSpacing: "0.35em" }}
        >
          {`TODAY'S BATTLES ${displayCount} / ${dailyMax} (DAILY LIMIT ${dailyMax})`}
        </p>
      </div>

      {phase !== "vote" && (
      <div className="mb-2 premium-card p-2.5 battle-stats-panel" data-testid="panel-today-stats">
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
      )}

      <AnimatePresence>
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
            ) : !isAuthenticated ? (
              <div className="flex flex-col items-center gap-4 max-w-md text-center">
                <p className="text-sm text-zinc-400">
                  Start with Google to battle and vote. We&apos;ll return you here right after.
                </p>
                <a
                  href={battleLoginHref}
                  data-testid="button-battle-login"
                  className="px-10 py-5 glass-button text-primary text-sm font-bold uppercase tracking-[0.3em] rounded-xl transition-premium hover:scale-105 inline-block"
                >
                  START WITH GOOGLE
                </a>
              </div>
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
                key={`battle-${battle.id}-a-${listenReplayA}`}
                track={battle.trackA}
                label="Track A"
                autoplay={true}
                blindMode={blindMode}
                onEnded={onBattleTrackAEnded}
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
                key={`battle-${battle.id}-b-${listenReplayB}`}
                track={battle.trackB}
                label="Track B"
                autoplay={true}
                blindMode={blindMode}
                onEnded={onBattleTrackBEnded}
              />
            </div>
          </motion.div>
        )}

        {phase === "vote" && battle && (
          <motion.div
            key="vote"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
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
            {voteReady && votedId == null && (
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
                trackId={battle.trackAId}
                badge="A"
                accentClass="bg-primary/10 border-primary/30 text-primary"
                canVote={listenedA && listenedB}
                disabled={voteMutation.isPending || !voteReady || votedId != null}
                pickedTrackId={votedId}
                isWinner={voteResult?.winnerId === battle.trackAId}
                isRevealed={isRevealed || !blindMode}
                voteReady={voteReady}
                onVote={() => castVote(battle.trackAId)}
                dataTestIdPrefix="vote-track-a"
              />

              <BattleBlindCard
                track={battle.trackB}
                trackId={battle.trackBId}
                badge="B"
                accentClass="bg-blue-500/10 border-blue-500/30 text-blue-400"
                canVote={listenedA && listenedB}
                disabled={voteMutation.isPending || !voteReady || votedId != null}
                pickedTrackId={votedId}
                isWinner={voteResult?.winnerId === battle.trackBId}
                isRevealed={isRevealed || !blindMode}
                voteReady={voteReady}
                onVote={() => castVote(battle.trackBId)}
                dataTestIdPrefix="vote-track-b"
              />
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.06 }}
            className="text-center space-y-3"
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-primary shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                Battle Result
              </p>
            </div>

            {winnerTrack && (
              <div className="space-y-0.5">
                <p className="text-2xl font-display font-black text-white uppercase tracking-tight">
                  {winnerTrack.title}
                </p>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest">
                  by {winnerTrack.creatorName}
                </p>
                <p className="text-[8px] text-zinc-700 uppercase tracking-[0.2em]">AI Music Creator</p>
                <div className="pt-1.5 flex justify-center">
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

            <div className="space-y-2.5 max-w-md mx-auto w-full flex flex-col items-center">
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
                    transition={{ duration: 0.2, ease: "easeOut" }}
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
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    data-testid="bar-result-b"
                    style={{ boxShadow: "2px 0 8px hsla(220, 100%, 60%, 0.6)" }}
                  />
                </div>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-widest text-zinc-500" data-testid="text-total-votes">
              Total Votes: {totalVotes}
            </p>

            {showSharePopup && winnerTrack && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] text-primary/90 font-medium"
                data-testid="battle-share-popup"
              >
                {t("battle.shareResultText", {
                  creator: winnerTrack.creatorName,
                  title: winnerTrack.title,
                })}
              </motion.p>
            )}

            {winnerTrack && (
              <ShareButtons
                url={trackShareUrl(winnerTrack.id)}
                text={t("battle.shareResultText", {
                  creator: winnerTrack.creatorName,
                  title: winnerTrack.title,
                })}
              />
            )}

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
