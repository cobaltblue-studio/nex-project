import { motion } from "framer-motion";
import { Profile, Work } from "@shared/schema";
import { Zap, TrendingUp, Layers } from "lucide-react";
import { Link } from "wouter";

interface WorkCardProps {
  work: Work & { creator: Profile };
  index: number;
}

export function WorkCard({ work, index }: WorkCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative"
    >
      <Link href={`/work/${work.id}`}>
        <div className="bg-[#0A0A0A] border border-white/5 rounded-sm overflow-hidden transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-[0_0_30px_rgba(0,240,255,0.1)]">
          {/* Media Placeholder with Type Icon */}
          <div className="aspect-[4/5] bg-zinc-900 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
            
            {/* Minimal Type Indicator */}
            <div className="absolute top-4 left-4 z-20 px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-bold uppercase tracking-widest text-zinc-300">
              {work.workType.replace('_', ' ')}
            </div>

            {/* AI Tool Tag */}
            <div className="absolute top-4 right-4 z-20 px-2 py-1 bg-primary/20 backdrop-blur-md border border-primary/30 text-[9px] font-bold uppercase tracking-widest text-primary">
              {work.aiTool}
            </div>

            <Zap className="w-12 h-12 text-zinc-800 group-hover:text-primary/20 transition-colors duration-500" />
            
            <div className="absolute bottom-6 left-6 right-6 z-20">
              <h3 className="text-lg font-display font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                {work.title}
              </h3>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden">
                  <span className="text-[10px] font-bold text-zinc-400">{work.creator.username[0].toUpperCase()}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white">{work.creator.username}</span>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{work.creator.league}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold uppercase tracking-widest text-primary mb-0.5">Craft Score</div>
                <div className="text-xl font-display font-bold text-white neon-text">{work.totalAiCraftScore}</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[
                { label: 'ENG', val: work.engagementScore },
                { label: 'QUAL', val: work.technicalQualityScore },
                { label: 'DEP', val: work.promptDepthScore },
                { label: 'VEL', val: work.trendVelocityScore }
              ].map(stat => (
                <div key={stat.label} className="bg-white/5 p-2 rounded-xs text-center">
                  <div className="text-[7px] font-bold text-zinc-500 mb-0.5 uppercase">{stat.label}</div>
                  <div className="text-[10px] font-bold text-zinc-300">{stat.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
