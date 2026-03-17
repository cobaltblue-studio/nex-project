import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, Loader2, Headphones, Flame, Clock } from "lucide-react";
import { Link } from "wouter";

interface RisingTrack {
  id: number;
  title: string;
  creatorName: string;
  genre: string;
  audioUrl: string;
  rankingScore: number;
  totalBattles: number;
  wins: number;
  winRate: number;
}

export function Rising() {
  const { data: tracks, isLoading } = useQuery<RisingTrack[]>({
    queryKey: ["/api/tracks/rising"],
  });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h1 className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary">Battle Charts</h1>
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green">
          RISING
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          Tracks climbing through battles — not yet in the top chart.
        </p>

        {/* Criteria badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 border border-white/10 rounded-sm text-zinc-500">
            5+ Battles
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 border border-white/10 rounded-sm text-zinc-500">
            60%+ Win Rate
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 border border-white/10 rounded-sm text-zinc-500">
            Outside Top 100
          </span>
        </div>
      </div>

      {/* Track list */}
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
            Tracks need at least 5 battles with a 60%+ win rate to appear here.
            Go to Battle and start competing!
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-4 h-4 text-primary" style={{ filter: "drop-shadow(0 0 6px hsla(189,100%,50%,0.6))", animation: "neon-pulse 2s ease-in-out infinite" }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Check again in 24h</span>
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
            const totalTracks = tracks.length;
            const intensity = totalTracks > 1 ? 1 - (idx / (totalTracks - 1)) : 1;
            const glowOpacity = 0.2 + intensity * 0.8;
            const glowSpread = 4 + intensity * 12;
            const hue = 30 - intensity * 30;
            return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="flex items-center gap-4 p-4 border border-white/5 rounded-sm bg-black/20 hover:bg-white/3 hover:border-primary/20 transition-all group"
              style={{
                borderLeft: `3px solid hsla(${hue}, 100%, 50%, ${glowOpacity})`,
                boxShadow: `inset ${glowSpread}px 0 ${glowSpread * 2}px -${glowSpread}px hsla(${hue}, 100%, 50%, ${glowOpacity * 0.4})`,
              }}
              data-testid={`row-rising-${track.id}`}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                <span className="text-[10px] font-mono font-bold text-zinc-600">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white uppercase tracking-wider truncate" data-testid={`text-rising-title-${track.id}`}>
                  {track.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest truncate" data-testid={`text-rising-creator-${track.id}`}>
                    {track.creatorName}
                  </span>
                  <span className="text-[8px] text-zinc-700 px-1.5 py-0.5 border border-white/5 rounded-sm">
                    {track.genre}
                  </span>
                </div>
              </div>

              {/* Battle stats */}
              <div className="flex items-center gap-5 shrink-0">
                {/* Win Rate */}
                <div className="text-center min-w-[56px]">
                  <p
                    className="text-lg font-display font-bold text-primary"
                    data-testid={`text-rising-winrate-${track.id}`}
                  >
                    {track.winRate}%
                  </p>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-600 mt-0.5">Win Rate</p>
                </div>

                {/* Total Battles */}
                <div className="text-center min-w-[48px]">
                  <p
                    className="text-sm font-bold text-zinc-300"
                    data-testid={`text-rising-battles-${track.id}`}
                  >
                    {track.totalBattles}
                  </p>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-600 mt-0.5">Battles</p>
                </div>

                {/* Listen button */}
                <Link href={`/track/${track.id}`}>
                  <button
                    data-testid={`button-rising-listen-${track.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-sm text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <Headphones className="w-3 h-3" />
                    Listen
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
