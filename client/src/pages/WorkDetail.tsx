import { useRoute, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useWork, useWorks } from "@/hooks/use-works";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowLeft, Music, ChevronUp, SkipForward, Infinity, Zap } from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { YoutubePlayer, extractYoutubeId } from "@/components/YoutubePlayer";
import { TrackAdminActions } from "@/components/TrackAdminActions";
import { useTranslation } from "react-i18next";
import { api } from "@shared/routes";
import { buildStreamingIframeSrc, classifyStreamingSource, urlLooksLikeSunoShare } from "@/lib/streamingEmbed";
import { usePlayableStreamingSrc } from "@/hooks/use-playable-streaming-src";
import { SunoEmbedOutboundShield } from "@/components/SunoEmbedOutboundShield";
import { TrackClaimSection } from "@/components/TrackClaimSection";

export function TrackDetail() {
  const { t } = useTranslation();
  const [, params] = useRoute("/track/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

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
        await apiRequest("POST", `/api/tracks/${currentTrackId}/play`, { completed: false });
        playCountedRef.current.add(currentTrackId);
        queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      } catch { /* silent — play count is best-effort */ }
    }, 20_000); // 20 seconds

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [currentTrackId, isAuthenticated]);

  const { data: trackData, isLoading: isTrackLoading } = useWork(String(currentTrackId));

  const rawForStreaming = useMemo(() => {
    if (!trackData) return undefined;
    const mv = String((trackData as { mvUrl?: string | null }).mvUrl ?? "").trim();
    const audio = String((trackData as { audioUrl?: string | null }).audioUrl ?? "").trim();
    const mYt = extractYoutubeId(mv || undefined);
    const aYt = extractYoutubeId(audio || undefined);
    if (mYt || aYt) return undefined;
    const opts = { autoplay: true, enableJsApi: true } as const;
    const sMv = mv ? buildStreamingIframeSrc(mv, opts) : null;
    const sAu = audio ? buildStreamingIframeSrc(audio, opts) : null;
    if (sMv) return mv;
    if (sAu) return audio;
    if (mv && urlLooksLikeSunoShare(mv)) return mv;
    if (audio && urlLooksLikeSunoShare(audio)) return audio;
    return mv || audio || undefined;
  }, [trackData]);

  const { iframeSrc: playableSrc, loading: streamLoading, error: streamError } = usePlayableStreamingSrc(
    rawForStreaming,
    { autoplay: true, enableJsApi: true },
  );

  const { data: myProfile } = useQuery({
    queryKey: ["/api/profiles/me"],
    queryFn: async () => {
      const res = await fetch("/api/profiles/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json() as Promise<{ id: number; role?: string } | null>;
    },
    enabled: isAuthenticated,
    retry: false,
  });
  const { data: allTracks, isLoading: areTracksLoading } = useWorks();
  const { data: chartTracks, isLoading: isChartTracksLoading } = useQuery<any[]>({
    queryKey: ["/api/tracks", "chart-rank-audio", "status-CHART", "audio"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("status", "CHART");
      params.set("trackType", "audio");
      params.set("sortBy", "rankingScore");
      params.set("limit", "100");
      const res = await fetch(`/api/tracks?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
    retry: false,
  });

  // Normalize raw API response
  const track = useMemo(() => {
    if (!trackData) return null;
    const artistName = (trackData as { artistName?: string | null }).artistName?.trim();
    const creatorName = (trackData as { creatorName?: string }).creatorName?.trim();
    return {
      ...trackData,
      creatorName: artistName || creatorName || "unknown",
      votes: trackData.listenerVotes || 0,
    };
  }, [trackData]);

  const sortedTracks = useMemo(() =>
    [...(allTracks || [])].sort((a, b) => (b?.votes || 0) - (a?.votes || 0))
  , [allTracks]);

  const rankIndex = useMemo(() => (track ? sortedTracks.findIndex(st => st.id === track.id) : -1), [sortedTracks, track]);

  // Show rank only when this track is truly in CHART status.
  const chartRank = useMemo(() => {
    if (!track || track.status !== "CHART") return null;
    const idx = (chartTracks ?? []).findIndex((st) => st.id === track.id);
    return idx >= 0 ? idx + 1 : null;
  }, [chartTracks, track]);

  const nextTrack = useMemo(() => {
    if (sortedTracks.length === 0 || rankIndex === -1) return null;
    return sortedTracks[(rankIndex + 1) % sortedTracks.length];
  }, [sortedTracks, rankIndex]);

  const prevTrack = useMemo(() => {
    if (sortedTracks.length === 0 || rankIndex === -1) return null;
    return rankIndex > 0 ? sortedTracks[rankIndex - 1] : null;
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

  const goToPrev = useCallback(() => {
    if (!prevTrack || isTransitioning) return;
    setIsTransitioning(true);
    playerKey.current += 1;
    setCurrentTrackId(prevTrack.id);
    setLocation(`/track/${prevTrack.id}`, { replace: false });
    setTimeout(() => setIsTransitioning(false), 400);
  }, [prevTrack, isTransitioning, setLocation]);

  const handleTrackEnded = useCallback(async () => {
    if (isAuthenticated && currentTrackId) {
      try {
        await apiRequest("POST", `/api/tracks/${currentTrackId}/play`, { completed: true });
        queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      } catch {
        // completion capture is best-effort
      }
    }
    if (autoPlayNext) goToNext();
  }, [autoPlayNext, currentTrackId, goToNext, isAuthenticated]);

  const handleVote = async () => {
    if (!track || isVoting) return;
    if (!isAuthenticated) {
      toast({
        title: t("trackVote.loginTitle"),
        description: t("trackVote.loginDesc"),
        variant: "destructive",
      });
      return;
    }
    const votedTracks: number[] = JSON.parse(localStorage.getItem("nex_voted_tracks") || "[]");
    if (votedTracks.includes(track.id)) {
      toast({
        title: t("trackVote.alreadyLocalTitle"),
        description: t("trackVote.alreadyLocalDesc"),
        variant: "destructive",
      });
      return;
    }
    setIsVoting(true);
    try {
      await apiRequest("POST", `/api/tracks/${track.id}/vote`);
      votedTracks.push(track.id);
      localStorage.setItem("nex_voted_tracks", JSON.stringify(votedTracks));
      queryClient.invalidateQueries({ queryKey: [api.tracks.get.path, String(track.id)] });
      queryClient.invalidateQueries({ queryKey: [api.tracks.get.path, track.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      queryClient.invalidateQueries({ queryKey: [api.tracks.list.path] });
      toast({ title: t("trackVote.successTitle"), description: t("trackVote.successDesc") });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("401")) {
        void queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({
          title: t("trackVote.sessionTitle"),
          description: t("trackVote.sessionDesc"),
          variant: "destructive",
        });
        return;
      }
      if (msg.startsWith("409")) {
        votedTracks.push(track.id);
        localStorage.setItem("nex_voted_tracks", JSON.stringify(votedTracks));
        queryClient.invalidateQueries({ queryKey: [api.tracks.get.path, String(track.id)] });
        queryClient.invalidateQueries({ queryKey: [api.tracks.get.path, track.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
        toast({
          title: t("trackVote.alreadyServerTitle"),
          description: t("trackVote.alreadyServerDesc"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("trackVote.failedTitle"),
        description: t("trackVote.failedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const claimable = !!(track as { claimableByCreators?: boolean } | null)?.claimableByCreators;
  const trackOwnerId = (track as { creatorId?: number } | null)?.creatorId;
  const isTrackOwner =
    isAuthenticated &&
    myProfile?.id != null &&
    trackOwnerId != null &&
    myProfile.id === trackOwnerId;

  const { data: boostMe } = useQuery({
    queryKey: ["/api/boost/me"],
    queryFn: async () => {
      const res = await fetch("/api/boost/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json() as Promise<{
        ticketBalance: number;
        logs: Array<{
          id: number;
          trackId: number;
          targetImpressions: number;
          currentImpressions: number;
          status: string;
        }>;
      }>;
    },
    enabled: isTrackOwner,
    retry: false,
  });

  const { data: boostEligibility } = useQuery({
    queryKey: ["/api/boost/eligibility", currentTrackId],
    queryFn: async () => {
      const res = await fetch(`/api/boost/eligibility?trackId=${currentTrackId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json() as Promise<{
        eligible: boolean;
        reason: string | null;
        cooldownUntil: string | null;
        weeklyStartsUsed: number;
        weeklyStartsMax: number;
        hasActiveBoost: boolean;
      }>;
    },
    enabled: isTrackOwner && !!currentTrackId,
    retry: false,
  });

  const [boostCooldownTick, setBoostCooldownTick] = useState(0);
  useEffect(() => {
    if (!boostEligibility?.cooldownUntil) return;
    const id = window.setInterval(() => setBoostCooldownTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [boostEligibility?.cooldownUntil]);

  const boostCooldownRemainingMs = useMemo(() => {
    void boostCooldownTick;
    if (!boostEligibility?.cooldownUntil) return 0;
    return Math.max(0, new Date(boostEligibility.cooldownUntil).getTime() - Date.now());
  }, [boostEligibility?.cooldownUntil, boostCooldownTick]);

  const formatBoostRemaining = (ms: number) => {
    if (ms <= 0) return "0:00:00";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const activeBoostForTrack = boostMe?.logs?.find(
    (l) => l.trackId === currentTrackId && l.status === "ACTIVE",
  );

  const boostActivateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/boost/activate", {
        trackId: currentTrackId,
        targetImpressions: 1000,
      });
    },
    onSuccess: () => {
      toast({ title: "Boost started", description: "This track gets extra battle exposure until impressions complete." });
      void queryClient.invalidateQueries({ queryKey: ["/api/boost/me"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/boost/eligibility", currentTrackId] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not start boost", description: err.message, variant: "destructive" });
    },
  });

  const mvYtId = extractYoutubeId(track?.mvUrl);
  const audioYtId = extractYoutubeId(track?.audioUrl);
  const ytId = mvYtId || audioYtId;
  const isWidePlayer = !!(mvYtId || (track?.mvUrl?.trim() && !mvYtId));
  const embedKind = classifyStreamingSource(rawForStreaming ?? undefined);
  const iframeFrameClass =
    embedKind === "soundcloud"
      ? "min-h-[166px] h-[166px] sm:min-h-[180px] sm:h-[180px]"
      : embedKind === "suno"
        ? "min-h-[280px] h-[320px] sm:h-[360px]"
        : isWidePlayer
          ? "aspect-video"
          : "aspect-square";

  const adminTrack = {
    id: track?.id ?? currentTrackId,
    creatorId: (track as { creatorId?: number } | null)?.creatorId,
    title: track?.title ?? "",
    creatorName: (track as { artistName?: string | null } | null)?.artistName || track?.creatorName || "",
    genre: track?.genre ?? "",
    coverImageUrl: track?.coverImageUrl ?? null,
    audioUrl: track?.audioUrl ?? "",
    mvUrl: track?.mvUrl ?? null,
    trackType: track?.trackType ?? "audio",
    aiPrompt: (track as { aiPrompt?: string | null } | null)?.aiPrompt ?? null,
    aiPromptEditCount: (track as { aiPromptEditCount?: number } | null)?.aiPromptEditCount ?? 0,
    aiPromptLastEditedAt: (track as { aiPromptLastEditedAt?: string | null } | null)?.aiPromptLastEditedAt ?? null,
    likesCount: (track as { likesCount?: number } | null)?.likesCount ?? 0,
    viewerHasLikedToday: !!(track as { viewerHasLikedToday?: boolean } | null)?.viewerHasLikedToday,
  };

  const creatorProfileSlug = (() => {
    const fromCreator = (trackData as { creator?: { username?: string } } | null)?.creator?.username;
    if (typeof fromCreator === "string" && fromCreator.trim()) return fromCreator.trim();
    const fromName = track?.creatorName;
    if (typeof fromName === "string" && fromName.trim()) return fromName.trim().toLowerCase();
    return "unknown";
  })();

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/music" className="inline-flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-[0.2em]">
          <ArrowLeft className="w-4 h-4" /> Back to Music
        </Link>
        <TrackAdminActions track={adminTrack} deleteRedirectTo="/music" />
      </div>

      {currentTrackId && trackOwnerId != null ? (
        <TrackClaimSection
          trackId={currentTrackId}
          claimableByCreators={claimable}
          trackOwnerProfileId={trackOwnerId}
        />
      ) : null}

      {isTrackOwner ? (
        <div className="rounded-sm border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400/90 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Battle boost (your track)
          </p>
          {activeBoostForTrack ? (
            <p className="text-[11px] text-zinc-300">
              Active: {activeBoostForTrack.currentImpressions} / {activeBoostForTrack.targetImpressions} impressions.
              When complete, a 48h cooldown applies before you can boost this track again.
            </p>
          ) : boostEligibility?.reason === "cooldown_active" && boostCooldownRemainingMs > 0 ? (
            <p className="text-[11px] text-zinc-300">
              Cooldown: <span className="font-mono text-amber-300">{formatBoostRemaining(boostCooldownRemainingMs)}</span>{" "}
              remaining (global 48h after last run).
            </p>
          ) : boostEligibility?.reason === "weekly_limit" ? (
            <p className="text-[11px] text-zinc-400">
              Weekly boost starts used: {boostEligibility.weeklyStartsUsed} / {boostEligibility.weeklyStartsMax}. Try again
              after older runs fall outside the rolling 7-day window.
            </p>
          ) : (
            <p className="text-[11px] text-zinc-400">
              Spend one boost ticket to increase this track&apos;s chance of appearing in battles until the impression goal
              is reached. One active boost per track; 48h cooldown after completion.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500 uppercase tracking-widest">
            <span>Tickets: {boostMe?.ticketBalance ?? "—"}</span>
            {boostEligibility ? (
              <span>
                This week (this track): {boostEligibility.weeklyStartsUsed}/{boostEligibility.weeklyStartsMax}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            disabled={
              boostActivateMutation.isPending ||
              !!activeBoostForTrack ||
              (boostMe?.ticketBalance ?? 0) <= 0 ||
              boostCooldownRemainingMs > 0 ||
              boostEligibility?.reason === "weekly_limit" ||
              boostEligibility?.eligible === false
            }
            onClick={() => boostActivateMutation.mutate()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest bg-amber-500/90 text-black hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none"
          >
            {boostActivateMutation.isPending ? "Starting…" : activeBoostForTrack ? "Boost running" : "Use 1 ticket — start boost"}
          </button>
        </div>
      ) : null}

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
                className={`w-full bg-zinc-900 border border-white/10 rounded-sm relative overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.08)] ${ytId ? "" : iframeFrameClass}`}
              >
                {ytId ? (
                  <YoutubePlayer
                    videoId={ytId}
                    autoplay={true}
                    onEnded={handleTrackEnded}
                  />
                ) : streamLoading && !playableSrc ? (
                  <div className="w-full min-h-[280px] flex flex-col items-center justify-center gap-3 text-zinc-500">
                    <Loader2 className="w-12 h-12 animate-spin text-primary/60" />
                    <p className="text-[9px] font-bold uppercase tracking-widest">{t("suno.resolving")}</p>
                  </div>
                ) : playableSrc ? (
                  <>
                    <iframe
                      key={playableSrc}
                      src={playableSrc}
                      width="100%"
                      height="100%"
                      style={{ border: "none" }}
                      allow="autoplay; encrypted-media; fullscreen; clipboard-write; picture-in-picture"
                      allowFullScreen
                      title={track.title}
                      {...(embedKind === "suno"
                        ? { referrerPolicy: "strict-origin-when-cross-origin" as const }
                        : {})}
                    />
                    {embedKind === "suno" ? <SunoEmbedOutboundShield /> : null}
                  </>
                ) : streamError ? (
                  <div className="w-full min-h-[200px] flex flex-col items-center justify-center gap-2 px-6 text-center">
                    <Music className="w-16 h-16 text-zinc-800" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{streamError}</p>
                  </div>
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

              {/* Prev / Next triangle buttons */}
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToPrev}
                  disabled={!prevTrack || isTransitioning}
                  data-testid="button-prev-track"
                  className="text-zinc-400 hover:text-primary transition-all disabled:opacity-30 text-base leading-none"
                  style={prevTrack ? { textShadow: "0 0 8px rgba(0,240,255,0.7)" } : undefined}
                >
                  ◀
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={goToNext}
                  disabled={!nextTrack || isTransitioning}
                  data-testid="button-next-track"
                  className="text-zinc-400 hover:text-primary transition-all disabled:opacity-30 text-base leading-none"
                  style={nextTrack ? { textShadow: "0 0 8px rgba(0,240,255,0.7)" } : undefined}
                >
                  ▶
                </motion.button>
              </div>
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
                <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tighter uppercase leading-none neon-text-strong neon-text-green">
                  {track.title}
                </h1>
                <Link href={`/profile/${encodeURIComponent(creatorProfileSlug)}`}>
                  <p className="text-primary font-bold uppercase tracking-[0.4em] cursor-pointer hover:text-white transition-colors mt-4" style={{ fontSize: "10px" }}>
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
                  {chartRank ? `NEX #${String(chartRank).padStart(3, "0")}` : ((areTracksLoading || isChartTracksLoading) ? "..." : "-")}
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
                    {nextTrack.coverImageUrl ? (
                      <img src={nextTrack.coverImageUrl} alt={nextTrack.title} className="w-full h-full object-cover" />
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
