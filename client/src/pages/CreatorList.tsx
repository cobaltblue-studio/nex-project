import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Loader2, User, Music, Trophy, Headphones, MapPin } from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";

interface TrackData {
  id: number;
  title: string;
  creatorName: string;
  creatorId: number;
  playCount: number;
  rankingScore: number;
  winRate?: number;
  totalBattles?: number;
  wins?: number;
}

interface ProfileData {
  id: number;
  username: string;
  country?: string | null;
}

interface CreatorStats {
  name: string;
  totalTracks: number;
  totalPlays: number;
  featuredTrack: string;
  avgWinRate: number;
  initials: string;
  country?: string | null;
}

const NexWatermark = () => (
  <svg viewBox="0 0 80 30" className="w-16 h-6 opacity-[0.04]" fill="currentColor">
    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="24" fontWeight="900" fontFamily="Montserrat, sans-serif" letterSpacing="2">
      NEX
    </text>
  </svg>
);

export function CreatorList() {
  const { data: tracks, isLoading } = useQuery<TrackData[]>({
    queryKey: ["/api/tracks", "rankingScore", "all-creators"],
    queryFn: async () => {
      const res = await fetch("/api/tracks?sortBy=rankingScore");
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json();
    },
  });

  const creatorIds = useMemo(() => {
    if (!tracks) return [];
    const ids = new Set<number>();
    tracks.forEach((t) => { if (t.creatorId) ids.add(t.creatorId); });
    return Array.from(ids);
  }, [tracks]);

  const { data: profilesData } = useQuery<ProfileData[]>({
    queryKey: ["/api/profiles/bulk", creatorIds],
    queryFn: async () => {
      const results: ProfileData[] = [];
      for (const id of creatorIds) {
        try {
          const res = await fetch(`/api/profiles/${id}`);
          if (res.ok) {
            const data = await res.json();
            results.push(data);
          }
        } catch {}
      }
      return results;
    },
    enabled: creatorIds.length > 0,
  });

  const profileByIdMap = useMemo(() => {
    const map = new Map<number, ProfileData>();
    if (profilesData) {
      profilesData.forEach((p) => map.set(p.id, p));
    }
    return map;
  }, [profilesData]);

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

        const profile = profileByIdMap.get(track.creatorId);

        creatorMap.set(name, {
          name,
          totalTracks: 1,
          totalPlays: track.playCount || 0,
          featuredTrack: track.title,
          avgWinRate: track.winRate ?? 0,
          initials,
          country: profile?.country || null,
        });
      } else {
        existing.totalTracks += 1;
        existing.totalPlays += track.playCount || 0;
        const totalBattleTracks = existing.totalTracks;
        existing.avgWinRate = existing.avgWinRate + ((track.winRate ?? 0) - existing.avgWinRate) / totalBattleTracks;
      }
    });

    return Array.from(creatorMap.values()).sort((a, b) => b.totalPlays - a.totalPlays);
  }, [tracks, profileByIdMap]);

  if (isLoading) {
    return (
      <div className="p-20 flex justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-24">
      <div className="text-center space-y-5">
        <h1
          className="text-3xl md:text-7xl font-display font-black text-white tracking-tight uppercase leading-none neon-text-strong neon-text-green"
          data-testid="text-creators-title"
        >
          NEX CREATORS
        </h1>
        <p className="text-primary font-bold uppercase tracking-[0.4em] text-xs">
          Top AI Music Creators on NEX
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-5" style={{ gridAutoRows: "minmax(120px, auto)" }}>
        {Array.from({ length: 20 }).map((_, idx) => {
          const creator = creators[idx];

          if (creator) {
            const isFeatured = idx < 2;
            return (
              <Link key={idx} href={`/profile/${creator.name.toLowerCase()}`} className={isFeatured ? "col-span-1 row-span-1 md:col-span-2 md:row-span-2" : "col-span-1"}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="premium-card p-8 cursor-pointer group h-full"
                  style={{ backdropFilter: "blur(12px)", border: isFeatured ? "1px solid rgba(0, 255, 128, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)", transition: "transform 0.3s ease-in-out", boxShadow: isFeatured ? "0 0 10px rgba(0, 255, 128, 0.3)" : "none" }}
                  whileHover={{ scale: 1.03 }}
                  data-testid={`card-creator-${idx}`}
                >
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary/20 transition-premium shrink-0">
                      <span className="text-lg font-display font-bold" data-testid={`text-creator-initials-${idx}`}>
                        {creator.initials}
                      </span>
                    </div>
                    <div className="space-y-3 min-w-0 flex-1">
                      <div>
                        <h3
                          className="text-lg font-display font-bold text-white uppercase truncate group-hover:text-primary transition-premium"
                          data-testid={`text-creator-name-${idx}`}
                        >
                          {creator.name}
                        </h3>
                        {creator.country && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-zinc-600" />
                            <span
                              className="text-[10px] text-zinc-500 uppercase tracking-widest"
                              data-testid={`text-creator-country-${idx}`}
                            >
                              {creator.country}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase tracking-widest">
                        <Music className="w-3 h-3 text-primary/50" />
                        <span className="truncate" data-testid={`text-creator-featured-${idx}`}>
                          {creator.featuredTrack}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
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
            );
          }

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="premium-card border-dashed !border-white/[0.04] p-8 flex flex-col items-center justify-center gap-4 select-none relative overflow-hidden"
              style={{ transition: "transform 0.3s ease-in-out" }}
              whileHover={{ scale: 1.03 }}
              data-testid={`card-placeholder-${idx}`}
            >
              <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id={`dots-${idx}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#dots-${idx})`} />
              </svg>
              <div className="w-14 h-14 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center relative z-10">
                <NexWatermark />
              </div>
              <span className="text-xs font-display font-bold text-zinc-700 uppercase tracking-widest relative z-10">
                Future Creator
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
