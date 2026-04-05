import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, Loader2, Dna, Search } from "lucide-react";
import { getOfficialGenreIcon } from "@/lib/officialGenreIcon";
import { TrackAdminActions } from "@/components/TrackAdminActions";
import { TrackPlayModal } from "@/components/TrackPlayModal";
import { TrackFeedModal, type TrackFeedSnapshot } from "@/components/TrackFeedModal";

interface NewTrack {
  id: number;
  creatorId?: number;
  title: string;
  creatorName: string;
  genre: string;
  playCount: number;
  aiPrompt?: string | null;
  aiPromptEditCount?: number;
  aiPromptLastEditedAt?: string | null;
  createdAt: string;
  coverImageUrl?: string | null;
  audioUrl?: string;
  musicVideoUrl?: string | null;
  trackType?: string;
  winRate?: number;
}

const LIST_LIMIT = 100;

export function New() {
  const [playId, setPlayId] = useState<number | null>(null);
  const [feed, setFeed] = useState<{ track: TrackFeedSnapshot; focusComment: boolean } | null>(null);
  const [search, setSearch] = useState("");

  const { data: tracks, isLoading, isError } = useQuery<NewTrack[]>({
    queryKey: ["/api/tracks", "createdAt", LIST_LIMIT, "audio-only-new", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("sortBy", "createdAt");
      params.set("limit", String(LIST_LIMIT));
      params.set("trackType", "audio");
      const q = search.trim();
      if (q) params.set("q", q);
      const res = await fetch(`/api/tracks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch new tracks");
      return res.json();
    },
  });

  const playing = tracks?.find((t) => t.id === playId) ?? null;

  return (
    <div className="max-w-3xl mx-auto">
      <TrackPlayModal
        open={playId != null && !!playing}
        onOpenChange={(o) => !o && setPlayId(null)}
        title={playing?.title ?? ""}
        creatorName={playing?.creatorName ?? ""}
        audioUrl={playing?.audioUrl}
        mvUrl={playing?.musicVideoUrl}
        trackType={playing?.trackType}
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
          <Clock className="w-5 h-5 text-primary" />
          <h1
            className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary"
            data-testid="text-new-label"
          >
            Music Chart
          </h1>
        </div>
        <h2
          className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green"
          data-testid="text-new-title"
        >
          NEW ON NEX
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          Latest audio releases — same lane as the main chart, without MV duplicates.
        </p>
        <div className="mt-4 relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, creator, or genre"
            className="w-full pl-9 pr-3 py-2 text-sm bg-black/40 border border-white/10 rounded-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/40"
            data-testid="input-search-new"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-500">Loading New Tracks…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Clock className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm" data-testid="text-new-error">Failed to Load</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(tracks ?? []).map((track, idx) => {
            const GenreIcon = getOfficialGenreIcon(track.genre);
            return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 1) }}
              className="flex items-center gap-3 sm:gap-4 p-4 border border-white/5 rounded-sm bg-black/20 hover:bg-white/3 hover:border-primary/20 transition-all group"
              data-testid={`row-new-${track.id}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 sm:w-10 flex justify-center shrink-0" data-testid={`icon-new-genre-${track.id}`}>
                  <GenreIcon className="w-5 h-5 text-primary/80 shrink-0" strokeWidth={1.75} aria-hidden />
                </div>

                <button
                  type="button"
                  onClick={() => setPlayId(track.id)}
                  className="shrink-0 rounded-md overflow-hidden border border-white/10 bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  data-testid={`img-new-cover-${track.id}`}
                  aria-label={`Play ${track.title}`}
                >
                  {track.coverImageUrl ? (
                    <img
                      src={track.coverImageUrl}
                      alt=""
                      className="w-10 h-10 sm:w-11 sm:h-11 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
                      <GenreIcon className="w-4 h-4 text-zinc-600" strokeWidth={1.75} />
                    </div>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className="text-[0.65rem] sm:text-[0.7rem] font-bold text-white uppercase tracking-wider truncate leading-tight"
                    data-testid={`text-new-track-title-${track.id}`}
                  >
                    {track.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span
                      className="text-[9px] font-bold text-primary/70 uppercase tracking-widest truncate"
                      data-testid={`text-new-track-creator-${track.id}`}
                    >
                      {track.creatorName}
                    </span>
                    <span className="text-[8px] text-zinc-600 uppercase tracking-widest">
                      {track.genre}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 md:hidden">
                    <div className="relative group/dna shrink-0">
                      <button type="button" aria-label="AI DNA info" className="focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded-sm flex items-center gap-1">
                        <Dna className="w-3 h-3 text-cyan-400" style={{ filter: "drop-shadow(0 0 4px rgba(0,255,200,0.6))" }} />
                        <span className="text-[7px] font-mono font-bold text-cyan-400 uppercase tracking-wider">[AI_DNA]</span>
                      </button>
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover/dna:block group-focus-within/dna:block z-50 pointer-events-none" role="tooltip">
                        <div className="px-3 py-2.5 rounded-md font-mono text-[9px] leading-relaxed whitespace-nowrap text-white"
                          style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,255,128,0.4)", boxShadow: "0 0 12px rgba(0,255,128,0.15)" }}>
                          <p>{track.aiPrompt || "[RAW_DATA_SYNCED | SEED: 7721]"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-auto">
                <div className="hidden md:flex items-center gap-2">
                  <div className="relative group/dna shrink-0">
                    <button type="button" aria-label="AI DNA info" className="focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded-sm flex items-center gap-1" data-testid={`badge-ai-dna-${track.id}`}>
                      <Dna className="w-3 h-3 text-cyan-400" style={{ filter: "drop-shadow(0 0 4px rgba(0,255,200,0.6))" }} />
                      <span className="text-[7px] font-mono font-bold text-cyan-400 uppercase tracking-wider">[AI_DNA]</span>
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover/dna:block group-focus-within/dna:block z-50 pointer-events-none" role="tooltip">
                      <div className="px-3 py-2.5 rounded-md font-mono text-[9px] leading-relaxed whitespace-nowrap text-white max-w-[min(90vw,280px)]"
                        style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,255,128,0.4)", boxShadow: "0 0 12px rgba(0,190,255,0.15)" }}>
                        <p>{track.aiPrompt || "[RAW_DATA_SYNCED | SEED: 7721]"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col items-end text-right min-w-[52px]">
                  <p className="text-xs font-bold text-zinc-300">{(track.playCount ?? 0).toLocaleString()}</p>
                  <p className="text-[7px] uppercase tracking-widest text-zinc-600">Plays</p>
                </div>

                {track.winRate != null && (
                  <div className="hidden md:flex flex-col items-end text-right min-w-[48px]">
                    <p className="text-xs font-display font-bold text-primary">{track.winRate}%</p>
                    <p className="text-[7px] uppercase tracking-widest text-zinc-600">Win</p>
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
                    trackType: track.trackType,
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
                        trackType: track.trackType,
                        aiPrompt: track.aiPrompt,
                      },
                      focusComment: true,
                    })
                  }
                />
              </div>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
