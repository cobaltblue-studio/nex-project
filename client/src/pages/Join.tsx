import { motion } from "framer-motion";
import { Shield, Zap, Flame, Crown, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { buildApiUrl } from "@/lib/apiOrigin";

export function Join() {
  const leagues = [
    {
      name: "Spark",
      score: "Avg ≥ 65",
      req: "3+ Works",
      icon: Zap,
      color: "text-zinc-400",
      bg: "bg-zinc-500/5",
      border: "border-zinc-500/20",
    },
    {
      name: "Core",
      score: "Avg ≥ 75",
      req: "1 Top 50 Entry",
      icon: Shield,
      color: "text-cyan-400",
      bg: "bg-cyan-500/5",
      border: "border-cyan-500/20",
      glow: "shadow-[0_0_15px_rgba(34,211,238,0.1)]",
    },
    {
      name: "Ascendant",
      score: "Avg ≥ 85",
      req: "2 Top 20 Entries",
      icon: Flame,
      color: "text-fuchsia-400",
      bg: "bg-fuchsia-500/5",
      border: "border-fuchsia-500/20",
      glow: "shadow-[0_0_20px_rgba(192,38,211,0.15)]",
    },
    {
      name: "Sovereign",
      score: "Legendary",
      req: "Committee Approval",
      icon: Crown,
      color: "text-amber-400",
      bg: "bg-amber-500/5",
      border: "border-amber-500/20",
      glow: "shadow-[0_0_30px_rgba(251,191,36,0.2)]",
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-16 pb-12"
    >
      <section className="text-center space-y-8 pt-8">
        <div className="inline-block px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
          Authority Ranking Layer
        </div>
        <h1 className="text-5xl md:text-8xl font-display font-bold text-white tracking-tighter leading-[0.9] neon-text-green">
          THE <span className="text-primary neon-text">NEX</span><br />LEAGUE
        </h1>
        <p className="text-zinc-400 font-sans max-w-xl mx-auto text-base md:text-lg leading-relaxed">
          NEX prioritizes <strong className="text-white">Craft Quality</strong> over viral metrics. Our proprietary AI Score Engine validates every prompt and output.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href={buildApiUrl("/api/auth/login")}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-primary text-black font-bold uppercase tracking-widest px-10 py-4 rounded-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]"
          >
            Connect Account <ArrowRight className="w-4 h-4" />
          </a>
          <Link href="/board" className="w-full sm:w-auto text-zinc-400 hover:text-white font-bold uppercase tracking-widest text-sm px-8 py-4 transition-colors">
            View Leaderboard
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {leagues.map((league, idx) => (
          <motion.div
            key={league.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-10 rounded-sm border transition-all group hover:border-white/20 ${league.bg} ${league.border} ${league.glow || ''}`}
          >
            <div className="flex items-start justify-between mb-8">
              <league.icon className={`w-10 h-10 ${league.color}`} />
              <div className="text-[10px] font-bold uppercase tracking-widest opacity-40">Tier 0{idx + 1}</div>
            </div>
            <h3 className={`text-4xl font-display font-bold uppercase tracking-tighter mb-6 ${league.color}`}>
              {league.name}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-4">
                <span className="text-zinc-500 uppercase tracking-widest">AI Craft Score</span>
                <span className="font-bold text-white">{league.score}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase tracking-widest">Requirement</span>
                <span className="font-bold text-white">{league.req}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="bg-white/5 border border-white/10 p-12 rounded-sm text-center space-y-6">
        <h2 className="text-2xl font-display font-bold uppercase tracking-widest text-white neon-text-green">Verified Authority</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            "Prompt Authentication",
            "Model Verification",
            "Proof of Creation"
          ].map(text => (
            <div key={text} className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{text}</span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
