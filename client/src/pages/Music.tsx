import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Music as MusicIcon, Loader2, Headphones, Crown, Star, TrendingUp, Dna } from "lucide-react";
import { Link } from "wouter";

interface ChartTrack {
  id: number;
  title: string;
  creatorName: string;
  genre: string;
  audioUrl: string;
  coverImage?: string;
  playCount: number;
  rankingScore: number;
  winStreak: number;
  totalBattles?: number;
  wins?: number;
  winRate?: number;
}

const TOTAL_SLOTS = 100;

function getZoneForRank(rank: number): { label: string; icon: typeof Crown; color: string; bgColor: string; borderColor: string } | null {
  if (rank === 1) return { label: "Legend Zone", icon: Crown, color: "text-[#FFD700]", bgColor: "bg-[#FFD700]/10", borderColor: "border-[#FFD700]/30" };
  if (rank === 11) return { label: "Elite Zone", icon: Star, color: "text-[#00D1FF]", bgColor: "bg-[#00D1FF]/10", borderColor: "border-[#00D1FF]/30" };
  if (rank === 51) return { label: "Rising Zone", icon: TrendingUp, color: "text-[#00FF9C]", bgColor: "bg-[#00FF9C]/10", borderColor: "border-[#00FF9C]/30" };
  return null;
}

export function Music() {
  const { data: tracks, isLoading, isError } = useQuery<ChartTrack[]>({
    queryKey: ["/api/tracks", "rankingScore", 100, "audio"],
    queryFn: async () => {
      const res = await fetch("/api/tracks?sortBy=rankingScore&limit=100&trackType=audio");
      if (!res.ok) throw new Error("Failed to fetch chart");
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
          <MusicIcon className="w-5 h-5 text-primary" />
          <h1
            className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary"
            data-testid="text-chart-label"
          >
            Music Chart
          </h1>
        </div>
        <h2
          className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green"
          data-testid="text-chart-title"
        >
          NEX TOP 100
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          The definitive ranking of the top 100 tracks on NEX.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-500">Loading Chart…</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <MusicIcon className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm" data-testid="text-chart-error">Failed to Load Chart</p>
          <p className="text-zinc-700 text-[11px] max-w-sm">
            Something went wrong while loading the chart. Please try again later.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map(({ rank, track }) => {
            const zone = getZoneForRank(rank);
            return (
              <div key={track ? track.id : `empty-${rank}`}>
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
                {track ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(rank * 0.02, 1) }}
                    className="flex items-center gap-4 p-4 border border-white/5 rounded-sm bg-black/20 hover:bg-white/3 hover:border-primary/20 transition-all group"
                    data-testid={`row-chart-${track.id}`}
                  >
                    <div className="w-10 text-center">
                      <span className="text-sm font-mono font-bold text-zinc-500">
                        {String(rank).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-sm overflow-hidden bg-black/40 border border-white/5 flex-shrink-0 flex items-center justify-center" data-testid={`img-chart-cover-${track.id}`}>
                      {track.coverImage ? (
                        <img src={track.coverImage} alt={track.title} className="w-full h-full object-cover" />
                      ) : (
                        <MusicIcon className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p
                          className="text-sm font-bold text-white uppercase tracking-wider truncate"
                          data-testid={`text-chart-title-${track.id}`}
                        >
                          {track.title}
                        </p>
                        <div className="relative group/dna shrink-0">
                          <button type="button" aria-label="AI DNA info" className="focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded-sm" data-testid={`icon-dna-${track.id}`}>
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
                        className="text-[10px] font-bold text-primary/70 uppercase tracking-widest truncate"
                        data-testid={`text-chart-creator-${track.id}`}
                      >
                        {track.creatorName}
                      </span>
                      <span className="block text-[7px] text-zinc-700 uppercase tracking-[0.2em]">AI Music Creator</span>
                      {track.winStreak > 0 && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-xs text-[8px] font-bold border border-orange-500/20" data-testid={`text-chart-streak-${track.id}`}>
                          🔥 WIN STREAK: {track.winStreak}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-5 shrink-0">
                      <div className="text-center min-w-[56px]">
                        <p
                          className="text-sm font-bold text-zinc-300"
                          data-testid={`text-chart-plays-${track.id}`}
                        >
                          {(track.playCount ?? 0).toLocaleString()}
                        </p>
                        <p className="text-[8px] uppercase tracking-widest text-zinc-600 mt-0.5">Plays</p>
                      </div>

                      {track.winRate != null && (
                        <div className="text-center min-w-[56px]">
                          <p
                            className="text-lg font-display font-bold text-primary"
                            data-testid={`text-chart-winrate-${track.id}`}
                          >
                            {track.winRate}%
                          </p>
                          <p className="text-[8px] uppercase tracking-widest text-zinc-600 mt-0.5">Win Rate</p>
                        </div>
                      )}

                      <Link href={`/track/${track.id}`}>
                        <button
                          data-testid={`button-chart-listen-${track.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 rounded-sm text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                        >
                          <Headphones className="w-3 h-3" />
                          Listen
                        </button>
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <div
                    className="flex items-center gap-4 p-4 border border-white/5 rounded-sm bg-black/10"
                    data-testid={`row-chart-empty-${rank}`}
                  >
                    <div className="w-10 text-center">
                      <span className="text-sm font-mono font-bold text-zinc-700">
                        {String(rank).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-700 italic">— empty</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
