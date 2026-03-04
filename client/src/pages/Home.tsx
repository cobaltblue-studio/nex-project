import { useState } from "react";
import { motion } from "framer-motion";
import { useWorks } from "@/hooks/use-works";
import { WorkCard } from "@/components/WorkCard";
import { Filter, Loader2 } from "lucide-react";
import { clsx } from "clsx";

export function Home() {
  const [filter, setFilter] = useState<string>("");
  const { data: works, isLoading } = useWorks(filter);

  const categories = [
    { id: "", label: "All Works" },
    { id: "image", label: "Image" },
    { id: "music", label: "Music" },
    { id: "music_video", label: "Music Video" },
    { id: "vertical_video", label: "Vertical Video" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-display font-bold neon-text text-white">NEO BOARD</h1>
          <p className="text-muted-foreground font-sans mt-2 tracking-wide text-sm uppercase">Authority ranking layer for AI creators</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="w-4 h-4 text-muted-foreground mr-2" />
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={clsx(
                "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300",
                filter === cat.id 
                  ? "bg-primary text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]" 
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-primary">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="font-mono text-sm tracking-widest uppercase animate-pulse">Computing Ranks...</p>
        </div>
      ) : !works || works.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border-dashed border-white/20">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">No works found</h3>
          <p className="text-muted-foreground text-sm">Be the first to submit a work in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {works.map((work, idx) => (
            <WorkCard key={work.id} work={work} index={idx} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
