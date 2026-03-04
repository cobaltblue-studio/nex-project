import { useState } from "react";
import { motion } from "framer-motion";
import { useWorks } from "@/hooks/use-works";
import { WorkCard } from "@/components/WorkCard";
import { Filter, Loader2, TrendingUp, Music, Video, Image as ImageIcon } from "lucide-react";
import { clsx } from "clsx";

export function Home() {
  const [filter, setFilter] = useState<string>("");
  const { data: works, isLoading } = useWorks(filter);

  const categories = [
    { id: "", label: "Global", icon: TrendingUp },
    { id: "image", label: "Image", icon: ImageIcon },
    { id: "music", label: "Music", icon: Music },
    { id: "vertical_video", label: "Vertical", icon: Video },
    { id: "music_video", label: "Cinema", icon: Video },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      <header className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <div className="w-8 h-px bg-primary/30" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">NEO BOARD v1.0</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white tracking-tighter">
            RANKINGS
          </h1>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide border-b border-white/5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={clsx(
                "flex items-center gap-2 px-6 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border",
                filter === cat.id 
                  ? "bg-primary border-primary text-black shadow-[0_0_20px_rgba(0,240,255,0.3)]" 
                  : "bg-transparent border-white/10 text-zinc-500 hover:text-white hover:border-white/30"
              )}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-6" />
          <p className="font-mono text-[10px] tracking-[0.4em] text-primary/60 uppercase animate-pulse">Syncing Chain Data</p>
        </div>
      ) : !works || works.length === 0 ? (
        <div className="border border-white/5 bg-white/5 rounded-sm p-20 text-center border-dashed">
          <h3 className="text-lg font-display font-bold uppercase tracking-widest text-zinc-500">No entries detected</h3>
          <p className="text-zinc-600 text-xs mt-2 uppercase tracking-widest">Connect your NEX profile to submit</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {works.map((work, idx) => (
            <WorkCard key={work.id} work={work} index={idx} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
