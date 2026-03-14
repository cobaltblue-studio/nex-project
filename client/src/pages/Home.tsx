import { motion } from "framer-motion";
import { useWorks } from "@/hooks/use-works";
import { MusicRow } from "@/components/MusicRow";
import { Radio } from "lucide-react";
import { useLocation } from "wouter";

export function Home() {
  const { data: tracks, isLoading } = useWorks();
  const [, setLocation] = useLocation();

  const startRadio = () => setLocation("/radio");

  const trending = (tracks || [])
    .slice()
    .sort((a: any, b: any) => b.votes - a.votes)
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
            className="px-6 py-3 bg-primary text-black font-bold text-sm uppercase tracking-widest"
          >
            Start Battle
          </button>

          <button
            onClick={() => setLocation("/submit")}
            className="px-6 py-3 border border-white/20 text-white text-sm uppercase tracking-widest"
          >
            Submit Track
          </button>

          <button
            onClick={startRadio}
            className="px-6 py-3 border border-white/20 text-white flex items-center gap-2 text-sm uppercase tracking-widest"
          >
            <Radio size={16} />
            Radio
          </button>
        </div>
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

      {/* TRENDING */}
      <section className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-display text-white uppercase tracking-widest">
            Trending Tracks
          </h2>

          <p className="text-zinc-500 text-xs uppercase tracking-[0.3em]">
            Current top tracks on NEX
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
          className="px-8 py-4 bg-primary text-black font-bold text-sm uppercase tracking-widest"
        >
          Submit Your Track
        </button>
      </section>

    </motion.div>
  );
}