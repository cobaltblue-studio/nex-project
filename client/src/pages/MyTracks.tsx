import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Music, Upload, Play, ChevronUp, Clock, Video } from "lucide-react";

export function MyTracks() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profiles/me"],
    queryFn: async () => {
      const res = await fetch("/api/profiles/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: tracks, isLoading: tracksLoading } = useQuery<any[]>({
    queryKey: ["/api/tracks/my"],
    queryFn: async () => {
      const res = await fetch("/api/tracks/my", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAuthenticated && !!profile,
    retry: false,
  });

  if (authLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-primary/60">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-40 text-center space-y-6">
        <p className="font-display text-2xl uppercase tracking-widest text-zinc-500">Authentication Required</p>
        <a href="/api/login" className="inline-block border border-primary/30 text-primary px-6 py-3 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-primary/10 transition-all">
          Login
        </a>
      </div>
    );
  }

  if (profile?.role !== "nex") {
    return (
      <div className="py-40 text-center space-y-6">
        <div className="border border-white/5 border-dashed p-16 rounded-sm max-w-md mx-auto space-y-4">
          <Music className="w-12 h-12 text-zinc-700 mx-auto" />
          <p className="font-display text-xl uppercase tracking-widest text-zinc-500">Creator Access Only</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto pb-20 space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-4xl font-bold uppercase tracking-tighter text-white">My Tracks</h1>
          <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">
            {tracks?.length || 0} track{tracks?.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <Link href="/upload">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="button-upload-new"
            className="flex items-center gap-2 border border-primary/30 text-primary px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-sm bg-primary/5 hover:bg-primary/20 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Track
          </motion.button>
        </Link>
      </div>

      {/* Track List */}
      {tracksLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : !tracks || tracks.length === 0 ? (
        <div className="bg-[#080808] border border-white/5 border-dashed rounded-sm p-20 text-center space-y-6">
          <Music className="w-16 h-16 text-zinc-800 mx-auto" />
          <div className="space-y-2">
            <p className="font-display text-xl uppercase tracking-widest text-zinc-600">No Tracks Yet</p>
            <p className="text-zinc-700 text-sm">Upload your first AI-generated track to appear in the charts.</p>
          </div>
          <Link href="/upload">
            <button
              data-testid="button-upload-first"
              className="inline-flex items-center gap-2 bg-primary text-black px-6 py-3 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:brightness-110 transition-all"
            >
              <Upload className="w-3.5 h-3.5" /> Upload First Track
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map((track, idx) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              data-testid={`row-track-${track.id}`}
              className="bg-[#080808] border border-white/5 rounded-sm p-4 flex items-center gap-4 hover:border-white/10 transition-all group"
            >
              {/* Cover Image */}
              <div className="w-14 h-14 rounded-sm bg-zinc-900 border border-white/10 flex-shrink-0 overflow-hidden relative">
                {track.coverImage ? (
                  <img src={track.coverImage} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-zinc-700" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white uppercase tracking-wide truncate group-hover:text-primary transition-colors">
                    {track.title}
                  </p>
                  {track.musicVideoUrl && (
                    <span className="flex-shrink-0 text-[8px] text-primary/70 border border-primary/20 px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-bold">
                      MV
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600">
                  <span className="uppercase tracking-widest">{track.aiTool}</span>
                  <span className="text-zinc-800">·</span>
                  <span className="uppercase tracking-widest">{track.genre}</span>
                  <span className="text-zinc-800">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDate(track.createdAt)}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex-shrink-0 flex items-center gap-6 text-right">
                <div className="space-y-0.5 text-center">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                    <ChevronUp className="w-3 h-3 text-primary/60" />
                    <span className="text-white font-bold">{track.votes}</span>
                  </div>
                  <p className="text-[8px] text-zinc-700 uppercase tracking-widest">Votes</p>
                </div>
                <div className="space-y-0.5 text-center">
                  <p className="text-[10px] font-mono text-white font-bold">{track.neoScore?.toFixed(1)}</p>
                  <p className="text-[8px] text-zinc-700 uppercase tracking-widest">NEX Score</p>
                </div>
              </div>

              {/* Play link */}
              <Link href={`/track/${track.id}`}>
                <div
                  data-testid={`button-play-track-${track.id}`}
                  className="w-9 h-9 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 text-zinc-500 group-hover:text-primary" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
