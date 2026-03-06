import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useWorks } from "@/hooks/use-works";
import { Loader2, Music, Users, Trophy, TrendingUp, Star } from "lucide-react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function ProfileMe() {
  const [, params] = useRoute("/profile/:name");
  const { user: authUser, isAuthenticated } = useAuth();
  const { data: tracks, isLoading: tracksLoading } = useWorks();
  const { toast } = useToast();
  const [followLoading, setFollowLoading] = useState(false);

  // Fetch the profile for the creator being viewed
  const creatorName = params?.name || authUser?.username || "";

  const { data: creatorProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profiles/by-username", creatorName],
    queryFn: async () => {
      if (!creatorName) return null;
      const res = await fetch(`/api/profiles/by-username/${encodeURIComponent(creatorName)}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!creatorName,
    retry: false,
  });

  // Check if current user is following this creator
  const { data: followStatus } = useQuery({
    queryKey: ["/api/profiles/follow-status", creatorProfile?.id],
    queryFn: async () => {
      if (!creatorProfile?.id) return { isFollowing: false };
      const res = await fetch(`/api/profiles/${creatorProfile.id}/follow`, { credentials: "include" });
      if (!res.ok) return { isFollowing: false };
      return res.json();
    },
    enabled: !!creatorProfile?.id && isAuthenticated,
    retry: false,
  });

  const isLoading = tracksLoading || profileLoading;
  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

  const creatorTracks = tracks?.filter(t => t.creatorName?.toLowerCase() === creatorName.toLowerCase()) || [];
  const totalVotes = creatorTracks.reduce((acc, t) => acc + (t.votes || 0), 0);
  const sortedTracks = [...(tracks || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const bestRank = creatorTracks.length > 0
    ? Math.min(...creatorTracks.map(ct => sortedTracks.findIndex(st => st.id === ct.id) + 1))
    : null;

  const followerCount = creatorProfile?.followerCount || 0;
  const isOwnProfile = authUser?.username?.toLowerCase() === creatorName.toLowerCase();
  const isFollowing = followStatus?.isFollowing || false;

  const handleFollow = async () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    if (!creatorProfile?.id) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await apiRequest("DELETE", `/api/profiles/${creatorProfile.id}/follow`);
      } else {
        await apiRequest("POST", `/api/profiles/${creatorProfile.id}/follow`);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/follow-status", creatorProfile.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/by-username", creatorName] });
      toast({
        title: isFollowing ? "UNFOLLOWED" : "FOLLOWING",
        description: isFollowing ? `You unfollowed ${creatorName}.` : `You are now following ${creatorName}.`,
      });
    } catch {
      toast({ title: "ERROR", description: "Failed to update follow status.", variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-2xl font-display font-bold text-primary uppercase">
                {creatorName?.[0] || "N"}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tighter uppercase">
                  {creatorName.toUpperCase()}
                </h1>
                {creatorProfile?.role === "nex" && (
                  <span className="text-[9px] font-bold uppercase tracking-widest border border-primary/40 text-primary px-2 py-0.5 rounded-sm">NEX</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                {creatorProfile?.country && (
                  <span className="text-[10px] text-zinc-600 uppercase tracking-widest">{creatorProfile.country}</span>
                )}
                {creatorProfile?.aiToolUsed && (
                  <span className="text-[10px] text-primary/60 uppercase tracking-widest">{creatorProfile.aiToolUsed}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {!isOwnProfile && creatorProfile?.role === "nex" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleFollow}
            disabled={followLoading}
            data-testid="button-follow"
            className={`flex items-center gap-2 px-6 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all ${
              isFollowing
                ? "bg-primary/10 border border-primary/40 text-primary hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400"
                : "bg-primary text-black border border-primary hover:brightness-110"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {followLoading ? "..." : isFollowing ? "FOLLOWING" : "FOLLOW"}
          </motion.button>
        )}
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm space-y-2 text-center">
          <div className="flex justify-center mb-1"><Music className="w-4 h-4 text-primary/60" /></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TRACKS</p>
          <p className="text-3xl font-display font-bold text-primary">{creatorTracks.length}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm space-y-2 text-center">
          <div className="flex justify-center mb-1"><TrendingUp className="w-4 h-4 text-primary/60" /></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TOTAL VOTES</p>
          <p className="text-3xl font-display font-bold text-primary">{totalVotes}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm space-y-2 text-center">
          <div className="flex justify-center mb-1"><Users className="w-4 h-4 text-primary/60" /></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">FOLLOWERS</p>
          <p className="text-3xl font-display font-bold text-primary">{followerCount}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm space-y-2 text-center">
          <div className="flex justify-center mb-1"><Trophy className="w-4 h-4 text-primary/60" /></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">BEST RANK</p>
          <p className="text-3xl font-display font-bold text-primary">
            {bestRank ? `#${bestRank}` : "-"}
          </p>
        </div>
      </div>

      {/* TRACK LIST */}
      <div className="space-y-6">
        <h3 className="text-xl font-display font-bold uppercase tracking-widest text-white border-b border-white/10 pb-4 flex items-center gap-3">
          <Music className="w-5 h-5 text-primary" /> TRACK LIST
        </h3>

        {creatorTracks.length > 0 ? (
          <div className="space-y-2">
            {creatorTracks
              .sort((a, b) => (b.votes || 0) - (a.votes || 0))
              .map((track, idx) => {
                const globalRank = sortedTracks.findIndex(st => st.id === track.id) + 1;
                return (
                  <Link key={track.id} href={`/track/${track.id}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="bg-[#0A0A0A] border border-white/5 p-5 rounded-sm flex justify-between items-center group hover:border-primary/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary/5 border border-white/5 rounded-sm flex items-center justify-center text-[10px] font-mono font-bold text-zinc-600">
                          {String(globalRank).padStart(2, "0")}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold uppercase text-white group-hover:text-primary transition-colors">{track.title}</h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">{track.aiTool} · {track.genre}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{track.votes}</p>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">VOTES</p>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
          </div>
        ) : (
          <div className="py-20 text-center border border-white/5 border-dashed rounded-sm">
            <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">No tracks yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
