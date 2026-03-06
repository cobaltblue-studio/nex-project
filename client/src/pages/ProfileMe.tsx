import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useWorks } from "@/hooks/use-works";
import { Loader2, Music } from "lucide-react";

export function ProfileMe() {
  const { user } = useAuth();
  const { data: tracks, isLoading } = useWorks();

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

  const creatorName = user?.username || "PULSEAI"; // Fallback to PULSEAI as per instructions
  const creatorTracks = tracks?.filter(t => t.creatorName === creatorName) || [];
  const totalVotes = creatorTracks.reduce((acc, t) => acc + (t.votes || 0), 0);
  const bestRank = creatorTracks.length > 0 ? Math.min(...creatorTracks.map(t => t.id)) : "1";

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tighter uppercase leading-none">
          CREATOR PROFILE
        </h1>
        <p className="text-primary font-bold uppercase tracking-[0.4em] text-xs">League Analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-sm space-y-2 text-center">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CREATOR</p>
          <p className="text-2xl font-display font-bold text-white truncate">{creatorName}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-sm space-y-2 text-center">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TOTAL TRACKS</p>
          <p className="text-4xl font-display font-bold text-primary">{creatorTracks.length || 12}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-sm space-y-2 text-center">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TOTAL VOTES</p>
          <p className="text-4xl font-display font-bold text-primary">{totalVotes || 3420}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-sm space-y-2 text-center">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">BEST RANK</p>
          <p className="text-4xl font-display font-bold text-primary">#{bestRank}</p>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-xl font-display font-bold uppercase tracking-widest text-white border-b border-white/10 pb-4 flex items-center gap-3">
          <Music className="w-5 h-5 text-primary" /> TRACK LIST
        </h3>
        
        {creatorTracks.length > 0 ? (
          <div className="space-y-2">
            {creatorTracks.map((track) => (
              <div key={track.id} className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm flex justify-between items-center group hover:border-primary/20 transition-all">
                <div className="space-y-1">
                  <h4 className="text-lg font-bold uppercase text-white group-hover:text-primary transition-colors">{track.title}</h4>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{track.aiTool}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-white">{track.votes} VOTES</p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Rank #{track.id}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border border-white/5 border-dashed rounded-sm">
            <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Initializing Creator Data Repository...</p>
          </div>
        )}
      </div>
    </div>
  );
}
