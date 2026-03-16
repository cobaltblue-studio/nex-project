import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Loader2, User, Music, Trophy, Headphones } from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";

interface TrackData {
  id: number;
  title: string;
  creatorName: string;
  playCount: number;
  rankingScore: number;
  winRate?: number;
  totalBattles?: number;
  wins?: number;
}

interface CreatorStats {
  name: string;
  totalTracks: number;
  totalPlays: number;
  featuredTrack: string;
  avgWinRate: number;
  initials: string;
}

export function CreatorList() {
  const { data: tracks, isLoading } = useQuery<TrackData[]>({
    queryKey: ["/api/tracks", "rankingScore", "all-creators"],
    queryFn: async () => {
      const res = await fetch("/api/tracks?sortBy=rankingScore");
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json();
    },
  });

  const creators = useMemo(() => {
    if (!tracks) return [];
    const creatorMap = new Map<string, CreatorStats>();

    const sorted = [...tracks].sort((a, b) => b.rankingScore - a.rankingScore);

    sorted.forEach((track) => {
      const name = track.creatorName || "NEX CREATOR";
      const existing = creatorMap.get(name);

      if (!existing) {
        const words = name.split(/\s+/);
        const initials = words.length >= 2
          ? (words[0][0] + words[1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase();

        creatorMap.set(name, {
          name,
          totalTracks: 1,
          totalPlays: track.playCount || 0,
          featuredTrack: track.title,
          avgWinRate: track.winRate ?? 0,
          initials,
        });
      } else {
        existing.totalTracks += 1;
        existing.totalPlays += track.playCount || 0;
        const totalBattleTracks = existing.totalTracks;
        existing.avgWinRate = existing.avgWinRate + ((track.winRate ?? 0) - existing.avgWinRate) / totalBattleTracks;
      }
    });

    return Array.from(creatorMap.values()).sort((a, b) => b.totalPlays - a.totalPlays);
  }, [tracks]);

  if (isLoading) {
    return (
      <div className="p-20 flex justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <h1
          className="text-5xl md:text-6xl font-display font-bold text-white tracking-tighter uppercase leading-none"
          data-testid="text-creators-title"
        >
          NEX CREATORS
        </h1>
        <p className="text-primary font-bold uppercase tracking-[0.4em] text-xs">
          Top AI Music Creators on NEX
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creators.map((creator, idx) => (
          <Link key={idx} href={`/profile/${creator.name.toLowerCase()}`}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm hover:border-primary/40 transition-all cursor-pointer group"
              data-testid={`card-creator-${idx}`}
            >
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary/20 transition-all shrink-0">
                  <span className="text-lg font-display font-bold" data-testid={`text-creator-initials-${idx}`}>
                    {creator.initials}
                  </span>
                </div>
                <div className="space-y-3 min-w-0 flex-1">
                  <h3
                    className="text-lg font-display font-bold text-white uppercase truncate group-hover:text-primary transition-colors"
                    data-testid={`text-creator-name-${idx}`}
                  >
                    {creator.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase tracking-widest">
                    <Music className="w-3 h-3 text-primary/50" />
                    <span className="truncate" data-testid={`text-creator-featured-${idx}`}>
                      {creator.featuredTrack}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
                    <div className="text-center">
                      <p className="text-sm font-bold text-white" data-testid={`text-creator-tracks-${idx}`}>
                        {creator.totalTracks}
                      </p>
                      <p className="text-[8px] text-zinc-600 uppercase tracking-widest">Tracks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white flex items-center justify-center gap-1" data-testid={`text-creator-plays-${idx}`}>
                        <Headphones className="w-3 h-3 text-zinc-500" />
                        {creator.totalPlays.toLocaleString()}
                      </p>
                      <p className="text-[8px] text-zinc-600 uppercase tracking-widest">Plays</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-primary flex items-center justify-center gap-1" data-testid={`text-creator-winrate-${idx}`}>
                        <Trophy className="w-3 h-3 text-primary/50" />
                        {Math.round(creator.avgWinRate)}%
                      </p>
                      <p className="text-[8px] text-zinc-600 uppercase tracking-widest">Win Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
