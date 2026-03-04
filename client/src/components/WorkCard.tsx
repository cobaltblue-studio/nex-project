import { Link } from "wouter";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { WorkListResponse } from "@shared/routes";

interface WorkCardProps {
  work: WorkListResponse[0];
  index?: number;
}

export function WorkCard({ work, index = 0 }: WorkCardProps) {
  return (
    <Link href={`/work/${work.id}`} className="block group">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        className="glass-card rounded-2xl p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:neon-border flex flex-col h-full"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold tracking-widest text-primary/80 uppercase px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5">
                {work.workType.replace('_', ' ')}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {work.aiTool} • {work.modelVersion}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground font-display tracking-wide line-clamp-2 group-hover:text-primary transition-colors">
              {work.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 font-sans line-clamp-2 opacity-80">
              {work.prompt}
            </p>
          </div>
          
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-background/50 border border-white/5 min-w-[80px]">
            <span className="text-xs text-muted-foreground uppercase font-bold mb-1">Score</span>
            <span className={clsx(
              "text-3xl font-display font-bold",
              work.totalAiCraftScore >= 80 ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" :
              work.totalAiCraftScore >= 60 ? "text-primary drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]" :
              "text-foreground"
            )}>
              {work.totalAiCraftScore}
            </span>
          </div>
        </div>
        
        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">{work.creator.username.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-sm font-medium text-foreground/80 hover:text-white transition-colors">
              {work.creator.username}
            </span>
          </div>
          
          <div className="flex items-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-mono">Q: {work.technicalQualityScore}</span>
            <span className="text-xs font-mono">P: {work.promptDepthScore}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
