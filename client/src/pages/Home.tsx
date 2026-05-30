import { motion } from "framer-motion";
import { useWorks } from "@/hooks/use-works";
import { MusicRow } from "@/components/MusicRow";
import { Radio, Swords, Zap, Music2, Users, TrendingUp, BarChart3, Shield, Target, ArrowRight, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BattleGuide } from "@/components/BattleGuide";
import { useTranslation } from "react-i18next";
import { hasPublicCount } from "@/lib/displayStats";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: "easeOut" },
};

const grainySvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`;

function HeroVisualizer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const layers = [
      { amplitude: 14, frequency: 0.008, speed: 0.012, yOffset: 0.72 },
      { amplitude: 10, frequency: 0.012, speed: 0.018, yOffset: 0.68 },
      { amplitude: 8, frequency: 0.018, speed: 0.024, yOffset: 0.75 },
    ];

    const draw = () => {
      const w = svg.clientWidth || 1200;
      const h = svg.clientHeight || 600;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      timeRef.current += 1;

      layers.forEach((layer, li) => {
        const path = pathRefs.current[li];
        if (!path) return;
        const points: string[] = [];
        const steps = Math.max(80, Math.floor(w / 8));
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * w;
          const y =
            h * layer.yOffset +
            Math.sin(x * layer.frequency + timeRef.current * layer.speed) * layer.amplitude +
            Math.sin(x * layer.frequency * 1.8 + timeRef.current * layer.speed * 0.7) * layer.amplitude * 0.4;
          points.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
        }
        const d = `${points.join(" ")} L${w},${h} L0,${h} Z`;
        path.setAttribute("d", d);
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
      preserveAspectRatio="none"
      data-testid="svg-hero-visualizer"
    >
      <defs>
        <linearGradient id="waveGrad0" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00FF80" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#00FF80" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="waveGrad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00FF80" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#00FF80" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00FF80" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#00FF80" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          ref={(el) => { pathRefs.current[i] = el; }}
          fill={`url(#waveGrad${i})`}
          style={{ filter: "blur(1px)" }}
        />
      ))}
    </svg>
  );
}

function LiveVotingWidget({
  todayStats,
}: {
  todayStats?: {
    totalVotesToday?: number;
    battlesPlayedToday?: number;
    tracksInPool?: number;
    newTracksToday?: number;
  };
}) {
  const { t } = useTranslation();
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setPulse((p) => !p), 1000);
    return () => clearInterval(interval);
  }, []);

  const statVal = (n?: number) => (hasPublicCount(n) ? String(n) : "—");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className="relative z-10 mx-auto mt-5 md:mt-6 w-full max-w-2xl px-4"
      data-testid="widget-live-voting"
    >
      <div
        className="rounded-xl p-5 md:p-6 border border-primary/25 shadow-[0_0_40px_rgba(0,255,128,0.08)]"
        style={{
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-zinc-300">
            {t("home.liveVotingTrends")}
          </span>
          <span className="flex items-center gap-1.5" data-testid="badge-live">
            <span
              className="w-2.5 h-2.5 rounded-full bg-red-500"
              style={{
                opacity: pulse ? 1 : 0.45,
                transition: "opacity 0.3s",
                boxShadow: pulse ? "0 0 8px rgba(255, 0, 0, 0.65)" : "none",
              }}
            />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-red-400">
              {t("home.live")}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="rounded-lg border border-white/10 bg-black/40 py-3 px-2">
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{t("home.votesToday")}</p>
            <p className="text-lg md:text-xl font-display font-bold text-green-400">{statVal(todayStats?.totalVotesToday)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/40 py-3 px-2">
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{t("home.battlesToday")}</p>
            <p className="text-lg md:text-xl font-display font-bold text-white">{statVal(todayStats?.battlesPlayedToday)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/40 py-3 px-2">
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{t("home.poolTracks")}</p>
            <p className="text-lg md:text-xl font-display font-bold text-white">{statVal(todayStats?.tracksInPool)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/40 py-3 px-2">
            <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{t("home.newToday")}</p>
            <p className="text-lg md:text-xl font-display font-bold text-white">{statVal(todayStats?.newTracksToday)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Home() {
  const { t } = useTranslation();
  const { data: tracks, isLoading } = useWorks();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const heroVisualizerRef = useRef<HTMLDivElement>(null);

  const goSubmitTrack = () => {
    if (!isAuthenticated) {
      setLocation(`/auth?returnTo=${encodeURIComponent("/submit-track")}`);
      return;
    }
    setLocation("/submit-track");
  };

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-24 md:space-y-32 pb-24 md:pb-32">

      <div>
      <section
        className="relative text-center overflow-hidden flex flex-col hero-section-responsive"
        style={{ minHeight: "auto", height: "auto", paddingTop: "2rem", paddingBottom: "1.25rem", gap: "0.5rem" }}
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

        <div
          ref={heroVisualizerRef}
          style={{ transform: `translateY(${scrollY * 0.08}px)` }}
          className="absolute inset-0 pointer-events-none opacity-50"
          aria-hidden
        >
          <div className="absolute inset-0" style={{ clipPath: "inset(52% 0 0 0)" }}>
            <HeroVisualizer />
          </div>
        </div>

        <motion.div {...fadeUp} className="relative z-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-primary/70 mb-3">
            {t("home.heroEyebrow")}
          </p>
          <h1
            className="text-[9rem] md:text-[5.625rem] font-display font-black leading-none neon-text-strong neon-text-green"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #c0c0c0 40%, #ffffff 60%, #a0a0a0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 20px rgba(0, 255, 128, 0.8)) drop-shadow(0 0 50px rgba(0, 255, 128, 0.4))",
              display: "inline-block",
            }}
          >
            NEX
          </h1>
          <p className="text-primary font-bold tracking-[0.4em] text-sm uppercase mt-2 md:mt-6">
            {t("home.heroSubtitle")}
          </p>
          <p className="hidden md:block text-zinc-400 text-base md:text-lg max-w-2xl mx-auto mt-8 leading-relaxed normal-case font-light">
            {t("home.heroBody")}
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} className="relative z-10">
          <div className="flex flex-nowrap justify-center gap-3 pt-2 md:pt-6">
            <button
              onClick={() => setLocation("/battle")}
              data-testid="button-start-battle"
              className="px-5 py-2.5 glass-button text-primary font-bold text-xs uppercase tracking-widest transition-premium rounded-xl hover:shadow-[0_0_25px_hsla(189,100%,50%,0.3)]"
              style={{ animation: "cta-breathe 4s ease-in-out infinite" }}
            >
              {t("home.startBattle")}
            </button>
            <button
              onClick={goSubmitTrack}
              data-testid="button-submit-track"
              className="px-5 py-2.5 glass-button-outline text-white text-xs uppercase tracking-widest transition-premium rounded-xl hover:text-primary hover:scale-[1.02] hover:shadow-[0_0_25px_hsla(189,100%,50%,0.3)]"
            >
              {t("home.submitTrack")}
            </button>
            <button
              onClick={() => setLocation("/radio")}
              data-testid="button-radio"
              className="px-5 py-2.5 glass-button-outline text-white flex items-center gap-1.5 text-xs uppercase tracking-widest transition-premium rounded-xl hover:text-primary hover:scale-[1.02] hover:shadow-[0_0_25px_hsla(189,100%,50%,0.3)]"
            >
              <Radio size={13} />
              {t("home.radio")}
            </button>
          </div>
        </motion.div>

        <LiveVotingWidget todayStats={todayStats} />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="relative z-10 flex flex-col items-center justify-center w-full hero-bottom-row mt-3 pb-1"
          data-testid="scroll-guide"
        >
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center justify-center gap-2"
          >
            <span
              className="text-[10px] font-black uppercase tracking-[0.45em] text-primary/70"
              style={{ textShadow: "0 0 10px hsla(189,100%,50%,0.25)" }}
            >
              {t("home.discoverMore")}
            </span>
            <ChevronDown className="w-5 h-5 text-primary/80" />
          </motion.div>
        </motion.div>
      </section>

      <BattleGuide />
      </div>

      <motion.section className="max-w-4xl mx-auto px-6" data-testid="section-platform-concept" {...fadeUp}>
        <div className="text-center space-y-5 mb-16">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">{t("home.whatIsNexEyebrow")}</p>
          <h2 className="text-xl md:text-5xl font-display text-white uppercase tracking-tight font-bold neon-text-strong neon-text-green">
            {t("home.billboardTitle")}
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto normal-case font-light">
            {t("home.billboardBody")}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="premium-card p-8 space-y-4 transition-premium" data-testid="card-concept-credibility">
            <Shield className="w-7 h-7 text-primary" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t("home.credibilityTitle")}</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              {t("home.credibilityBody")}
            </p>
          </div>
          <div className="premium-card p-8 space-y-4 transition-premium" data-testid="card-concept-discovery">
            <Target className="w-7 h-7 text-primary" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t("home.discoveryTitle")}</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              {t("home.discoveryBody")}
            </p>
          </div>
          <div className="premium-card p-8 space-y-4 transition-premium" data-testid="card-concept-transparency">
            <BarChart3 className="w-7 h-7 text-primary" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t("home.transparencyTitle")}</h3>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              {t("home.transparencyBody")}
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section className="max-w-4xl mx-auto px-6" data-testid="section-battle-system" {...fadeUp}>
        <div className="text-center space-y-5 mb-16">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">{t("home.engineEyebrow")}</p>
          <h2 className="text-xl md:text-5xl font-display text-white uppercase tracking-tight font-bold neon-text-strong neon-text-green">
            {t("home.battleRankingsTitle")}
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto normal-case font-light">
            {t("home.battleRankingsBody")}
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div className="premium-card p-7 space-y-4 transition-premium">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-lg font-display font-bold mx-auto">1</div>
            <p className="text-[10px] font-bold text-white uppercase tracking-widest">{t("home.stepSubmitTitle")}</p>
            <p className="text-[9px] text-zinc-600 normal-case leading-relaxed">
              {t("home.stepSubmitBody")}
            </p>
          </div>
          <div className="premium-card p-7 space-y-4 transition-premium">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-lg font-display font-bold mx-auto">2</div>
            <p className="text-[10px] font-bold text-white uppercase tracking-widest">{t("home.stepBattleTitle")}</p>
            <p className="text-[9px] text-zinc-600 normal-case leading-relaxed">
              {t("home.stepBattleBody")}
            </p>
          </div>
          <div className="premium-card p-7 space-y-4 transition-premium">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-lg font-display font-bold mx-auto">3</div>
            <p className="text-[10px] font-bold text-white uppercase tracking-widest">{t("home.stepRiseTitle")}</p>
            <p className="text-[9px] text-zinc-600 normal-case leading-relaxed">
              {t("home.stepRiseBody")}
            </p>
          </div>
          <div className="premium-card p-7 space-y-4 transition-premium">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-lg font-display font-bold mx-auto">4</div>
            <p className="text-[10px] font-bold text-white uppercase tracking-widest">{t("home.stepChartTitle")}</p>
            <p className="text-[9px] text-zinc-600 normal-case leading-relaxed">
              {t("home.stepChartBody")}
            </p>
          </div>
        </div>

        {recentBattle ? (
          <div className="premium-card p-10 mt-12" data-testid="section-live-battle-arena">
            <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 text-center mb-8">
              {t("home.liveBattleEyebrow")}
            </p>
            <div className="flex md:flex-row flex-col items-center justify-center gap-4 md:gap-8">
              <div className="flex-1 md:text-right text-center">
                <p className="text-[0.7rem] font-bold text-white uppercase tracking-wider break-words whitespace-normal leading-tight" data-testid="text-battle-arena-track-a">
                  {recentBattle.trackA?.title || t("home.trackAFallback")}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  {recentBattle.trackA?.creatorName || t("home.creatorFallback")}
                </p>
              </div>
              <div className="shrink-0 self-center">
                <span className="text-3xl font-display font-black italic text-primary neon-text" data-testid="text-battle-vs">VS</span>
              </div>
              <div className="flex-1 md:text-left text-center">
                <p className="text-[0.7rem] font-bold text-white uppercase tracking-wider break-words whitespace-normal leading-tight" data-testid="text-battle-arena-track-b">
                  {recentBattle.trackB?.title || t("home.trackBFallback")}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                  {recentBattle.trackB?.creatorName || t("home.creatorFallback")}
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
                {t("home.voteNow")}
              </button>
            </div>
          </div>
        ) : (
          <div className="premium-card border-dashed p-10 text-center mt-12" data-testid="section-live-battle-arena">
            <p className="text-zinc-500 text-sm mb-6">{t("home.noActiveBattles")}</p>
            <button
              onClick={() => setLocation("/battle")}
              data-testid="button-start-first-battle"
              className="px-8 py-4 glass-button text-primary font-bold text-sm uppercase tracking-widest transition-premium rounded-xl"
            >
              {t("home.startABattle")}
            </button>
          </div>
        )}
      </motion.section>

      <motion.section className="max-w-4xl mx-auto px-6" data-testid="section-creator-ecosystem" {...fadeUp}>
        <div className="text-center space-y-5 mb-16">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">{t("home.forCreatorsEyebrow")}</p>
          <h2 className="text-xl md:text-5xl font-display text-white uppercase tracking-tight font-bold neon-text-strong neon-text-green">
            {t("home.ecosystemTitle")}
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto normal-case font-light">
            {t("home.ecosystemBody")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="premium-card p-8 space-y-5 transition-premium">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t("home.meritTitle")}</h3>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              {t("home.meritBody")}
            </p>
          </div>
          <div className="premium-card p-8 space-y-5 transition-premium">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t("home.audienceTitle")}</h3>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              {t("home.audienceBody")}
            </p>
          </div>
          <div className="premium-card p-8 space-y-5 transition-premium">
            <div className="flex items-center gap-3">
              <Music2 className="w-6 h-6 text-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t("home.profilesTitle")}</h3>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              {t("home.profilesBody")}
            </p>
          </div>
          <div className="premium-card p-8 space-y-5 transition-premium">
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-primary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">{t("home.streaksTitle")}</h3>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed normal-case">
              {t("home.streaksBody")}
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section className="max-w-4xl mx-auto px-6" data-testid="section-trending-today" {...fadeUp}>
        <div className="text-center space-y-5 mb-16">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">{t("home.trendingEyebrow")}</p>
          <h2 className="text-base md:text-5xl font-display text-white uppercase tracking-tight font-bold neon-text-strong neon-text-green">
            {t("home.trendingTitle")}
          </h2>
          <p className="text-zinc-500 text-xs uppercase tracking-[0.3em]">
            {t("home.trendingSub")}
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
              {t("home.viewFullChart")} <ArrowRight className="w-3 h-3 inline ml-1" />
            </button>
          </div>
        )}
      </motion.section>

      <motion.section className="text-center space-y-10 pt-12 px-6" data-testid="section-cta" {...fadeUp}>
        <div className="space-y-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-primary/60">{t("home.joinEyebrow")}</p>
          <h2 className="text-xl md:text-5xl font-display text-white uppercase tracking-tight font-bold neon-text-strong neon-text-green">
            {t("home.ctaTitle")}
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed normal-case font-light">
            {t("home.ctaBody")}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-9">
          <button
            onClick={goSubmitTrack}
            data-testid="button-submit-your-track"
            className="px-10 py-5 glass-button text-primary font-bold text-sm uppercase tracking-widest transition-premium rounded-xl"
          >
            {t("home.submitYourTrack")}
          </button>
          <button
            onClick={() => setLocation("/battle")}
            data-testid="button-cta-battle"
            className="px-10 py-5 glass-button text-primary font-bold text-sm uppercase tracking-widest transition-premium rounded-xl"
            style={{ borderColor: "hsla(282, 100%, 50%, 0.3)", background: "hsla(282, 100%, 50%, 0.08)" }}
          >
            {t("home.enterBattleArena")}
          </button>
          <button
            onClick={() => setLocation("/about")}
            data-testid="button-learn-how-nex-works"
            className="px-10 py-5 glass-button-outline text-white font-bold text-sm uppercase tracking-widest transition-premium rounded-xl hover:text-primary"
          >
            {t("home.learnMore")}
          </button>
        </div>
      </motion.section>

    </motion.div>
  );
}
