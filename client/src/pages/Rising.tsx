import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, Flame, Clock, Search } from "lucide-react";
import { BattleWinsIndicator } from "@/components/BattleWinsIndicator";
import { Link } from "wouter";
import { getOfficialGenreIcon } from "@/lib/officialGenreIcon";
import { TrackAdminActions } from "@/components/TrackAdminActions";
import { TrackPlayModal } from "@/components/TrackPlayModal";
import { TrackFeedModal, type TrackFeedSnapshot } from "@/components/TrackFeedModal";

interface RisingTrack {
  id: number;
  creatorId?: number;
  title: string;
  creatorName: string;
  genre: string;
  audioUrl: string;
  aiPrompt?: string | null;
  aiPromptEditCount?: number;
  aiPromptLastEditedAt?: string | null;
  playCount?: number;
  likesCount?: number;
  claimableByCreators?: boolean;
  rankingScore: number;
  totalBattles: number;
  wins: number;
  coverImageUrl?: string | null;
  musicVideoUrl?: string | null;
  trackType?: string;
}

export function Rising() {
  const [playId, setPlayId] = useState<number | null>(null);
  const [feed, setFeed] = useState<{ track: TrackFeedSnapshot; focusComment: boolean } | null>(null);
  const [search, setSearch] = useState("");

  const { data: tracks, isLoading } = useQuery<RisingTrack[]>({
    queryKey: ["/api/tracks/rising", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      const q = search.trim();
      if (q) params.set("q", q);
      const url = params.toString() ? `/api/tracks/rising?${params.toString()}` : "/api/tracks/rising";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch rising tracks");
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
          <TrendingUp className="w-5 h-5 text-primary" />
          <h1 className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary">Music Chart</h1>
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green">
          RISING
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          Tracks outside the top chart — surfaced by play momentum (views).
        </p>

        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 border border-white/10 rounded-sm text-zinc-500">
            Audio only
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 border border-white/10 rounded-sm text-zinc-500">
            Not in top 100
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 border border-white/10 rounded-sm text-zinc-500">
            Plays ↓ sort
          </span>
        </div>
        <div className="mt-4 relative max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, creator, or genre"
            className="w-full pl-9 pr-3 py-2 text-sm bg-black/40 border border-white/10 rounded-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/40"
            data-testid="input-search-rising"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-500">Loading Rising Tracks…</p>
        </div>
      ) : !tracks || tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Flame className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">No Rising Tracks Yet</p>
          <p className="text-zinc-700 text-[11px] max-w-sm">
            When audio tracks pick up plays outside the top 100, they appear here.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-4 h-4 text-primary" style={{ filter: "drop-shadow(0 0 6px hsla(189,100%,50%,0.6))", animation: "neon-pulse 2s ease-in-out infinite" }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Fuel the chart</span>
          </div>
          <Link href="/battle">
            <button className="mt-2 px-6 py-2.5 border border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all">
              Go to Battle
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, idx) => {
            const GenreIcon = getOfficialGenreIcon(track.genre);
            return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 1) }}
              className="flex items-center gap-3 sm:gap-4 p-4 border border-white/5 rounded-sm bg-black/20 hover:bg-white/3 hover:border-primary/20 transition-all group"
              data-testid={`row-rising-${track.id}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setPlayId(track.id)}
                  className="shrink-0 w-10 h-10 rounded-md overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label={`Play ${track.title}`}
                >
                  {track.coverImageUrl ? (
                    <img src={track.coverImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <GenreIcon className="w-4 h-4 text-zinc-600" strokeWidth={1.75} />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-[0.68rem] sm:text-[0.75rem] font-bold text-white tracking-wide line-clamp-2 leading-tight break-words" data-testid={`text-rising-title-${track.id}`}>
                    {track.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[9px] sm:text-[10px] font-bold text-primary/70 uppercase tracking-widest truncate" data-testid={`text-rising-creator-${track.id}`}>
                      {track.creatorName}
                    </span>
                    <span className="text-[8px] text-zinc-700 px-1.5 py-0.5 border border-white/5 rounded-sm">
                      {track.genre}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-auto">
                <div className="flex flex-col items-end text-right min-w-[52px]">
                  <p className="text-xs sm:text-sm font-bold text-zinc-100" data-testid={`text-rising-plays-${track.id}`}>
                    {(track.playCount ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-600 mt-0.5">Plays</p>
                </div>

                <BattleWinsIndicator wins={track.wins ?? 0} showFrom="sm" testId={`text-rising-wins-${track.id}`} />

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
