import { useMemo } from "react";
import { motion } from "framer-motion";
import { useWorks } from "@/hooks/use-works";
import { MusicRow } from "@/components/MusicRow";
import { MVCard } from "@/components/MVCard";
import { Loader2, Radio } from "lucide-react";
import { useLocation } from "wouter";

export function Home() {
  const { data: tracks, isLoading } = useWorks();
  const [location, setLocation] = useLocation();
  const musicTracks = useMemo(() => 
    (tracks || []).sort((a, b) => b.votes - a.votes)
  , [tracks]);

  const mvTracks = useMemo(() => 
    (tracks || []).sort((a, b) => b.votes - a.votes)
  , [tracks]);

  const isHome = location === "/";
  const isMusic = location === "/music";
  const isMV = location === "/music-video";

  const startRadio = () => setLocation("/radio");

  if (isLoading) return (
    <div className="py-32 flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-6" />
      <p className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">Syncing NEX Data</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-20 pb-20">
      <section className="relative py-12 border-b border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h1 className="text-6xl md:text-7xl font-display font-bold text-white tracking-tighter uppercase leading-none">NEX TOP 100</h1>
            <p className="text-primary font-bold uppercase tracking-[0.4em] text-[12px] mt-2">AI MUSIC CHART</p>
          </div>
          <button onClick={startRadio} className="flex items-center gap-3 bg-primary text-black px-8 py-3 rounded-sm hover:brightness-110 transition-all group">
            <Radio className="w-4 h-4 group-hover:animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Start Radio</span>
          </button>
        </div>
        <div className="mt-6 text-[11px] uppercase tracking-[0.3em] text-zinc-400">
        NEX Chart Ranking
        </div>

        <div className="text-[10px] text-zinc-500 tracking-[0.25em]">
        Based on Plays • Votes • Battle Results
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* MUSIC SECTION */}
        {(isHome || isMusic) && (
          <div className={`${isMusic ? "lg:col-span-2 max-w-4xl mx-auto w-full" : "space-y-12"}`}>
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-4xl font-display font-bold uppercase tracking-tighter text-primary">MUSIC BOARD</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em]">Official Audio Standings</p>
            </div>
            <div className="space-y-1 h-[800px] overflow-y-auto pr-4 scrollbar-hide">
              {musicTracks.slice(0, 50).map((track, idx) => (
                <MusicRow key={track.id} track={track} rank={idx + 1} />
              ))}
            </div>
          </div>
        )}

        {/* MV SECTION */}
        {(isHome || isMV) && (
          <div className={`${isMV ? "lg:col-span-2 w-full" : "space-y-12"}`}>
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-4xl font-display font-bold uppercase tracking-tighter text-primary">VIDEO BOARD</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em]">Official MV Standings</p>
            </div>
            <div className={`grid gap-4 h-[800px] overflow-y-auto pr-4 scrollbar-hide ${isMV ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2"}`}>
              {mvTracks.slice(0, 50).map((track, idx) => (
                <MVCard key={track.id} track={track} index={idx} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
