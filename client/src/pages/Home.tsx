import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useWorks } from "@/hooks/use-works";
import { MusicRow } from "@/components/MusicRow";
import { MVCard } from "@/components/MVCard";
import { Loader2, Music, Video, Radio } from "lucide-react";
import { useLocation, Link } from "wouter";

export function Home() {
  const { data: tracks, isLoading } = useWorks();
  const [location] = useLocation();
  const [recentlyPlayed, setRecentlyPlayed] = useState<number[]>([]);

  const musicTracks = useMemo(() => 
    (tracks || []).sort((a, b) => b.votes - a.votes)
  , [tracks]);

  const mvTracks = useMemo(() => 
    (tracks || []).sort((a, b) => b.votes - a.votes)
  , [tracks]);

  const isHome = location === "/";

  const startRadio = () => {
    if (!tracks || tracks.length === 0) return;
    const top50 = [...tracks].sort((a, b) => b.neoScore - a.neoScore).slice(0, 50);
    const available = top50.filter(t => !recentlyPlayed.includes(t.id));
    let nextTrack;
    if (available.length === 0) {
      nextTrack = top50[Math.floor(Math.random() * top50.length)];
      setRecentlyPlayed([nextTrack.id]);
    } else {
      nextTrack = available[Math.floor(Math.random() * available.length)];
      setRecentlyPlayed(prev => [...prev.slice(-4), nextTrack.id]);
    }
  };

  if (isLoading) return (
    <div className="py-32 flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-6" />
      <p className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">Syncing NEO Data</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-20 pb-20">
      <section className="relative py-12 border-b border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h1 className="text-6xl md:text-7xl font-display font-bold text-white tracking-tighter uppercase leading-none">NEO</h1>
            <p className="text-primary font-bold uppercase tracking-[0.4em] text-[10px] mt-2">AI Music is NEO.</p>
          </div>
          <button onClick={startRadio} className="flex items-center gap-3 bg-primary text-black px-8 py-3 rounded-sm hover:brightness-110 transition-all group">
            <Radio className="w-4 h-4 group-hover:animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Start Radio</span>
          </button>
        </div>
      </section>

      <section id="top-50-section" className="space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-display font-bold uppercase tracking-tighter">NEO BOARD</h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em]">Official League Standings</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-8">
            <h3 className="text-xl font-display font-bold uppercase tracking-widest text-primary border-b border-white/10 pb-4">Music — Top 50</h3>
            <div className="space-y-1 h-[800px] overflow-y-auto pr-4 scrollbar-hide">
              {musicTracks.slice(0, 50).map((track, idx) => (
                <MusicRow key={track.id} track={track} rank={idx + 1} />
              ))}
            </div>
          </div>
          <div className="space-y-8">
            <h3 className="text-xl font-display font-bold uppercase tracking-widest text-primary border-b border-white/10 pb-4">Music Video — Top 50</h3>
            <div className="grid grid-cols-2 gap-4 h-[800px] overflow-y-auto pr-4 scrollbar-hide">
              {mvTracks.slice(0, 50).map((track, idx) => (
                <MVCard key={track.id} track={track} index={idx} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
