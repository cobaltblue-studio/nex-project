import { motion } from "framer-motion";
import { useWorks } from "@/hooks/use-works";
import { MusicRow } from "@/components/MusicRow";
import { Radio, Swords, Zap, Music2, Users, TrendingUp, BarChart3, Shield, Target, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: "easeOut" },
};

const grainySvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`;

export function Home() {
  const { data: tracks, isLoading } = useWorks();
  const [, setLocation] = useLocation();

  const { data: recentBattle } = useQuery<any>({
    queryKey: ["/api/battles/recent"],
  });

  const { data: todayStats } = useQuery<any>({
    queryKey: ["/api/stats/today"],
  });

  const trending = (tracks || [])
    .slice()
    .sort((a: any, b: any) => (b.rankingScore || 0) - (a.rankingScore || 0))
    .slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-40 pb-40">

      <section
        className="relative py-36 text-center space-y-10 overflow-hidden"
        data-testid="section-hero"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, #050505 0%, #0A0A0A 50%, #050505 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{ backgroundImage: grainySvg, backgroundRepeat: "repeat", backgroundSize: "256px 256px" }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, hsla(189,100%,50%,0.06) 0%, transparent 100%)" }} />

        <motion.div {...fadeUp} className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-primary/70 mb-6">
            The Future of AI Music
          </p>
          <h1 className="text-7xl md:text-9xl font-display font-black text-white leading-none neon-text-strong">
            NEX
          </h1>
          <p className="text-primary font-bold tracking-[0.4em] text-sm uppercase mt-6">
            AI Music Ranking Platform
          </p>
          <p className="text-zinc-400 text-base md:text-lg max-w-2xl mx-auto mt-8 leading-relaxed normal-case font-light">
            The world's first competitive ranking platform for AI-generated music.
            Artists submit, battle, and rise through a transparent chart system
            powered by community voting.
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="relative z-10">
          <div className="flex flex-wrap justify-center gap-5 pt-6">
            <button
              onClick={() => setLocation("/battle")}
              data-testid="button-start-battle"
              className="px-10 py-4 glass-button text-primary font-bold text-sm uppercase tracking-widest transition-premium rounded-xl"
            >
              Start Battle
            </button>
            <button
              onClick={() => setLocation("/submit")}
              data-testid="button-submit-track"
              className="px-10 py-4 glass-button-outline text-white text-sm uppercase tracking-widest transition-premium rounded-xl hover:text-primary"
            >
              Submit Track
            </button>
            <button
              onClick={() => setLocation("/radio")}
              data-testid="button-radio"
              className="px-10 py-4 glass-button-outline text-white flex items-center gap-2 text-sm uppercase tracking-widest transition-premium rounded-xl hover:text-primary"
            >
              <Radio size={16} />
              Radio
            </button>
          </div>
        </motion.div>

        {todayStats && (
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} className="relative z-10">
            <div className="flex flex-wrap justify-center gap-10 pt-8">
              <div className="text-center" data-testid="stat-hero-battles">
                <p className="text-3xl font-display font-bold text-white">{todayStats.battlesPlayedToday ?? 0}</p>
                <p className="text-[8px] uppercase tracking-[0.3em] text-zinc-600 mt-1.5">Battles Today</p>
              </div>
              <div className="text-center" data-testid="stat-hero-votes">
                <p className="text-3xl font-display font-bold text-white">{todayStats.totalVotesToday ?? 0}</p>
                <p className="text-[8px] uppercase tracking-[0.3em] text-zinc-600 mt-1.5">Votes Cast</p>
              </div>
              <div className="text-center" data-testid="stat-hero-pool">
                <p className="text-3xl font-display font-bold text-white">{todayStats.tracksInPool ?? 0}</p>
                <p className="text-[8px] uppercase tracking-[0.3em] text-zinc-600 mt-1.5">Tracks in Pool</p>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      <motion.section className="max-w-4xl mx-auto px-6" data-testid="section-platform-concept" {...fadeUp}>
        <div className="text-center space-y-5 mb-16">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">What is NEX</p>
          <h2 className="text-3xl md:text-5xl font-display text-white uppercase tracking-tight font-bold">
            The Billboard for AI Music
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto normal-case font-light">
            AI-generated music is a rapidly growing creative category with no definitive ranking
            authority. NEX fills that gap — a transparent, community-driven chart that establishes
            credibility and discoverability for AI music creators worldwide.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="premium-card p-8 space-y-4 transition-premium" data-testid="card-concept-credibility">
            <Shield className="w-7 h-7 text-primary" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Credibility</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              Rankings are determined by battle wins, community votes, and play counts — not
              marketing spend. Every position is earned through performance.
            </p>
          </div>
          <div className="premium-card p-8 space-y-4 transition-premium" data-testid="card-concept-discovery">
            <Target className="w-7 h-7 text-primary" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Discovery</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              The battle system surfaces quality tracks regardless of follower count. New creators
              compete on equal footing with established ones.
            </p>
          </div>
          <div className="premium-card p-8 space-y-4 transition-premium" data-testid="card-concept-transparency">
            <BarChart3 className="w-7 h-7 text-primary" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Transparency</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              Every ranking factor is visible. Listeners see battle records, win rates, play counts,
              and vote totals — no hidden algorithms.
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section className="max-w-4xl mx-auto px-6" data-testid="section-battle-system" {...fadeUp}>
        <div className="text-center space-y-5 mb-16">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">The Engine</p>
          <h2 className="text-3xl md:text-5xl font-display text-white uppercase tracking-tight font-bold">
            Battle-Driven Rankings
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto normal-case font-light">
            Two tracks enter. One wins. The battle engine is the core mechanism that
            drives all chart movement on NEX.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div className="premium-card p-7 space-y-4 transition-premium">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-lg font-display font-bold mx-auto">1</div>
            <p className="text-[10px] font-bold text-white uppercase tracking-widest">Submit</p>
            <p className="text-[9px] text-zinc-600 normal-case leading-relaxed">
              Creator uploads an AI-generated track with a YouTube or SoundCloud link
            </p>
          </div>
          <div className="premium-card p-7 space-y-4 transition-premium">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-lg font-display font-bold mx-auto">2</div>
            <p className="text-[10px] font-bold text-white uppercase tracking-widest">Battle</p>
            <p className="text-[9px] text-zinc-600 normal-case leading-relaxed">
              Track enters the battle pool and faces head-to-head matchups against other tracks
            </p>
          </div>
          <div className="premium-card p-7 space-y-4 transition-premium">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-lg font-display font-bold mx-auto">3</div>
            <p className="text-[10px] font-bold text-white uppercase tracking-widest">Rise</p>
            <p className="text-[9px] text-zinc-600 normal-case leading-relaxed">
              Tracks with strong win rates enter the Rising category — proving themselves
            </p>
          </div>
          <div className="premium-card p-7 space-y-4 transition-premium">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-lg font-display font-bold mx-auto">4</div>
            <p className="text-[10px] font-bold text-white uppercase tracking-widest">Chart</p>
            <p className="text-[9px] text-zinc-600 normal-case leading-relaxed">
              Top performers earn a spot in the official NEX Top 100 chart
            </p>
          </div>
        </div>

        {recentBattle ? (
          <div className="premium-card p-10 mt-12" data-testid="section-live-battle-arena">
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 text-center mb-8">
              Live Battle
            </p>
            <div className="flex items-center justify-center gap-8">
              <div className="flex-1 text-right">
                <p className="text-sm font-bold text-white uppercase tracking-wider truncate" data-testid="text-battle-arena-track-a">
                  {recentBattle.trackA?.title || "Track A"}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  {recentBattle.trackA?.creatorName || "Creator"}
                </p>
              </div>
              <div className="shrink-0">
                <span className="text-3xl font-display font-black italic text-primary neon-text" data-testid="text-battle-vs">VS</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white uppercase tracking-wider truncate" data-testid="text-battle-arena-track-b">
                  {recentBattle.trackB?.title || "Track B"}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  {recentBattle.trackB?.creatorName || "Creator"}
                </p>
              </div>
            </div>
            <div className="text-center mt-8">
              <button
                onClick={() => setLocation("/battle")}
                data-testid="button-vote-now"
                className="px-10 py-4 glass-button text-primary font-bold text-sm uppercase tracking-widest transition-premium rounded-xl"
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Vote Now
              </button>
            </div>
          </div>
        ) : (
          <div className="premium-card border-dashed p-10 text-center mt-12" data-testid="section-live-battle-arena">
            <p className="text-zinc-500 text-sm mb-6">No active battles right now</p>
            <button
              onClick={() => setLocation("/battle")}
              data-testid="button-start-first-battle"
              className="px-8 py-4 glass-button text-primary font-bold text-sm uppercase tracking-widest transition-premium rounded-xl"
            >
              Start a Battle
            </button>
          </div>
        )}
      </motion.section>

      <motion.section className="max-w-4xl mx-auto px-6" data-testid="section-creator-ecosystem" {...fadeUp}>
        <div className="text-center space-y-5 mb-16">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">For Creators</p>
          <h2 className="text-3xl md:text-5xl font-display text-white uppercase tracking-tight font-bold">
            Creator Ecosystem
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto normal-case font-light">
            NEX gives AI music creators a stage, an audience, and a verifiable track record.
            Every battle win, every chart position is publicly recorded.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="premium-card p-8 space-y-5 transition-premium">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Meritocratic Ranking</h3>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              No pay-to-play. No follower gates. Your track's chart position is determined
              purely by battle performance, votes, and plays. A brand-new creator can reach
              #1 on talent alone.
            </p>
          </div>
          <div className="premium-card p-8 space-y-5 transition-premium">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Built-in Audience</h3>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              Every battle exposes your track to new listeners. The Radio feature provides
              continuous play for chart-eligible tracks, growing your audience without
              external marketing.
            </p>
          </div>
          <div className="premium-card p-8 space-y-5 transition-premium">
            <div className="flex items-center gap-3">
              <Music2 className="w-6 h-6 text-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Creator Profiles</h3>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              Each creator gets a public profile showing their tracks, battle stats,
              chart history, and follower count — a verifiable portfolio of AI music
              achievement.
            </p>
          </div>
          <div className="premium-card p-8 space-y-5 transition-premium">
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Win Streaks</h3>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              Tracks on winning streaks get highlighted across the platform, driving
              more plays and visibility. Momentum rewards consistency and quality.
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section className="max-w-4xl mx-auto px-6" data-testid="section-trending-today" {...fadeUp}>
        <div className="text-center space-y-3 mb-12">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">Live Rankings</p>
          <h2 className="text-3xl md:text-4xl font-display text-white uppercase tracking-tight font-bold">
            Trending Today
          </h2>
          <p className="text-zinc-500 text-xs uppercase tracking-[0.3em]">
            Ranked by battle wins, plays & votes
          </p>
        </div>

        <div className="space-y-3">
          {!isLoading &&
            trending.map((track: any, idx: number) => (
              <MusicRow key={track.id} track={track} rank={idx + 1} />
            ))}
        </div>

        {trending.length > 0 && (
          <div className="text-center mt-10">
            <button
              onClick={() => setLocation("/music")}
              data-testid="button-view-full-chart"
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-premium glass-button-outline px-8 py-3 rounded-xl"
            >
              View Full Chart <ArrowRight className="w-3 h-3 inline ml-1" />
            </button>
          </div>
        )}
      </motion.section>

      <motion.section className="text-center space-y-10 pt-12 px-6" data-testid="section-cta" {...fadeUp}>
        <div className="space-y-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">Join NEX</p>
          <h2 className="text-3xl md:text-5xl font-display text-white uppercase tracking-tight font-bold">
            Shape the Future of AI Music
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed normal-case font-light">
            Whether you're a creator, listener, or investor — NEX is the platform where
            AI music finds its audience and proves its value.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-5">
          <button
            onClick={() => setLocation("/submit")}
            data-testid="button-submit-your-track"
            className="px-10 py-5 glass-button text-primary font-bold text-sm uppercase tracking-widest transition-premium rounded-xl"
          >
            Submit Your Track
          </button>
          <button
            onClick={() => setLocation("/battle")}
            data-testid="button-cta-battle"
            className="px-10 py-5 glass-button text-primary font-bold text-sm uppercase tracking-widest transition-premium rounded-xl"
            style={{ borderColor: "hsla(282, 100%, 50%, 0.3)", background: "hsla(282, 100%, 50%, 0.08)" }}
          >
            Enter Battle Arena
          </button>
          <button
            onClick={() => setLocation("/about")}
            data-testid="button-learn-how-nex-works"
            className="px-10 py-5 glass-button-outline text-white font-bold text-sm uppercase tracking-widest transition-premium rounded-xl hover:text-primary"
          >
            Learn More
          </button>
        </div>
      </motion.section>

    </motion.div>
  );
}
