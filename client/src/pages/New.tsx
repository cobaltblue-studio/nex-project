import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, Loader2, Headphones } from "lucide-react";
import { Link } from "wouter";

interface NewTrack {
  id: number;
  title: string;
  creatorName: string;
  genre: string;
  playCount: number;
  createdAt: string;
}

export function New() {
  const { data: tracks, isLoading, isError } = useQuery<NewTrack[]>({
    queryKey: ["/api/tracks", "createdAt", 50],
    queryFn: async () => {
      const res = await fetch("/api/tracks?sortBy=createdAt&limit=50");
      if (!res.ok) throw new Error("Failed to fetch new tracks");
      return res.json();
    },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Clock className="w-5 h-5 text-primary" />
          <h1
            className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary"
            data-testid="text-new-label"
          >
            Recently Added
          </h1>
        </div>
        <h2
          className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase"
          data-testid="text-new-title"
        >
          NEW ON NEX
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          The latest tracks added to the NEX platform, sorted by newest first.
        </p>
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
          {(tracks ?? []).map((track, idx) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 1) }}
              className="flex items-center gap-4 p-4 border border-white/5 rounded-sm bg-black/20 hover:bg-white/3 hover:border-primary/20 transition-all group"
              data-testid={`row-new-${track.id}`}
            >
              <div className="w-10 text-center">
                <span className="text-sm font-mono font-bold text-zinc-500">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-bold text-white uppercase tracking-wider truncate"
                  data-testid={`text-new-track-title-${track.id}`}
                >
                  {track.title}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold text-primary/70 uppercase tracking-widest truncate"
                    data-testid={`text-new-track-creator-${track.id}`}
                  >
                    {track.creatorName}
                  </span>
                  <span className="text-[9px] text-zinc-600 uppercase tracking-widest">
                    {track.genre}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-5 shrink-0">
                <Link href={`/track/${track.id}`}>
                  <button
                    data-testid={`button-new-listen-${track.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-sm text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <Headphones className="w-3 h-3" />
                    Listen
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
