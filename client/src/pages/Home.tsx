import { motion } from "framer-motion";
import { useWorks } from "@/hooks/use-works";
import { MusicRow } from "@/components/MusicRow";
import { Radio, Swords, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function Home() {
  const { data: tracks, isLoading } = useWorks();
  const [, setLocation] = useLocation();

  const startRadio = () => setLocation("/radio");

  const { data: recentBattle } = useQuery<any>({
    queryKey: ["/api/battles/recent"],
  });

  const trending = (tracks || [])
    .slice()
    .sort((a: any, b: any) => (b.rankingScore || 0) - (a.rankingScore || 0))
    .slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-24 pb-24">

      {/* HERO */}
      <section className="py-24 text-center space-y-6">
        <h1 className="text-6xl md:text-7xl font-display font-bold text-white">
          NEX
        </h1>

        <p className="text-primary font-bold tracking-[0.4em] text-sm uppercase">
          AI Music Ranking Platform
        </p>

        <p className="text-zinc-400 text-sm tracking-[0.3em] uppercase">
          Battle. Rise. Chart.
        </p>

        <div className="flex justify-center gap-4 pt-6">
          <button
            onClick={() => setLocation("/battle")}
            data-testid="button-start-battle"
            className="px-6 py-3 bg-primary text-black font-bold text-sm uppercase tracking-widest"
          >
            Start Battle
          </button>

          <button
            onClick={() => setLocation("/submit")}
            data-testid="button-submit-track"
            className="px-6 py-3 border border-white/20 text-white text-sm uppercase tracking-widest"
          >
            Submit Track
          </button>

          <button
            onClick={startRadio}
            data-testid="button-radio"
            className="px-6 py-3 border border-white/20 text-white flex items-center gap-2 text-sm uppercase tracking-widest"
          >
            <Radio size={16} />
            Radio
          </button>
        </div>
      </section>

      {/* LIVE BATTLE ARENA */}
      <section className="max-w-3xl mx-auto space-y-6" data-testid="section-live-battle-arena">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            <h2 className="text-3xl font-display text-white uppercase tracking-widest">
              Live Battle Arena
            </h2>
          </div>
          <p className="text-zinc-500 text-xs uppercase tracking-[0.3em]">
            Active matchups happening now
          </p>
        </div>

        {recentBattle ? (
          <div className="border border-white/10 rounded-sm bg-black/30 p-8">
            <div className="flex items-center justify-center gap-6">
              <div className="flex-1 text-right">
                <p className="text-sm font-bold text-white uppercase tracking-wider truncate" data-testid="text-battle-arena-track-a">
                  {recentBattle.trackA?.title || "Track A"}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  {recentBattle.trackA?.creatorName || "Creator"}
                </p>
              </div>
              <div className="shrink-0">
                <span className="text-2xl font-display font-bold text-primary" data-testid="text-battle-vs">VS</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white uppercase tracking-wider truncate" data-testid="text-battle-arena-track-b">
                  {recentBattle.trackB?.title || "Track B"}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                  {recentBattle.trackB?.creatorName || "Creator"}
                </p>
              </div>
            </div>
            <div className="text-center mt-6">
              <button
                onClick={() => setLocation("/battle")}
                data-testid="button-vote-now"
                className="px-8 py-3 bg-primary text-black font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all"
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Vote Now
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-white/10 border-dashed rounded-sm p-8 text-center">
            <p className="text-zinc-500 text-sm mb-4">No active battles right now</p>
            <button
              onClick={() => setLocation("/battle")}
              data-testid="button-start-first-battle"
              className="px-6 py-3 border border-primary/40 bg-primary/10 text-primary font-bold text-sm uppercase tracking-widest hover:bg-primary/20 transition-all"
            >
              Start a Battle
            </button>
          </div>
        )}
      </section>

      {/* WHAT IS NEX */}
      <section className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-3xl font-display text-white uppercase tracking-widest">
          What is NEX
        </h2>

        <p className="text-zinc-400 text-sm leading-relaxed">
          NEX is a competitive ranking platform for AI-generated music.
          Artists submit tracks which enter the battle arena and compete
          through listener votes, plays and duel performance.
        </p>

        <p className="text-zinc-400 text-sm leading-relaxed">
          Only the strongest tracks rise through the system and reach the
          official NEX charts.
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto text-center space-y-10">
        <h2 className="text-3xl font-display text-white uppercase tracking-widest">
          How NEX Works
        </h2>

        <div className="grid md:grid-cols-4 gap-6 text-sm uppercase tracking-widest text-zinc-400">

          <div className="space-y-2">
            <p className="text-primary">1</p>
            <p>Submit</p>
          </div>

          <div className="space-y-2">
            <p className="text-primary">2</p>
            <p>Battle</p>
          </div>

          <div className="space-y-2">
            <p className="text-primary">3</p>
            <p>Rising</p>
          </div>

          <div className="space-y-2">
            <p className="text-primary">4</p>
            <p>Top 100</p>
          </div>

        </div>
      </section>

      {/* TRUST */}
      <section className="max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-3xl font-display text-white uppercase tracking-widest">
          Trust & Verification
        </h2>

        <p className="text-zinc-400 text-sm leading-relaxed">
          NEX rankings are determined through a transparent system based on
          listener plays, community voting and battle performance.
        </p>

        <p className="text-zinc-400 text-sm leading-relaxed">
          Artificial boosting is prevented by combining multiple signals,
          ensuring that only proven tracks reach the official charts.
        </p>
      </section>

      {/* TRENDING TODAY */}
      <section className="max-w-4xl mx-auto space-y-10" data-testid="section-trending-today">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-display text-white uppercase tracking-widest">
            Trending Today
          </h2>

          <p className="text-zinc-500 text-xs uppercase tracking-[0.3em]">
            Ranked by battle wins, plays & votes
          </p>
        </div>

        <div className="space-y-2">
          {!isLoading &&
            trending.map((track: any, idx: number) => (
              <MusicRow key={track.id} track={track} rank={idx + 1} />
            ))}
        </div>
      </section>

      {/* ENTER ARENA */}
      <section className="text-center space-y-6 pt-10">
        <h2 className="text-3xl font-display text-white uppercase tracking-widest">
          Enter the Arena
        </h2>

        <p className="text-zinc-400 text-sm">
          Create AI music. Compete in battles. Rise through the rankings.
        </p>

        <button
          onClick={() => setLocation("/submit")}
          data-testid="button-submit-your-track"
          className="px-8 py-4 bg-primary text-black font-bold text-sm uppercase tracking-widest"
        >
          Submit Your Track
        </button>
      </section>

    </motion.div>
  );
}
