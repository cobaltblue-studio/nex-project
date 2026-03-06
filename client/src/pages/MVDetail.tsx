import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { useWork } from "@/hooks/use-works";
import { Loader2, ArrowLeft, Youtube, Info, Vote } from "lucide-react";

export function MVDetail() {
  const [, params] = useRoute("/mv/:id");
  const { data: track, isLoading } = useWork(params?.id || "");

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  if (!track) return <div className="p-20 text-center font-display text-2xl uppercase tracking-widest text-zinc-500 border border-white/5 border-dashed">Video Not Found</div>;

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url?.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const mvUrl = track.musicVideoUrl || track.mvUrl;
  const videoId = getYoutubeId(mvUrl || "");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-12 pb-20">
      <Link href="/music-video" className="inline-flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-[0.2em]">
        <ArrowLeft className="w-4 h-4" /> Back to Music Video
      </Link>

      <div className="space-y-8">
        <div className="aspect-video bg-black border border-white/5 rounded-sm overflow-hidden shadow-[0_0_100px_rgba(0,240,255,0.05)]">
          {videoId ? (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="w-full h-full flex items-center justify-center flex-col gap-4 text-zinc-800">
              <Youtube className="w-20 h-20" />
              <p className="font-display text-sm uppercase tracking-widest">Video Stream Offline</p>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start gap-8 bg-[#0A0A0A] p-8 border border-white/5 rounded-sm">
          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter uppercase">
                {track.title}
              </h1>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  {track.creatorName?.[0] || "N"}
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-zinc-400">NEX {track.creatorName}</span>
              </div>
            </div>

            {/* TRACK INFORMATION BLOCK */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-6 border-t border-white/5 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
              <div className="space-y-1">
                <div className="text-zinc-700">NEX ID</div>
                <div className="text-white">NEX #{String(track.id).padStart(3, "0")}</div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-700">TITLE</div>
                <div className="text-white">{track.title}</div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-700">ARTIST</div>
                <div className="text-white">NEX {track.creatorName}</div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-700">VOTES</div>
                <div className="text-white">{track.votes}</div>
              </div>
              <div className="space-y-1">
                <div className="text-zinc-700">CATEGORY</div>
                <div className="text-white">{track.genre || "MV"}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-sm text-center">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Votes</p>
              <p className="text-3xl font-display font-bold text-white">{track.votes}</p>
            </div>
            <button className="flex items-center gap-3 bg-primary text-black font-bold uppercase tracking-widest px-8 py-4 rounded-sm hover:brightness-110 active:scale-95 transition-all">
              <Vote className="w-4 h-4" /> Vote
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
