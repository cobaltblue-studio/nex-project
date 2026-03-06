import { motion } from "framer-motion";
import type { Profile, Track } from "@shared/schema";
import { Play } from "lucide-react";
import { Link } from "wouter";

interface MusicRowProps {
  track: any;
  rank: number;
}

export function MusicRow({ track, rank }: MusicRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.02 }}
      className="group flex items-center gap-4 p-3 hover:bg-white/5 rounded-sm transition-all border-b border-white/5 last:border-0"
    >
      <div className="w-16 text-[10px] font-mono text-zinc-600 font-bold uppercase tracking-tighter">
        NEX #{String(rank).padStart(3, "0")}
      </div>

      <div className="flex-1 min-w-0">
        <Link href={`/track/${track.id}`}>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider truncate cursor-pointer hover:text-primary transition-colors">
            {track.title}
          </h3>
        </Link>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
          <span className="text-primary/70">
            {track.creatorName || "NEO CREATOR"}
          </span>
          <span className="px-1.5 py-0.5 bg-white/5 rounded-xs text-[8px] border border-white/10">
            {track.aiTool}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right min-w-[60px]">
          <p className="text-[10px] font-display font-bold text-white neon-text">
            {track.votes} VOTES
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/track/${track.id}`}>
            <button className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-sm hover:bg-primary hover:text-black hover:border-primary transition-all">
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
