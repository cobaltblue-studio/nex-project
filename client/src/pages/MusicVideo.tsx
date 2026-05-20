import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Video, Loader2, Search } from "lucide-react";
import { TrackAdminActions } from "@/components/TrackAdminActions";
import { TrackPlayModal } from "@/components/TrackPlayModal";
import { TrackFeedModal, type TrackFeedSnapshot } from "@/components/TrackFeedModal";
import { resolveTrackThumbnailUrl } from "@/lib/trackThumbnail";
import { TrackPlaysStat } from "@/components/TrackPlaysStat";
import { useTranslation } from "react-i18next";

interface MVTrack {
  id: number;
  creatorId?: number;
  title: string;
  creatorName: string;
  genre: string;
  aiPrompt?: string | null;
  aiPromptEditCount?: number;
  aiPromptLastEditedAt?: string | null;
  audioUrl?: string;
  musicVideoUrl?: string;
  coverImageUrl?: string | null;
  trackType?: string;
  rankingScore: number;
  winStreak: number;
  playCount?: number;
  likesCount?: number;
  claimableByCreators?: boolean;
}

export function MusicVideo() {
  const { t } = useTranslation();
  const [playId, setPlayId] = useState<number | null>(null);
  const [feed, setFeed] = useState<{ track: TrackFeedSnapshot; focusComment: boolean } | null>(null);
  const [search, setSearch] = useState("");

  const { data: tracks, isLoading, isError } = useQuery<MVTrack[]>({
    queryKey: ["/api/tracks", "v3", "rankingScore", "video", search ? "search-all-active" : "status-CHART", search],
    staleTime: 60_000,
    queryFn: async () => {
      const params = new URLSearchParams({
        sortBy: "rankingScore",
        trackType: "video",
        limit: "100",
      });
      const q = search.trim();
      if (!q) params.set("status", "CHART");
      if (q) params.set("q", q);
      const res = await fetch(`/api/tracks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json();
    },
  });
  const isSearching = search.trim().length > 0;

  const playing = tracks?.find((t) => t.id === playId) ?? null;

  const thumbnailFor = (track: MVTrack) =>
    resolveTrackThumbnailUrl({
      coverImageUrl: track.coverImageUrl,
      musicVideoUrl: track.musicVideoUrl,
      audioUrl: track.audioUrl,
    });

  const chartTracks = tracks ?? [];
  const slots = chartTracks.map((track, i) => ({ rank: i + 1, track }));

  return (
    <div className="max-w-3xl mx-auto">
      <TrackPlayModal
        open={playId != null && !!playing}
        onOpenChange={(o) => !o && setPlayId(null)}
        title={playing?.title ?? ""}
        creatorName={playing?.creatorName ?? ""}
        audioUrl={playing?.audioUrl}
        mvUrl={playing?.musicVideoUrl}
        trackType={playing?.trackType ?? "video"}
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

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Video className="w-5 h-5 text-primary" />
          <h1
            className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary"
            data-testid="text-mv-chart-label"
          >
            Music Video Chart
          </h1>
        </div>
        <h2
          className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green"
          data-testid="text-mv-chart-title"
        >
          MV TOP 100
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          The top 100 tracks with music videos on NEX.
        </p>
        {!isSearching && chartTracks.length > 0 && chartTracks.length < 100 && (
          <p className="text-[11px] text-zinc-600 mt-1">{t("chart.showingTop", { count: chartTracks.length })}</p>
        )}
        <div className="mt-4 relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, creator, or genre"
            className="w-full pl-9 pr-3 py-2 text-sm bg-black/40 border border-white/10 rounded-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/40"
            data-testid="input-search-mv"
          />
        </div>
        {isSearching && (
          <p className="text-[10px] text-zinc-600 mt-2">
            Searching across all active video tracks.
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-500">Loading Chart…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Video className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm" data-testid="text-mv-chart-error">Failed to Load Chart</p>
        </div>
      ) : chartTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          {isSearching ? <Search className="w-8 h-8 text-zinc-700" /> : <Video className="w-10 h-10 text-zinc-700" />}
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            {isSearching ? `No results for "${search.trim()}"` : "Music videos are loading onto NEX"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map(({ rank, track }) => (
            <div key={track.id}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(rank * 0.02, 1) }}
                  className="flex items-center gap-4 p-4 border border-white/5 rounded-lg bg-black/20 hover:bg-white/3 hover:border-primary/20 transition-all group"
                  data-testid={`row-mv-chart-${track.id}`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setPlayId(track.id)}
                      className="relative w-[120px] sm:w-[170px] shrink-0 rounded-md overflow-hidden border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      data-testid={`img-mv-cover-${track.id}`}
                      aria-label={`Play ${track.title}`}
                    >
                      <div className="aspect-video w-full bg-black/60 flex items-center justify-center">
                        {thumbnailFor(track) ? (
                          <img
                            src={thumbnailFor(track)!}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Video className="w-8 h-8 text-zinc-700" />
                        )}
                      </div>
                    </button>

                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p
                          className="text-xs sm:text-sm font-bold text-white tracking-wide line-clamp-2 leading-tight break-words"
                          data-testid={`text-mv-title-${track.id}`}
                        >
                          {track.title}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold text-primary/70 uppercase tracking-widest truncate block mt-0.5"
                        data-testid={`text-mv-creator-${track.id}`}
                      >
                        {track.creatorName}
                      </span>
                      {track.winStreak > 0 && (
                        <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-xs text-[8px] font-bold border border-orange-500/20" data-testid={`text-mv-chart-streak-${track.id}`}>
                          🔥 WIN STREAK: {track.winStreak}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 ml-auto">
                    <TrackPlaysStat playCount={track.playCount} testId={`text-mv-plays-${track.id}`} />
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
                        trackType: track.trackType ?? "video",
                        aiPrompt: track.aiPrompt,
                        aiPromptEditCount: track.aiPromptEditCount,
                        aiPromptLastEditedAt: track.aiPromptLastEditedAt,
                        likesCount: track.likesCount,
                      }}
                      onCommentClick={() =>
                        setFeed({
                          track: {
                            id: track.id,
                            title: track.title,
                            creatorName: track.creatorName,
                            audioUrl: track.audioUrl,
                            mvUrl: track.musicVideoUrl,
                            trackType: track.trackType ?? "video",
                            aiPrompt: track.aiPrompt,
                          },
                          focusComment: true,
                        })
                      }
                    />
                  </div>
                </motion.div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
