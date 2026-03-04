import { motion } from "framer-motion";
import { Shield, Zap, Flame, Crown, ArrowRight } from "lucide-react";

export function Join() {
  const leagues = [
    {
      name: "Spark",
      score: "Avg ≥ 65",
      req: "3+ Works",
      icon: Zap,
      color: "text-zinc-400",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/30",
    },
    {
      name: "Core",
      score: "Avg ≥ 75",
      req: "1 Top 50 Entry",
      icon: Shield,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30",
      glow: "shadow-[0_0_15px_rgba(34,211,238,0.2)]",
    },
    {
      name: "Ascendant",
      score: "Avg ≥ 85",
      req: "2 Top 20 Entries",
      icon: Flame,
      color: "text-fuchsia-400",
      bg: "bg-fuchsia-500/10",
      border: "border-fuchsia-500/40",
      glow: "shadow-[0_0_20px_rgba(192,38,211,0.3)]",
    },
    {
      name: "Sovereign",
      score: "Legendary",
      req: "Committee Approval",
      icon: Crown,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/50",
      glow: "shadow-[0_0_30px_rgba(251,191,36,0.4)]",
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-12 py-8"
    >
      <div className="text-center space-y-6">
        <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tight">
          THE <span className="neon-text text-primary">NEX</span> LEAGUE
        </h1>
        <p className="text-xl text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
          Ranked by <strong className="text-white">Craft</strong>, not by views. Join the definitive authority infrastructure for AI creators.
        </p>
        
        <a 
          href="/api/login"
          className="inline-flex items-center gap-3 bg-primary text-black font-bold uppercase tracking-widest px-8 py-4 rounded-xl hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(0,240,255,0.4)]"
        >
          Connect Account <ArrowRight className="w-5 h-5" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
        {leagues.map((league, idx) => (
          <motion.div
            key={league.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            className={`p-8 rounded-3xl border backdrop-blur-md transition-all hover:-translate-y-2 ${league.bg} ${league.border} ${league.glow || ''}`}
          >
            <league.icon className={`w-12 h-12 mb-6 ${league.color}`} />
            <h3 className={`text-3xl font-display font-bold uppercase tracking-widest mb-2 ${league.color}`}>
              {league.name}
            </h3>
            <div className="space-y-2 font-mono text-sm text-foreground/80">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="opacity-60">Score Requirement</span>
                <span className="font-bold">{league.score}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="opacity-60">Milestone</span>
                <span className="font-bold text-right">{league.req}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
