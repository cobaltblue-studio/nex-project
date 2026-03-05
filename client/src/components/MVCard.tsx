import { motion } from "framer-motion";
import type { Profile, Track } from "@shared/schema";
import { Youtube } from "lucide-react";
import { Link } from "wouter";

interface MVCardProps {
  track: Track & { creator: Profile };
  index: number;
}

export function MVCard({ track, index }: MVCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group relative"
    >
      <Link href={`/mv/${track.id}`}>
        <div className="bg-[#0A0A0A] border border-white/5 rounded-sm overflow-hidden transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-[0_0_30px_rgba(0,240,255,0.1)]">
          <div className="aspect-video bg-zinc-900 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
            <Youtube className="w-10 h-10 text-red-600/40 group-hover:text-red-600 group-hover:scale-110 transition-all z-20" />
            
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
                {track.title}
              </h3>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-zinc-500">
                <span className="text-primary/70">{track.creatorName || "NEO CREATOR"}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-display font-bold text-white neon-text">{track.votes} VOTES</p>
            </div>
          </div>
          
          <div className="px-4 pb-4">
            <button className="w-full py-2 border border-red-500 text-red-500 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
              Watch MV
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
