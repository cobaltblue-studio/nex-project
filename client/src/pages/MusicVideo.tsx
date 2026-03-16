import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Video, Loader2, Play } from "lucide-react";
import { Link } from "wouter";

interface MVTrack {
  id: number;
  title: string;
  creatorName: string;
  genre: string;
  musicVideoUrl?: string;
  coverImage?: string;
  trackType?: string;
  rankingScore: number;
  winStreak: number;
}

const TOTAL_SLOTS = 100;

export function MusicVideo() {
  const { data: tracks, isLoading, isError } = useQuery<MVTrack[]>({
    queryKey: ["/api/tracks", "rankingScore", "video"],
    queryFn: async () => {
      const res = await fetch("/api/tracks?sortBy=rankingScore&trackType=video");
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json();
    },
  });

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const track = tracks?.[i] ?? null;
    return { rank: i + 1, track };
  });

  return (
    <div className="max-w-3xl mx-auto">
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
          className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-green"
          data-testid="text-mv-chart-title"
        >
          MV TOP 100
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          The top 100 tracks with music videos on NEX.
        </p>
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
      ) : (
        <div className="space-y-4">
          {slots.map(({ rank, track }) => (
            <div key={track ? track.id : `empty-${rank}`}>
              {track ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(rank * 0.02, 1) }}
                  className="flex gap-5 p-4 border border-white/5 rounded-lg bg-black/20 hover:bg-white/3 hover:border-primary/20 transition-all group"
                  data-testid={`row-mv-chart-${track.id}`}
                >
                  <div className="relative w-[170px] shrink-0" data-testid={`img-mv-cover-${track.id}`}>
                    <div className="aspect-video w-full rounded-md overflow-hidden bg-black/60 border border-white/5 flex items-center justify-center">
                      {track.coverImage ? (
                        <img src={track.coverImage} alt={track.title} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="w-8 h-8 text-zinc-700" />
                      )}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-zinc-600">
                          #{String(rank).padStart(2, "0")}
                        </span>
                      </div>
                      <p
                        className="text-sm font-bold text-white uppercase tracking-wider truncate"
                        data-testid={`text-mv-title-${track.id}`}
                      >
                        {track.title}
                      </p>
                      <span
                        className="text-[10px] font-bold text-primary/70 uppercase tracking-widest truncate block mt-0.5"
                        data-testid={`text-mv-creator-${track.id}`}
                      >
                        {track.creatorName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      {track.winStreak > 0 && (
                        <span className="inline-block px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-xs text-[8px] font-bold border border-orange-500/20" data-testid={`text-mv-chart-streak-${track.id}`}>
                          🔥 WIN STREAK: {track.winStreak}
                        </span>
                      )}
                      <Link href={`/mv/${track.id}`}>
                        <button
                          data-testid={`button-mv-watch-${track.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-sm text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                        >
                          <Play className="w-3 h-3" />
                          Watch
                        </button>
                      </Link>
                    </div>
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
                    <span className="text-xs font-mono font-bold text-zinc-700 mb-1">
                      #{String(rank).padStart(2, "0")}
                    </span>
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
