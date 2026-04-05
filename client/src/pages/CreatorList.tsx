import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, User, Music, Trophy, Headphones, MapPin, Heart } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GuestCheerModal } from "@/components/GuestCheerModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TrackData {
  id: number;
  title: string;
  creatorName: string;
  creatorId: number;
  playCount: number;
  rankingScore: number;
  winRate?: number;
}

interface CreatorProfileRow {
  id: number;
  username: string;
  country?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

interface CreatorCardModel {
  id: number;
  username: string;
  displayLabel: string;
  totalTracks: number;
  totalPlays: number;
  featuredTrack: string;
  avgWinRate: number;
  initials: string;
  country?: string | null;
  avatarUrl?: string | null;
}

function initialsFromUsername(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "NX";
}

function CreatorFollowChip({ creatorId, username }: { creatorId: number; username: string }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [guestCheerOpen, setGuestCheerOpen] = useState(false);

  const { data: followStatus } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["/api/profiles/follow-status", creatorId],
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${creatorId}/follow`, { credentials: "include" });
      if (res.status === 401) return { isFollowing: false };
      if (!res.ok) return { isFollowing: false };
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const followMutation = useMutation({
    mutationFn: async (nextFollow: boolean) => {
      if (nextFollow) {
        await apiRequest("POST", `/api/profiles/${creatorId}/follow`, {});
      } else {
        await apiRequest("DELETE", `/api/profiles/${creatorId}/follow`);
      }
    },
    onSuccess: (_, nextFollow) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/follow-status", creatorId] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/by-username"] });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      toast({
        title: nextFollow ? "Followed" : "Unfollowed",
        description: `@${username}`,
      });
    },
    onError: () => {
      toast({ title: "Login required", description: "You need to log in to follow creators.", variant: "destructive" });
    },
  });

  const isFollowing = followStatus?.isFollowing === true;
  const busy = followMutation.isPending;

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setGuestCheerOpen(true);
      return;
    }
    followMutation.mutate(!isFollowing);
  };

  return (
    <>
    <GuestCheerModal open={guestCheerOpen} onOpenChange={setGuestCheerOpen} />
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      data-testid={`button-follow-creator-${creatorId}`}
      className={[
        "shrink-0 text-[8px] font-black uppercase tracking-[0.12em] px-2 py-1 rounded-sm border transition-premium",
        isFollowing
          ? "text-pink-300 border-pink-400/50 bg-pink-500/10"
          : "text-zinc-400 border-white/15 bg-black/40 hover:text-primary hover:border-primary/40",
      ].join(" ")}
      title={isAuthenticated ? (isFollowing ? "Unfollow" : "Follow") : "Log in to follow"}
    >
      Follow <Heart className={`inline w-2.5 h-2.5 ml-0.5 -mt-0.5 ${isFollowing ? "fill-pink-400 text-pink-400" : ""}`} />
    </button>
    </>
  );
}

export function CreatorList() {
  const [, navigate] = useLocation();
  const { data: creatorProfiles, isLoading: creatorsLoading } = useQuery<CreatorProfileRow[]>({
    queryKey: ["/api/creators"],
    queryFn: async () => {
      const res = await fetch("/api/creators", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch creators");
      return res.json();
    },
  });

  const { data: tracks, isLoading: tracksLoading } = useQuery<TrackData[]>({
    queryKey: ["/api/tracks", "rankingScore", "creator-rollup", "all-types"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("sortBy", "rankingScore");
      params.set("limit", "500");
      const res = await fetch(`/api/tracks?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tracks");
      return res.json();
    },
  });

  const creators = useMemo(() => {
    if (!creatorProfiles?.length) return [];
    const byId = new Map<number, CreatorCardModel>();

    for (const p of creatorProfiles) {
      const label = p.username || "CREATOR";
      byId.set(p.id, {
        id: p.id,
        username: p.username,
        displayLabel: label,
        totalTracks: 0,
        totalPlays: 0,
        featuredTrack: "—",
        avgWinRate: 0,
        initials: initialsFromUsername(label),
        country: p.country ?? null,
        avatarUrl: p.avatarUrl ?? null,
      });
    }

    if (tracks?.length) {
      for (const track of tracks) {
        const row = byId.get(track.creatorId);
        if (!row) continue;
        // Prefer the artist alias used on tracks so founders/admin can find creators by stage name.
        const alias = (track.creatorName || "").trim();
        if (alias && row.displayLabel === row.username) {
          row.displayLabel = alias;
          row.initials = initialsFromUsername(alias);
        }
        if (row.totalTracks === 0) {
          row.featuredTrack = track.title;
        }
        row.totalTracks += 1;
        row.totalPlays += track.playCount || 0;
        // Phase 4: creator-facing battle / chart stats flattened to 0
        row.avgWinRate = 0;
      }
    }

    return Array.from(byId.values()).sort((a, b) =>
      a.displayLabel.localeCompare(b.displayLabel, undefined, { sensitivity: "base" }),
    );
  }, [creatorProfiles, tracks]);

  const isLoading = creatorsLoading || tracksLoading;
  const totalTrackCount = tracks?.length ?? 0;

  if (isLoading) {
    return (
      <div className="p-20 flex justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-24">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <User className="w-5 h-5 text-primary" />
          <h1
            className="text-[11px] font-bold tracking-[0.4em] uppercase text-primary"
            data-testid="text-creators-label"
          >
            Creators
          </h1>
        </div>
        <h2
          className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green"
          data-testid="text-creators-title"
        >
          NEX CREATORS
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          Track-mapped directory ({totalTrackCount} tracks / {creators.length} creators)
        </p>
      </div>

      <div className="creators-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-5">
        {creators.map((creator, idx) => (
          <motion.div
            key={creator.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.02, 0.8) }}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/profile/${encodeURIComponent(creator.username.toLowerCase())}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/profile/${encodeURIComponent(creator.username.toLowerCase())}`);
              }
            }}
            className="premium-card creator-card p-4 pt-[15px] cursor-pointer group h-full flex flex-col items-center text-center gap-3 creator-card-overflow min-h-[160px] col-span-1"
            style={{ backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.1)", transition: "transform 0.3s ease-in-out", boxSizing: "border-box" }}
            whileHover={{ scale: 1.03 }}
            data-testid={`card-creator-${creator.id}`}
          >
            <div
              className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary/20 transition-premium shrink-0 overflow-hidden"
            >
              {creator.avatarUrl ? (
                <img src={creator.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-display font-bold" data-testid={`text-creator-initials-${creator.id}`}>
                  {creator.initials}
                </span>
              )}
            </div>

            <div className="text-center min-w-0 w-full flex flex-col items-center gap-1.5">
              <div className="flex items-center justify-center gap-2 w-full min-w-0">
                <h3
                  className="text-sm font-display font-bold text-white uppercase truncate group-hover:text-primary transition-premium min-w-0"
                  data-testid={`text-creator-name-${creator.id}`}
                >
                  {creator.displayLabel}
                </h3>
                <CreatorFollowChip creatorId={creator.id} username={creator.username} />
              </div>
              {creator.country && (
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-zinc-600" />
                  <span
                    className="text-[10px] text-zinc-500 uppercase tracking-widest"
                    data-testid={`text-creator-country-${creator.id}`}
                  >
                    {creator.country}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 w-full pt-2 border-t border-white/5">
              <div className="text-center">
                <p className="text-xs font-bold text-white flex items-center justify-center gap-0.5" data-testid={`text-creator-tracks-${creator.id}`}>
                  <Music className="w-3 h-3 text-primary/50" />
                  {creator.totalTracks}
                </p>
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest">Tracks</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white flex items-center justify-center gap-0.5" data-testid={`text-creator-plays-${creator.id}`}>
                  <Headphones className="w-3 h-3 text-zinc-500" />
                  {creator.totalPlays.toLocaleString()}
                </p>
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest">Plays</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-primary flex items-center justify-center gap-0.5" data-testid={`text-creator-winrate-${creator.id}`}>
                  <Trophy className="w-3 h-3 text-primary/50" />
                  {Math.round(creator.avgWinRate)}%
                </p>
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest">Win Rate</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
