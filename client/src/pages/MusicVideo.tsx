import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Video, Loader2, Dna, Search } from "lucide-react";
import { TrackAdminActions } from "@/components/TrackAdminActions";
import { TrackPlayModal } from "@/components/TrackPlayModal";
import { TrackFeedModal, type TrackFeedSnapshot } from "@/components/TrackFeedModal";

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
}

const TOTAL_SLOTS = 100;

export function MusicVideo() {
  const [playId, setPlayId] = useState<number | null>(null);
  const [feed, setFeed] = useState<{ track: TrackFeedSnapshot; focusComment: boolean } | null>(null);
  const [search, setSearch] = useState("");

  const { data: tracks, isLoading, isError } = useQuery<MVTrack[]>({
    queryKey: ["/api/tracks", "rankingScore", "video", search ? "search-all-active" : "status-CHART", search],
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

  const slots = isSearching
    ? (tracks ?? []).map((track, i) => ({ rank: i + 1, track }))
    : Array.from({ length: TOTAL_SLOTS }, (_, i) => {
        const track = tracks?.[i] ?? null;
        return { rank: i + 1, track };
      });

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
      ) : isSearching && (tracks?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Search className="w-8 h-8 text-zinc-700" />
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            No results for "{search.trim()}"
          </p>
          <p className="text-[11px] text-zinc-600">Try title, creator, or genre keywords.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map(({ rank, track }) => (
            <div key={track ? track.id : `empty-${rank}`}>
              {track ? (
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
                        {track.coverImageUrl ? (
                          <img src={track.coverImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Video className="w-8 h-8 text-zinc-700" />
                        )}
                      </div>
                    </button>

                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p
                          className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate"
                          data-testid={`text-mv-title-${track.id}`}
                        >
                          {track.title}
                        </p>
                        <div className="relative group/dna shrink-0">
                          <button type="button" aria-label="AI DNA info" className="focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded-sm" data-testid={`icon-mv-dna-${track.id}`}>
                            <Dna className="w-3.5 h-3.5 text-cyan-400" style={{ filter: "drop-shadow(0 0 4px rgba(0,255,200,0.6))" }} />
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/dna:block group-focus-within/dna:block z-50 pointer-events-none" role="tooltip">
                            <div className="px-3 py-2.5 rounded-md font-mono text-[9px] leading-relaxed whitespace-nowrap"
                              style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,255,200,0.4)", boxShadow: "0 0 12px rgba(0,255,200,0.15)" }}>
                              <p className="text-cyan-300">[MODEL: NEX_LYRIA] [SEED: 7721] [STYLE: AI_SOUL]</p>
                            </div>
                          </div>
                        </div>
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
                    {track.playCount != null && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-zinc-300">{track.playCount.toLocaleString()}</p>
                        <p className="text-[7px] uppercase tracking-widest text-zinc-600">Plays</p>
                      </div>
                    )}
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
              ) : (
                <div
                  className="flex gap-5 p-4 border border-white/5 rounded-lg bg-black/10"
                  data-testid={`row-mv-chart-empty-${rank}`}
                >
                  <div className="relative w-[170px] shrink-0">
                    <div className="aspect-video w-full rounded-md overflow-hidden bg-black/30 border border-white/5 flex items-center justify-center">
                      <Video className="w-6 h-6 text-zinc-800" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-sm text-zinc-700 italic">— empty</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
