import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useWork, useWorks } from "@/hooks/use-works";
import { Loader2, ArrowLeft, Youtube, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { YoutubePlayer, extractYoutubeId } from "@/components/YoutubePlayer";

export function MVDetail() {
  const [, params] = useRoute("/mv/:id");
  const { data: trackData, isLoading: isTrackLoading } = useWork(params?.id || "");
  const { data: allTracks, isLoading: areTracksLoading } = useWorks();

  // Normalize track data based on the API response structure { ...track, creator }
  const track = useMemo(() => {
    if (!trackData) return null;
    return {
      ...trackData,
      creatorName: trackData.creator?.username || "NEX CREATOR",
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
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-primary/60">Syncing Visual Stream...</p>
      </div>
    );
  }

  // Not found state
  if (!track) {
    return (
      <div className="p-20 text-center space-y-6">
        <div className="font-display text-2xl uppercase tracking-widest text-zinc-500 border border-white/5 border-dashed p-12">
          Video Not Found
        </div>
        <Link href="/music-video" className="inline-block text-primary font-bold uppercase tracking-widest hover:underline">
          Return to Video Board
        </Link>
      </div>
    );
  }

  const [videoEnded, setVideoEnded] = useState(false);

  const mvUrl = track.mvUrl;
  const videoId = extractYoutubeId(mvUrl || "");
  const rankIndex = sortedTracks.findIndex(st => st.id === track.id);
  const rank = rankIndex !== -1 ? rankIndex + 1 : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-12 pb-20">
      <Link href="/music-video" className="inline-flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-[0.2em]">
        <ArrowLeft className="w-4 h-4" /> Back to Music Video
      </Link>

      <div className="space-y-8">
        <div className="bg-black border border-white/5 rounded-sm overflow-hidden shadow-[0_0_100px_rgba(0,240,255,0.05)] relative">
          {videoEnded ? (
            <div className="aspect-video flex flex-col items-center justify-center gap-5 bg-black/90">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Video Ended</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setVideoEnded(false)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Watch Again
                </button>
                <Link
                  href="/music-video"
                  className="flex items-center gap-2 px-5 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm transition-all"
                >
                  Back to Videos
                </Link>
              </div>
            </div>
          ) : videoId ? (
            <YoutubePlayer
              videoId={videoId}
              autoplay={true}
              onEnded={() => setVideoEnded(true)}
            />
          ) : (
            <div className="w-full aspect-video flex items-center justify-center flex-col gap-4 text-zinc-800">
              <Youtube className="w-20 h-20" />
              <p className="font-display text-sm uppercase tracking-widest">Video Stream Offline</p>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start gap-8 bg-[#0A0A0A] p-8 border border-white/5 rounded-sm">
          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter uppercase neon-text-green">
                {track.title}
              </h1>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
                  <span className="text-primary/60">NEX</span>
                </div>
                <Link href={`/profile/${track.creatorName.toLowerCase()}`}>
                  <span className="text-lg font-display font-bold uppercase tracking-widest text-white cursor-pointer hover:text-primary transition-colors">
                    BY {track.creatorName}
                  </span>
                </Link>
              </div>
            </div>

            {/* TRACK INFORMATION BLOCK */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-t border-white/5 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
              <div className="space-y-1">
                <div className="text-zinc-700">RANK</div>
                <div className="text-white">
                  {rank ? `NEX #${String(rank).padStart(3, "0")}` : (areTracksLoading ? '...' : '-')}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-700">TITLE</div>
                <div className="text-white">{track.title}</div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-700">ARTIST</div>
                <div className="text-white">{track.creatorName}</div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-700">VOTES</div>
                <div className="text-white">{track.votes}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-sm text-center">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Votes</p>
              <p className="text-3xl font-display font-bold text-white">{track.votes}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
