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
}

export function MusicVideo() {
  const { data: tracks, isLoading, isError } = useQuery<MVTrack[]>({
    queryKey: ["/api/tracks", "rankingScore", "video"],
    queryFn: async () => {
      const res = await fetch("/api/tracks?sortBy=rankingScore&trackType=video");
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json();
    },
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
          className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase"
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
      ) : !tracks || tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <Video className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm" data-testid="text-mv-chart-empty">No music videos ranked yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, index) => {
            const rank = index + 1;
            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(rank * 0.02, 1) }}
                className="flex items-center gap-4 p-4 border border-white/5 rounded-sm bg-black/20 hover:bg-white/3 hover:border-primary/20 transition-all group"
                data-testid={`row-mv-chart-${track.id}`}
              >
                <div className="w-10 text-center">
                  <span className="text-sm font-mono font-bold text-zinc-500">
                    {String(rank).padStart(2, "0")}
                  </span>
                </div>

                <div className="w-10 h-10 rounded-sm overflow-hidden bg-black/40 border border-white/5 flex-shrink-0 flex items-center justify-center" data-testid={`img-mv-cover-${track.id}`}>
                  {track.coverImage ? (
                    <img src={track.coverImage} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <Video className="w-4 h-4 text-zinc-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-bold text-white uppercase tracking-wider truncate"
                    data-testid={`text-mv-title-${track.id}`}
                  >
                    {track.title}
                  </p>
                  <span
                    className="text-[10px] font-bold text-primary/70 uppercase tracking-widest truncate"
                    data-testid={`text-mv-creator-${track.id}`}
                  >
                    {track.creatorName}
                  </span>
                  <span className="block text-[7px] text-zinc-700 uppercase tracking-[0.2em]">AI Music Creator</span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
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
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
