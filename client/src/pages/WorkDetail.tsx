import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useWork } from "@/hooks/use-works";
import { Loader2, ArrowLeft, Play, Pause, Vote, Heart, Music, Info } from "lucide-react";
import { useState } from "react";

export function TrackDetail() {
  const [, params] = useRoute("/track/:id");
  const { data: track, isLoading } = useWork(params?.id || "");
  const [isPlaying, setIsPlaying] = useState(false);

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  if (!track) return <div className="p-20 text-center font-display text-2xl uppercase tracking-widest text-zinc-500 border border-white/5 border-dashed">Track Not Found</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-12 pb-20">
      <Link href="/music" className="inline-flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-[0.2em]">
        <ArrowLeft className="w-4 h-4" /> Back to Music
      </Link>

      <div className="bg-[#0A0A0A] border border-white/5 p-8 md:p-16 rounded-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row gap-12 items-center md:items-start relative z-10">
          <div className="w-64 h-64 bg-zinc-900 border border-white/10 rounded-sm flex items-center justify-center relative group">
            <Music className="w-24 h-24 text-zinc-800" />
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              {isPlaying ? <Pause className="w-12 h-12 text-white" /> : <Play className="w-12 h-12 text-white" />}
            </button>
          </div>

          <div className="flex-1 space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-widest rounded-sm">
                  {track.genre}
                </span>
                <span className="px-3 py-1 bg-white/5 border border-white/10 text-zinc-400 text-[9px] font-bold uppercase tracking-widest rounded-sm">
                  {track.aiTool}
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tighter uppercase leading-none">
                {track.title}
              </h1>
              <Link href={`/profile/${track.creatorId}`} className="inline-flex items-center gap-3 text-zinc-400 hover:text-white transition-colors">
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                  {(track.creatorName?.[0] || "N").toUpperCase()}
                </div>
                <span className="text-sm font-bold uppercase tracking-widest">{track.creatorName || "NEO CREATOR"}</span>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-10">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">VOTES</p>
                <p className="text-5xl font-display font-bold text-white neon-text">{track.votes}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
              <button className="flex items-center gap-3 bg-primary text-black font-bold uppercase tracking-widest px-8 py-4 rounded-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                <Vote className="w-4 h-4" /> Cast Vote
              </button>
              <button className="flex items-center gap-3 border border-white/10 text-white font-bold uppercase tracking-widest px-8 py-4 rounded-sm hover:bg-white/5 active:scale-95 transition-all">
                <Heart className="w-4 h-4" /> Like
              </button>
            </div>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10 border-t border-white/5 pt-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Info className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-[0.3em]">Neural Metadata</h3>
            </div>
            <div className="space-y-4 text-xs uppercase tracking-widest text-zinc-500 font-bold">
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span>Composition Quality</span>
                <span className="text-white">{track.aiCraftScore.toFixed(1)}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span>Model Version</span>
                <span className="text-white">V1.0 (Stable)</span>
              </div>
            </div>
          </div>

          {track.lyrics && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">Lyrics / Narrative</h3>
              <div className="bg-black p-8 rounded-sm text-sm font-sans text-zinc-400 leading-relaxed italic border border-white/5">
                {track.lyrics}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
