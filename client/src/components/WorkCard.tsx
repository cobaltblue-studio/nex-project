import { motion } from "framer-motion";
import type { Profile, Track } from "@shared/schema";
import { Play, Youtube, Dna } from "lucide-react";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkCardProps {
  work: Track & { creator: Profile };
  index: number;
}

export function WorkCard({ work, index }: WorkCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group"
    >
      <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-sm flex items-center justify-between hover:border-primary/40 transition-all gap-6">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div className="w-12 h-12 bg-zinc-900 rounded-sm flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors relative">
            <Play className="w-5 h-5 text-zinc-700 group-hover:text-primary group-hover:scale-110 transition-all" />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1 py-0.5 bg-black/70 border border-primary/20 rounded-sm text-[7px] font-bold uppercase tracking-wider text-primary/80 cursor-default backdrop-blur-sm" data-testid={`badge-ai-dna-${work.id}`}>
                  <Dna className="w-2.5 h-2.5" />
                  AI DNA
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px] font-mono">
                [PROMPT: SYNTH_WAVE_1988] [MODEL: SUNO_V4]
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider truncate mb-1">
              {work.title}
            </h3>
            <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest">
              <span className="text-primary">NEX #{work.creator.nexNumber || '??'}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500">{work.aiTool}</span>
              {work.winStreak > 0 && (
                <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-xs text-[8px] border border-orange-500/20" data-testid={`text-streak-${work.id}`}>
                  🔥 WIN STREAK: {work.winStreak}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-0.5">NEX Score</p>
            <p className="text-lg font-display font-bold text-white neon-text">{work.neoScore.toFixed(1)}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/track/${work.id}`}>
              <button className="px-4 py-2 bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary transition-all">
                Play
              </button>
            </Link>
            {work.mvUrl && (
              <a href={work.mvUrl} target="_blank" rel="noopener noreferrer">
                <button className="px-4 py-2 border border-red-500/30 text-red-500 text-[9px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
                  <Youtube className="w-3 h-3" />
                  Watch MV
                </button>
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
