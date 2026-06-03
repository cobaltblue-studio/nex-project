import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, User, Trophy, Headphones, MapPin, Heart, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { hasPublicCount } from "@/lib/displayStats";
import { useTranslation } from "react-i18next";
import type { MouseEvent } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GuestCheerModal } from "@/components/GuestCheerModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CreatorDirectoryRow {
  id: number;
  username: string;
  country?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  displayName: string;
  totalTracks: number;
  totalPlays: number;
  totalLikes: number;
  battleWins: number;
  battleTotal: number;
  popularityScore: number;
  featuredTrackTitle: string | null;
}

function initialsFromUsername(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "NX";
}

function CreatorFollowChip({
  creatorId,
  username,
}: {
  creatorId: number;
  username: string;
}) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [guestOpen, setGuestOpen] = useState(false);

  const { data: followState } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["/api/profiles", String(creatorId), "follow"],
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const followMutation = useMutation({
    mutationFn: (follow: boolean) =>
      follow
        ? apiRequest("POST", `/api/profiles/${creatorId}/follow`, {})
        : apiRequest("DELETE", `/api/profiles/${creatorId}/follow`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/profiles", String(creatorId), "follow"] });
    },
    onError: () => {
      toast({ title: t("creators.followFailed"), variant: "destructive" });
    },
  });

  const isFollowing = followState?.isFollowing ?? false;

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setGuestOpen(true);
      return;
    }
    followMutation.mutate(!isFollowing);
  };

  return (
    <>
      <GuestCheerModal open={guestOpen} onOpenChange={setGuestOpen} />
      <button
        type="button"
        onClick={onClick}
        disabled={followMutation.isPending}
        className="text-[7px] font-bold uppercase tracking-widest text-zinc-500 hover:text-pink-400 border border-white/10 px-1.5 py-0.5 rounded-sm shrink-0"
        data-testid={`button-follow-creator-${creatorId}`}
        title={isFollowing ? `Unfollow @${username}` : `Follow @${username}`}
      >
        {isFollowing ? t("creators.following") : t("creators.follow")}{" "}
        <Heart className={`inline w-2.5 h-2.5 ml-0.5 -mt-0.5 ${isFollowing ? "fill-pink-400 text-pink-400" : ""}`} />
      </button>
    </>
  );
}

export function CreatorList() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: directory, isLoading } = useQuery<CreatorDirectoryRow[]>({
    queryKey: ["/api/creators/directory", "v3"],
    queryFn: async () => {
      const res = await fetch("/api/creators/directory", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch creators");
      return res.json();
    },
    staleTime: 60_000,
  });

  const creatorsWithTracks = useMemo(
    () => (directory ?? []).filter((c) => c.totalTracks > 0),
    [directory],
  );

  const filteredCreators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return creatorsWithTracks;
    return creatorsWithTracks.filter((creator) => {
      const name = creator.displayName.toLowerCase();
      const username = creator.username.toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [creatorsWithTracks, searchQuery]);

  const totalTrackCount = useMemo(
    () => creatorsWithTracks.reduce((sum, c) => sum + c.totalTracks, 0),
    [creatorsWithTracks],
  );

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
            {t("creators.label")}
          </h1>
        </div>
        <h2
          className="text-3xl md:text-4xl font-display font-bold text-white tracking-tight uppercase neon-text-strong neon-text-green"
          data-testid="text-creators-title"
        >
          {t("creators.title")}
        </h2>
        <p className="text-zinc-500 text-sm mt-2">
          {t("creators.directorySub", {
            tracks: totalTrackCount,
            count: creatorsWithTracks.length,
          })}
        </p>
        <div className="mt-5 max-w-xl">
          <label htmlFor="creator-search" className="sr-only">
            Search creators
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              id="creator-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by creator name or @username"
              className="w-full bg-black/40 border border-white/10 rounded-sm pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/50 transition-colors"
              data-testid="input-creator-search"
            />
          </div>
        </div>
      </div>

      <div className="creators-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-5">
        {filteredCreators.map((creator, idx) => (
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
            className={`premium-card creator-card p-4 pt-[15px] cursor-pointer group h-full flex flex-col items-center text-center gap-3 creator-card-overflow min-h-[160px] col-span-1 ${
              !hasPublicCount(creator.totalPlays) ? "opacity-80" : ""
            }`}
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
                  {initialsFromUsername(creator.displayName)}
                </span>
              )}
            </div>

            <div className="text-center min-w-0 w-full flex flex-col items-center gap-1.5">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 w-full min-w-0">
                <h3
                  className="text-sm font-display font-bold text-white uppercase truncate group-hover:text-primary transition-premium min-w-0 max-w-full"
                  data-testid={`text-creator-name-${creator.id}`}
                >
                  {creator.displayName}
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
                <p className="text-xs font-bold text-white flex items-center justify-center gap-0.5" data-testid={`text-creator-plays-${creator.id}`}>
                  <Headphones className="w-3 h-3 text-zinc-500" />
                  {hasPublicCount(creator.totalPlays) ? creator.totalPlays.toLocaleString() : t("creators.statHidden")}
                </p>
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest">{t("creators.plays")}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white flex items-center justify-center gap-0.5" data-testid={`text-creator-likes-${creator.id}`}>
                  <Heart className="w-3 h-3 text-pink-400/70" />
                  {hasPublicCount(creator.totalLikes) ? creator.totalLikes.toLocaleString() : t("creators.statHidden")}
                </p>
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest">{t("creators.likes")}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-primary flex items-center justify-center gap-0.5" data-testid={`text-creator-wins-${creator.id}`}>
                  <Trophy className="w-3 h-3 text-primary/50" />
                  {hasPublicCount(creator.battleWins) ? creator.battleWins.toLocaleString() : t("creators.statHidden")}
                </p>
                <p className="text-[8px] text-zinc-600 uppercase tracking-widest">{t("creators.battleWins")}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {filteredCreators.length === 0 && (
        <div className="text-center py-10 text-zinc-500 text-sm" data-testid="text-no-creator-results">
          No creators found for "{searchQuery.trim()}".
        </div>
      )}
    </div>
  );
}
