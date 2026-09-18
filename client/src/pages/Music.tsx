import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Music as MusicIcon, Loader2, Crown, Star, TrendingUp, Search } from "lucide-react";
import { BattleWinsIndicator } from "@/components/BattleWinsIndicator";
import { RankSpike } from "@/components/RankSpike";
import { getOfficialGenreIcon } from "@/lib/officialGenreIcon";
import { TrackAdminActions } from "@/components/TrackAdminActions";
import { TrackPlayModal } from "@/components/TrackPlayModal";
import { TrackFeedModal, type TrackFeedSnapshot } from "@/components/TrackFeedModal";
import { TrackPlaysStat } from "@/components/TrackPlaysStat";
import { CreatorNameWithBadge } from "@/components/CreatorNameWithBadge";
import { CreatorCrest } from "@/components/CreatorCrest";
import { crestInputsFromChartTrack } from "@/lib/creatorCrest";
import { TrackNewBadge } from "@/components/TrackNewBadge";
import { useTranslation } from "react-i18next";

interface ChartTrack {
  id: number;
  creatorId?: number;
  title: string;
  creatorName: string;
  genre: string;
  audioUrl: string;
  coverImageUrl?: string | null;
  playCount: number;
  likesCount?: number;
  commentsCount?: number;
  claimableByCreators?: boolean;
  provenanceStatus?: string;
  rankingScore: number;
  winStreak: number;
  aiPrompt?: string | null;
  aiPromptEditCount?: number;
  aiPromptLastEditedAt?: string | null;
  totalBattles?: number;
  wins?: number;
  musicVideoUrl?: string | null;
  trackType?: string;
  createdAt?: string;
}

function getZoneForRank(
  rank: number,
  zoneLabel: (key: "zoneLegend" | "zoneElite" | "zoneRising") => string,
): { label: string; icon: typeof Crown; color: string; bgColor: string; borderColor: string } | null {
  if (rank === 1) return { label: zoneLabel("zoneLegend"), icon: Crown, color: "text-arena", bgColor: "bg-[hsl(var(--nex-wow-ember)/0.12)]", borderColor: "border-[hsl(var(--nex-wow-ember)/0.35)]" };
  if (rank === 11) return { label: zoneLabel("zoneElite"), icon: Star, color: "text-verdict", bgColor: "bg-[hsl(var(--nex-wow-teal)/0.12)]", borderColor: "border-[hsl(var(--nex-wow-teal)/0.35)]" };
  if (rank === 51) return { label: zoneLabel("zoneRising"), icon: TrendingUp, color: "text-arena", bgColor: "bg-[hsl(var(--nex-wow-ember)/0.12)]", borderColor: "border-[hsl(var(--nex-wow-ember)/0.35)]" };
  return null;
}

export function Music() {
  const { t } = useTranslation();
  const [playId, setPlayId] = useState<number | null>(null);
  const [feed, setFeed] = useState<{ track: TrackFeedSnapshot; focusComment: boolean } | null>(null);
  const [search, setSearch] = useState("");

  const { data: tracks, isLoading, isError } = useQuery<ChartTrack[]>({
    queryKey: ["/api/tracks", "v3", "rankingScore", 100, "audio", search ? "search-all-active" : "status-CHART", search],
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("sortBy", "rankingScore");
      params.set("limit", "100");
      params.set("trackType", "audio");
      const q = search.trim();
      if (!q) params.set("status", "CHART");
      if (q) params.set("q", q);
      const res = await fetch(`/api/tracks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch chart");
      return res.json();
    },
  });
  const isSearching = search.trim().length > 0;

  const playing = tracks?.find((t) => t.id === playId) ?? null;

  const chartTracks = tracks ?? [];
  const slots = chartTracks.map((track, i) => ({ rank: i + 1, track }));

  /** Session previous-rank snapshot — no rank-delta API yet (Week 1 heuristic). */
  const [rankDeltas, setRankDeltas] = useState<Record<number, number>>({});
  const chartRankSig = slots.map(({ rank, track }) => `${track.id}:${rank}`).join(",");
  useEffect(() => {
    if (!chartRankSig) return;
    const key = "nex.chart.prevRanks.v1";
    let prev: Record<string, number> = {};
    try {
      prev = JSON.parse(sessionStorage.getItem(key) || "{}") as Record<string, number>;
    } catch {
      prev = {};
    }
    const next: Record<string, number> = {};
    const deltas: Record<number, number> = {};
    for (const part of chartRankSig.split(",")) {
      const [idStr, rankStr] = part.split(":");
      const id = Number(idStr);
      const rank = Number(rankStr);
      next[idStr] = rank;
      const before = prev[idStr];
      if (typeof before === "number" && before > rank) {
        deltas[id] = before - rank;
      }
    }
    sessionStorage.setItem(key, JSON.stringify(next));
    setRankDeltas(deltas);
  }, [chartRankSig]);

  return (
    <div className="max-w-3xl mx-auto">
      <TrackPlayModal
        open={playId != null && !!playing}
        onOpenChange={(o) => !o && setPlayId(null)}
        title={playing?.title ?? ""}
        creatorName={playing?.creatorName ?? ""}
        audioUrl={playing?.audioUrl}
        mvUrl={playing?.musicVideoUrl}
        coverImageUrl={playing?.coverImageUrl}
        trackType={playing?.trackType}
        aiPrompt={playing?.aiPrompt}
        trackId={playing?.id ?? null}
        claimableByCreators={!!playing?.claimableByCreators}
        trackOwnerProfileId={playing?.creatorId ?? null}
      />
      <TrackFeedModal
        open={feed != null}
        onOpenChange={(o) => !o && setFeed(null)}
        track={feed?.track ?? null}
        focusCommentOnOpen={feed?.focusComment ?? false}
      />

      <header className="mb-10" data-testid="music-arena-header">
        <div className="flex items-center gap-3 mb-2">
          <MusicIcon className="w-5 h-5 text-arena" aria-hidden />
          <h1 className="nex-ember-lead-eyebrow" data-testid="text-chart-label">
            {t("musicChart.label")}
          </h1>
        </div>
        <h2 className="nex-ember-lead-title" data-testid="text-chart-title">
          {t("musicChart.title")}
        </h2>
        <p className="text-zinc-500 text-sm mt-2">{t("musicChart.subtitle")}</p>
        {!isSearching && chartTracks.length > 0 && chartTracks.length < 100 && (
          <p className="text-[11px] text-zinc-600 mt-1" data-testid="text-chart-live-count">
            {t("chart.showingTop", { count: chartTracks.length })}
          </p>
        )}
        <div className="mt-4 relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 text-sm bg-black/40 border border-white/10 rounded-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[hsl(var(--nex-wow-ember)/0.45)]"
            data-testid="input-search-music"
            aria-label={t("common.searchPlaceholder")}
          />
        </div>
        {isSearching && (
          <p className="text-[10px] text-zinc-600 mt-2">
            {t("common.searchHintAudio")}
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-arena animate-spin" />
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-500">{t("common.loadingChart")}</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <MusicIcon className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm" data-testid="text-chart-error">{t("common.failedLoadChart")}</p>
          <p className="text-zinc-700 text-[11px] max-w-sm">{t("common.failedLoadRetry")}</p>
        </div>
      ) : chartTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          {isSearching ? <Search className="w-8 h-8 text-zinc-700" /> : <MusicIcon className="w-10 h-10 text-zinc-700" />}
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-400" data-testid="text-chart-empty">
            {isSearching ? t("common.noSearchResults", { q: search.trim() }) : t("common.chartLoadingEmpty")}
          </p>
          <p className="text-[11px] text-zinc-600">
            {isSearching ? t("common.searchKeywordsHint") : t("common.chartEmptyHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map(({ rank, track }) => {
            const zone = getZoneForRank(rank, (key) => t(`musicChart.${key}`));
            const ChartGenreIcon = getOfficialGenreIcon(track.genre);
            return (
              <div key={track.id}>
                {zone && (
                  <div
                    className={`flex items-center gap-3 px-4 py-3 mb-2 mt-4 border ${zone.borderColor} ${zone.bgColor} rounded-sm`}
                    data-testid={`zone-label-${rank}`}
                  >
                    <zone.icon className={`w-4 h-4 ${zone.color}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-[0.3em] ${zone.color}`}>
                      {zone.label}
                    </span>
                    <div className={`h-px flex-1 ${zone.borderColor}`} />
                    <span className="text-[9px] uppercase tracking-widest text-zinc-600">
                      {rank === 1 ? "#1 – #10" : rank === 11 ? "#11 – #50" : "#51 – #100"}
                    </span>
                  </div>
                )}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(rank * 0.02, 1) }}
                    className="nex-chart-row flex items-center gap-3 sm:gap-4 p-4 border border-white/5 rounded-sm bg-black/20 hover:bg-white/3 transition-all group"
                    data-testid={`row-chart-${track.id}`}
                  >
                    <div className="w-8 sm:w-10 text-center shrink-0 flex flex-col items-center gap-0.5">
                      <span className="text-xs sm:text-sm font-mono font-bold text-verdict">
                        {String(rank).padStart(2, "0")}
                      </span>
                      <RankSpike delta={rankDeltas[track.id] ?? 0} />
                    </div>

                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setPlayId(track.id)}
                        className="w-10 h-10 rounded-md overflow-hidden bg-black/40 border border-white/5 flex-shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--nex-wow-ember)/0.55)]"
                        data-testid={`img-chart-cover-${track.id}`}
                        aria-label={`Play ${track.title}`}
                      >
                        {track.coverImageUrl ? (
                          <img src={track.coverImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ChartGenreIcon className="w-4 h-4 text-zinc-600" strokeWidth={1.75} aria-hidden />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[0.66rem] sm:text-[0.72rem] font-bold text-white tracking-wide line-clamp-2 leading-tight break-words"
                          data-testid={`text-chart-title-${track.id}`}
                        >
                          <TrackNewBadge createdAt={track.createdAt} testId={`badge-new-${track.id}`} className="mr-1.5 align-middle" />
                          {track.title}
                        </p>
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap mt-0.5">
                          <CreatorNameWithBadge
                            name={track.creatorName}
                            provenanceStatus={track.provenanceStatus}
                            nameClassName="text-[9px] font-bold text-primary/70 uppercase tracking-widest"
                            testId={`text-chart-creator-${track.id}`}
                          />
                          <CreatorCrest
                            mode="compact"
                            inputs={crestInputsFromChartTrack({
                              wins: track.wins,
                              winStreak: track.winStreak,
                              rank,
                            })}
                            testId={`crest-chart-${track.id}`}
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap md:hidden">
                          <span className="text-[7px] text-zinc-700 uppercase tracking-[0.2em] border border-white/5 px-1 py-0.5 rounded-xs">
                            {track.genre}
                          </span>
                          {track.winStreak > 0 && (
                            <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-xs text-[7px] font-bold border border-orange-500/20" data-testid={`text-chart-streak-${track.id}`}>
                              🔥 {track.winStreak}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-auto">
                      <div className="hidden md:flex items-center gap-2">
                        <span className="text-[7px] text-zinc-700 uppercase tracking-[0.2em] border border-white/5 px-1 py-0.5 rounded-xs">
                          {track.genre}
                        </span>
                        {track.winStreak > 0 && (
                          <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-xs text-[7px] font-bold border border-orange-500/20" data-testid={`text-chart-streak-${track.id}`}>
                            🔥 {track.winStreak}
                          </span>
                        )}
                      </div>

                      <TrackPlaysStat
                        playCount={track.playCount}
                        testId={`text-chart-plays-${track.id}`}
                      />

                      <BattleWinsIndicator wins={track.wins ?? 0} testId={`text-chart-wins-${track.id}`} />

                      <TrackAdminActions
                        compact
                        track={{
                          id: track.id,
                          creatorId: track.creatorId,
                          title: track.title,
                          creatorName: track.creatorName,
                          genre: track.genre,
                          coverImageUrl: track.coverImageUrl,
                          audioUrl: track.audioUrl,
                          mvUrl: track.musicVideoUrl ?? null,
                          trackType: track.trackType,
                          aiPrompt: track.aiPrompt,
                          aiPromptEditCount: track.aiPromptEditCount,
                          aiPromptLastEditedAt: track.aiPromptLastEditedAt,
                          likesCount: track.likesCount,
                          commentsCount: track.commentsCount,
                        }}
                        onCommentClick={() =>
                          setFeed({
                            track: {
                              id: track.id,
                              title: track.title,
                              creatorName: track.creatorName,
                              audioUrl: track.audioUrl,
                              mvUrl: track.musicVideoUrl,
                              coverImageUrl: track.coverImageUrl,
                              trackType: track.trackType,
                              aiPrompt: track.aiPrompt,
                            },
                            focusComment: true,
                          })
                        }
                      />
                    </div>
                  </motion.div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
