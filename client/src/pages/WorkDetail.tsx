import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useWork, useWorks } from "@/hooks/use-works";
import { Loader2, ArrowLeft, Play, Pause, Vote, Heart, Music, Info } from "lucide-react";
import { useState, useMemo } from "react";

export function TrackDetail() {
  const [, params] = useRoute("/track/:id");
  const { data: trackData, isLoading: isTrackLoading } = useWork(params?.id || "");
  const { data: allTracks, isLoading: areTracksLoading } = useWorks();
  const [isPlaying, setIsPlaying] = useState(false);

  // Normalize track data based on the API response structure { ...track, creator }
  const track = useMemo(() => {
    if (!trackData) return null;
    return {
      ...trackData,
      creatorName: trackData.creator?.username || "NEO CREATOR",
      votes: trackData.listenerVotes || 0
    };
  }, [trackData]);

  const sortedTracks = useMemo(() => 
    [...(allTracks || [])].sort((a, b) => (b?.votes || 0) - (a?.votes || 0))
  , [allTracks]);

  // Loading state
  if (isTrackLoading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-primary/60">Loading Neural Data...</p>
      </div>
    );
  }

  // Not found or error state
  if (!track) {
    return (
      <div className="p-20 text-center space-y-6">
        <div className="font-display text-2xl uppercase tracking-widest text-zinc-500 border border-white/5 border-dashed p-12">
          Track Not Found
        </div>
        <Link href="/music" className="inline-block text-primary font-bold uppercase tracking-widest hover:underline">
          Return to Music Board
        </Link>
      </div>
    );
  }

  const isSuno = track.audioUrl?.includes("suno.com");
  const sunoEmbedUrl = isSuno ? track.audioUrl.replace("/song/", "/embed/") : null;
  const rankIndex = sortedTracks.findIndex(st => st.id === track.id);
  const rank = rankIndex !== -1 ? rankIndex + 1 : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-12 pb-20">
      <Link href="/music" className="inline-flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-[0.2em]">
        <ArrowLeft className="w-4 h-4" /> Back to Music
      </Link>

      <div className="bg-[#050505] border border-white/5 p-8 md:p-16 rounded-sm relative overflow-hidden">
        <div className="flex flex-col items-center space-y-12 relative z-10">
          {/* ALBUM COVER & PLAYER */}
          <div className="w-full max-w-md aspect-square bg-zinc-900 border border-white/10 rounded-sm relative overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.1)]">
            {isSuno ? (
              <iframe 
                src={sunoEmbedUrl!} 
                width="100%" 
                height="100%" 
                style={{ border: 'none' }} 
                allow="autoplay; encrypted-media"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-24 h-24 text-zinc-800" />
              </div>
            )}
          </div>

          {/* TRACK INFO */}
          <div className="text-center space-y-6 w-full">
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tighter uppercase leading-none">
                {track.title}
              </h1>
              <p className="text-primary font-bold uppercase tracking-[0.4em] text-xs">
                BY {track.creatorName}
              </p>
            </div>

            {/* TRACK INFORMATION BLOCK */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-y border-white/5 text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-widest">
              <div className="space-y-1">
                <div className="text-zinc-600">RANK</div>
                <div className="text-white text-xs">
                  {rank ? `NEX #${String(rank).padStart(3, "0")}` : (areTracksLoading ? '...' : '-')}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-600">TITLE</div>
                <div className="text-white text-xs">{track.title}</div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-600">ARTIST</div>
                <div className="text-white text-xs">{track.creatorName}</div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-600">VOTES</div>
                <div className="text-white text-xs">{track.votes}</div>
              </div>
            </div>

            {/* LYRICS SECTION */}
            <div className="pt-12 w-full max-w-2xl mx-auto">
              <div className="flex items-center gap-3 justify-center mb-6 text-zinc-500">
                <div className="h-[1px] flex-1 bg-white/5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">LYRICS</span>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              <div className="space-y-6 text-xl md:text-2xl font-bold text-zinc-400 text-center leading-relaxed">
                {track.lyrics ? (
                  track.lyrics.split('\n').map((line: string, i: number) => (
                    <motion.p 
                      key={i}
                      initial={{ opacity: 0.3 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="hover:text-white transition-colors cursor-default"
                    >
                      {line}
                    </motion.p>
                  ))
                ) : (
                  <p className="italic opacity-30 text-sm uppercase tracking-widest">Synthesizing narrative streams...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
