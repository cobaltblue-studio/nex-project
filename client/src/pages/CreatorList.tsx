import { motion } from "framer-motion";
import { useWorks } from "@/hooks/use-works";
import { Loader2, User } from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";

export function CreatorList() {
  const { data: tracks, isLoading } = useWorks();

  const creators = useMemo(() => {
    if (!tracks) return [];
    const creatorMap = new Map();
    
    // Sort tracks globally to determine rank
    const sortedTracks = [...tracks].sort((a, b) => b.votes - a.votes);

    tracks.forEach(track => {
      const name = track.creatorName || "NEX CREATOR";
      const stats = creatorMap.get(name) || {
        name,
        totalTracks: 0,
        totalVotes: 0,
        bestRank: 999
      };
      
      stats.totalTracks += 1;
      stats.totalVotes += (track.votes || 0);
      
      const rank = sortedTracks.findIndex(st => st.id === track.id) + 1;
      if (rank < stats.bestRank) stats.bestRank = rank;
      
      creatorMap.set(name, stats);
    });

    return Array.from(creatorMap.values())
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .map((creator, index) => ({
        ...creator,
        bestRank: index + 1
      }));
  }, [tracks]);

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tighter uppercase leading-none">
          NEX CREATORS
        </h1>
        <p className="text-primary font-bold uppercase tracking-[0.4em] text-xs">Top AI Music Creators on NEX</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creators.map((creator, idx) => (
          <Link key={idx} href={`/profile/${creator.name.toLowerCase()}`}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[#0A0A0A] border border-white/5 p-8 rounded-sm hover:border-primary/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary/20 transition-all">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xl font-display font-bold text-white uppercase truncate group-hover:text-primary transition-colors">
                    {creator.name}
                  </h3>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest space-y-1">
                    <p>Tracks: <span className="text-white">{creator.totalTracks}</span></p>
                    <p>Votes: <span className="text-white">{creator.totalVotes}</span></p>
                    <p>Rank: <span className="text-primary">#{creator.bestRank}</span></p>
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
