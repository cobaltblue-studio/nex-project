import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useWork } from "@/hooks/use-works";
import { Loader2, ArrowLeft, Share2, Sparkles } from "lucide-react";

export function WorkDetail() {
  const [, params] = useRoute("/work/:id");
  const { data: work, isLoading } = useWork(params?.id || "");

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  if (!work) return <div className="p-20 text-center font-display text-2xl uppercase">Work Core Not Found</div>;

  const metrics = [
    { label: "Engagement", value: work.engagementScore, weight: "30%" },
    { label: "Technical Quality", value: work.technicalQualityScore, weight: "30%" },
    { label: "Prompt Depth", value: work.promptDepthScore, weight: "20%" },
    { label: "Trend Velocity", value: work.trendVelocityScore, weight: "20%" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-bold uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4" /> Back to Board
      </Link>

      <div className="glass-card rounded-3xl p-8 md:p-12 relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
        
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-12">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold tracking-widest text-primary/80 uppercase px-3 py-1 rounded-full border border-primary/20 bg-primary/5">
                {work.workType.replace('_', ' ')}
              </span>
              <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {work.aiTool} • {work.modelVersion}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white uppercase tracking-wide leading-tight mb-4">
              {work.title}
            </h1>
            
            <Link href={`/profile/${work.creatorId}`} className="inline-flex items-center gap-3 hover:bg-white/5 p-2 pr-4 rounded-full transition-colors border border-transparent hover:border-white/10">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-primary font-bold">
                {work.creator.username[0].toUpperCase()}
              </div>
              <span className="font-bold text-foreground">{work.creator.username}</span>
            </Link>
          </div>
          
          <div className="flex flex-col items-center justify-center md:min-w-[160px] p-6 rounded-2xl bg-background border border-primary/20 neon-border shadow-[0_0_30px_rgba(0,240,255,0.1)]">
            <span className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Craft Score</span>
            <span className="text-7xl font-display font-bold neon-text text-white leading-none">
              {work.totalAiCraftScore}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-white/10 pb-2">Generation Prompt</h3>
            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 font-mono text-sm leading-relaxed text-foreground/80 h-[200px] overflow-y-auto">
              {work.prompt}
            </div>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b border-white/10 pb-2">Score Breakdown</h3>
            <div className="space-y-5">
              {metrics.map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold uppercase tracking-wider text-foreground/90">{m.label} <span className="text-muted-foreground font-normal ml-1">({m.weight})</span></span>
                    <span className="font-mono text-primary">{m.value}/100</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${m.value}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-primary shadow-[0_0_10px_rgba(0,240,255,0.8)] rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
