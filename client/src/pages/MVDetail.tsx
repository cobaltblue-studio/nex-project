import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useWork } from "@/hooks/use-works";
import { Loader2, ArrowLeft, Youtube, ExternalLink, Music } from "lucide-react";

export function MVDetail() {
  const [, params] = useRoute("/mv/:id");
  const { data: track, isLoading } = useWork(params?.id || "");

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  
  if (!track || !track.mvUrl) {
    return (
      <div className="p-20 text-center space-y-6">
        <h2 className="font-display text-2xl uppercase tracking-widest text-zinc-500">MV Not Available</h2>
        <Link href="/music-video" className="inline-block text-primary font-bold uppercase tracking-widest hover:underline">
          Return to Music Video Board
        </Link>
      </div>
    );
  }

  // Extract YouTube ID from URL
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYoutubeId(track.mvUrl);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <Link href="/music-video" className="inline-flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-[0.2em]">
          <ArrowLeft className="w-4 h-4" /> Back to Videos
        </Link>
        <Link href={`/track/${track.id}`} className="inline-flex items-center gap-2 text-primary hover:underline text-[10px] font-bold uppercase tracking-[0.2em]">
          <Music className="w-3.5 h-3.5" /> Listen to Audio
        </Link>
      </div>

      <div className="bg-black border border-white/5 rounded-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="aspect-video w-full bg-zinc-950">
          {videoId ? (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title={track.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-600">
              <Youtube className="w-16 h-16 opacity-20" />
              <p className="text-xs uppercase tracking-widest font-bold">Unable to embed player</p>
              <a href={track.mvUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2 text-[10px] font-bold">
                Watch on YouTube <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
        
        <div className="p-8 md:p-12 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter uppercase leading-none">
                {track.title}
              </h1>
              <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest">
                <Link href={`/profile/${track.creatorId}`} className="text-primary hover:underline">
                  {track.creatorName || "NEO CREATOR"}
                </Link>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-500">{track.aiTool}</span>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">VOTES</p>
              <p className="text-5xl font-display font-bold text-white neon-text">{track.votes}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
