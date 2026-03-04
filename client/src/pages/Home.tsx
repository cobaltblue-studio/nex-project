import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useWorks } from "@/hooks/use-works";
import { WorkCard } from "@/components/WorkCard";
import { Loader2, Music, Video, Play, Radio } from "lucide-react";

export function Home() {
  const { data: tracks, isLoading } = useWorks();
  const [radioPlaying, setRadioPlaying] = useState(false);
  const [currentRadioTrack, setCurrentRadioTrack] = useState<any>(null);
  const [recentlyPlayed, setRecentlyPlayed] = useState<number[]>([]);

  // Filter Logic for Top 10 and Top 50
  const musicTracks = useMemo(() => 
    (tracks || []).filter(t => t.genre !== "Music Video").sort((a, b) => b.neoScore - a.neoScore)
  , [tracks]);

  const mvTracks = useMemo(() => 
    (tracks || []).filter(t => t.mvUrl).sort((a, b) => b.neoScore - a.neoScore)
  , [tracks]);

  const startRadio = () => {
    if (!tracks || tracks.length === 0) return;
    
    // FLOW mode: randomly play from Top 50, excluding last 5
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
    setCurrentRadioTrack(nextTrack);
    setRadioPlaying(true);
    
    // In a real app, this would trigger an audio player
    console.log("Radio started: ", nextTrack.title);
  };

  const scrollToTop50 = () => {
    document.getElementById("top-50-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-20 pb-20"
    >
      {/* HERO SECTION */}
      <section className="relative py-20 border-b border-white/5">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <h1 className="text-8xl md:text-9xl font-display font-bold text-white tracking-tighter">
              NEO
            </h1>
            <div className="space-y-1">
              <p className="text-primary font-bold uppercase tracking-[0.4em] text-sm">AI Music is NEO.</p>
              <p className="text-zinc-500 uppercase tracking-widest text-[10px]">Welcome to the league.</p>
            </div>
          </div>
          
          <button 
            onClick={startRadio}
            className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-sm hover:bg-primary hover:border-primary hover:text-black transition-all group"
          >
            <Radio className="w-4 h-4 group-hover:animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Start Radio</span>
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-6" />
          <p className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase">Syncing NEO Data</p>
        </div>
      ) : (
        <>
          {/* TOP 10 PREVIEW */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <Music className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-display font-bold uppercase tracking-widest">Music — Top 10</h2>
              </div>
              <div className="space-y-4">
                {musicTracks.slice(0, 10).map((track, idx) => (
                  <WorkCard key={track.id} work={track} index={idx} />
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <Video className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-display font-bold uppercase tracking-widest">Music Video — Top 10</h2>
              </div>
              <div className="space-y-4">
                {mvTracks.slice(0, 10).map((track, idx) => (
                  <WorkCard key={track.id} work={track} index={idx} />
                ))}
              </div>
            </div>
          </section>

          {/* EXPLORE BUTTON */}
          <div className="flex justify-center py-10">
            <button 
              onClick={scrollToTop50}
              className="w-full max-w-md py-6 border border-white/10 bg-white/5 rounded-sm text-sm font-bold uppercase tracking-[0.3em] hover:bg-white/10 hover:border-primary/50 transition-all text-zinc-400 hover:text-white"
            >
              Explore Top 50
            </button>
          </div>

          {/* TOP 50 SECTION */}
          <section id="top-50-section" className="space-y-12 pt-20">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-display font-bold uppercase tracking-tighter">NEO BOARD</h2>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em]">Official League Standings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div className="space-y-8">
                <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-primary border-b border-primary/20 pb-4">Music — Top 50</h3>
                <div className="grid grid-cols-1 gap-6 h-[800px] overflow-y-auto pr-4 scrollbar-hide">
                  {musicTracks.slice(0, 50).map((track, idx) => (
                    <WorkCard key={track.id} work={track} index={idx} />
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-primary border-b border-primary/20 pb-4">Music Video — Top 50</h3>
                <div className="grid grid-cols-1 gap-6 h-[800px] overflow-y-auto pr-4 scrollbar-hide">
                  {mvTracks.slice(0, 50).map((track, idx) => (
                    <WorkCard key={track.id} work={track} index={idx} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </motion.div>
  );
}
