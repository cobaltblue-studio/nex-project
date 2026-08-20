import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Music, Trophy, TrendingUp, MapPin, Edit3, Check, X, Heart, ImagePlus, Users, Zap } from "lucide-react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, type ChangeEvent } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { publicAudioChartSearchParams, isCreatorProfileRole } from "@shared/constants";
import { GuestCheerModal } from "@/components/GuestCheerModal";
import { TrackNewBadge } from "@/components/TrackNewBadge";

type BattleSummary = {
  trackId: number;
  trackTitle: string;
  trackCoverImageUrl: string | null;
  battleId: number;
  opponentTrackId: number;
  opponentTitle: string;
  opponentCoverImageUrl: string | null;
  myVotes: number;
  opponentVotes: number;
  iWon: boolean;
  createdAt: string;
};

const COUNTRY_OPTIONS = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Japan", "South Korea", "Brazil", "India", "Netherlands",
  "Sweden", "Norway", "Denmark", "Finland", "Spain", "Italy",
  "Mexico", "Argentina", "Colombia", "Nigeria", "South Africa",
  "Indonesia", "Thailand", "Philippines", "Vietnam", "Turkey",
  "Poland", "Ukraine", "Russia", "China", "Taiwan", "Singapore",
  "Malaysia", "New Zealand", "Ireland", "Belgium", "Austria",
  "Switzerland", "Portugal", "Czech Republic", "Romania", "Hungary",
  "Chile", "Peru", "Egypt", "Kenya", "Ghana", "Other",
];

export function ProfileMe() {
  const [matchMeRoute] = useRoute("/profile/me");
  const [, nameParams] = useRoute("/profile/:name");
  const { isAuthenticated } = useAuth();

  /** Official NEX TOP 100 — same filter as /music (`status=CHART`). */
  const { data: officialChart = [], isLoading: chartLoading } = useQuery<any[]>({
    queryKey: ["/api/tracks", "v3", "rankingScore", 100, "audio", "status-CHART", "profile-best-rank"],
    queryFn: async () => {
      const params = new URLSearchParams(publicAudioChartSearchParams(100, { status: "CHART" }));
      const res = await fetch(`/api/tracks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load chart");
      return res.json();
    },
  });
  const { toast } = useToast();
  const [followLoading, setFollowLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingAvatarDataUrl, setPendingAvatarDataUrl] = useState<string | null>(null);
  const [guestCheerOpen, setGuestCheerOpen] = useState(false);

  const { data: myProfile, isLoading: myProfileLoading } = useQuery({
    queryKey: ["/api/profiles/me"],
    queryFn: async () => {
      const res = await fetch("/api/profiles/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: battleSummaries = [] } = useQuery<BattleSummary[]>({
    queryKey: ["/api/tracks/my/battle-summaries"],
    queryFn: async () => {
      const res = await fetch("/api/tracks/my/battle-summaries", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!matchMeRoute && isAuthenticated && isCreatorProfileRole((myProfile as { role?: string } | null)?.role),
    retry: false,
  });

  const creatorName = matchMeRoute
    ? (myProfile?.username ?? "")
    : (nameParams?.name ?? "");

  const waitingForMyUsername =
    matchMeRoute && isAuthenticated && !(myProfile?.username ?? "") && myProfileLoading;

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

  const { data: profileTracks, isLoading: creatorTracksLoading } = useQuery<any[]>({
    queryKey: ["/api/profiles", creatorProfile?.id, "tracks"],
    queryFn: async () => {
      const res = await fetch(`/api/profiles/${creatorProfile!.id}/tracks`);
      if (!res.ok) throw new Error("Failed to load creator tracks");
      return res.json();
    },
    enabled: !!creatorProfile?.id,
    retry: false,
  });

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

  const creatorTracks = profileTracks ?? [];
  const artistAlias = ((creatorTracks.find((t: any) => typeof t?.creatorName === "string" && t.creatorName.trim()) as { creatorName?: string } | undefined)?.creatorName ?? "").trim();
  const displayName = artistAlias || creatorName;

  const chartRankByTrackId = useMemo(() => {
    const m = new Map<number, number>();
    for (let i = 0; i < officialChart.length; i += 1) {
      m.set(officialChart[i].id, i + 1);
    }
    return m;
  }, [officialChart]);

  const bestRank = useMemo(() => {
    let best: number | null = null;
    for (const t of creatorTracks) {
      const r = chartRankByTrackId.get(t.id);
      if (r != null && (best == null || r < best)) best = r;
    }
    return best;
  }, [creatorTracks, chartRankByTrackId]);

  const isLoading =
    waitingForMyUsername ||
    profileLoading ||
    chartLoading ||
    (!!creatorProfile?.id && creatorTracksLoading);
  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;

  const totalVotes = creatorTracks.reduce((acc, t) => acc + (t.votes || 0), 0);
  const totalLikes = creatorTracks.reduce((acc, t) => acc + (t.likesCount || 0), 0);
  const totalPlays = creatorTracks.reduce((acc, t) => acc + (t.playsCount || t.playCount || 0), 0);
  const totalBattleWins = creatorTracks.reduce((acc, t) => acc + (t.wins || 0), 0);

  const followerCount = creatorProfile?.followerCount || 0;
  const visibleBio = (() => {
    const raw = (creatorProfile?.bio ?? "").trim();
    if (!raw) return "";
    // Hide legacy auto-generated placeholders; only show creator-written intro.
    if (/^Auto-created from artistName:/i.test(raw)) return "";
    return raw;
  })();
  const isOwnProfile = myProfile?.username?.toLowerCase() === creatorName.toLowerCase();
  const isFollowing = followStatus?.isFollowing || false;

  const handleFollow = async () => {
    if (!isAuthenticated) {
      setGuestCheerOpen(true);
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
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      toast({
        title: isFollowing ? "UNFOLLOWED" : "FOLLOWING",
        description: isFollowing ? `You unfollowed ${displayName}.` : `You are now following ${displayName}.`,
      });
    } catch {
      toast({ title: "ERROR", description: "Failed to update follow status.", variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const startEditing = () => {
    setEditUsername(creatorProfile?.username || "");
    setEditCountry(creatorProfile?.country || "");
    setEditBio(creatorProfile?.bio || "");
    setPendingAvatarDataUrl(null);
    setIsEditingProfile(true);
  };

  const AVATAR_MAX = 500 * 1024;

  const onAvatarFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Choose an image file.", variant: "destructive" });
      return;
    }
    if (f.size > AVATAR_MAX) {
      toast({ title: "Too large", description: "Profile image must be 500KB or less.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingAvatarDataUrl(String(reader.result));
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const cancelEditing = () => {
    setIsEditingProfile(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiRequest("PATCH", "/api/profiles/me", {
        username: editUsername || creatorProfile?.username || "",
        country: editCountry || null,
        bio: editBio || null,
        ...(pendingAvatarDataUrl != null ? { avatarUrl: pendingAvatarDataUrl } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/by-username", creatorName] });
      queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
      toast({ title: "PROFILE UPDATED", description: "Your profile has been saved." });
      setIsEditingProfile(false);
    } catch (err: any) {
      const raw = typeof err?.message === "string" ? err.message : "";
      const detail = raw.replace(/^\d+\s*:\s*/, "").trim();
      toast({
        title: "ERROR",
        description: detail || "Failed to save profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <GuestCheerModal open={guestCheerOpen} onOpenChange={setGuestCheerOpen} />
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden mt-3">
              {creatorProfile?.avatarUrl ? (
                <img src={creatorProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-display font-bold text-primary uppercase">
                  {creatorName?.[0] || "N"}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white tracking-tighter uppercase neon-text-strong neon-text-green">
                  {displayName.toUpperCase()}
                </h1>
                {isCreatorProfileRole(creatorProfile?.role) && (
                  <span className="text-[9px] font-bold uppercase tracking-widest border border-primary/40 text-primary px-2 py-0.5 rounded-sm shrink-0">CREATOR</span>
                )}
                {!isOwnProfile && isCreatorProfileRole(creatorProfile?.role) && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFollow}
                    disabled={followLoading}
                    data-testid="button-follow-inline"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                      isFollowing
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "bg-primary/15 border-primary/50 text-primary hover:bg-primary/25"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFollowing ? "fill-current" : ""}`} />
                    {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
                  </motion.button>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1">
                {creatorProfile?.country && (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-600 uppercase tracking-widest">
                    <MapPin className="w-3 h-3" />
                    {creatorProfile.country}
                  </span>
                )}
                {creatorProfile?.aiToolUsed && (
                  <span className="text-[10px] text-primary/60 uppercase tracking-widest">{creatorProfile.aiToolUsed}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOwnProfile && isAuthenticated && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startEditing}
              data-testid="button-edit-profile"
              className="flex items-center gap-2 px-4 py-2.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border border-white/10 text-zinc-400 hover:text-primary hover:border-primary/40 transition-all self-start mt-3"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-white/5 p-5 rounded-sm space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Who am I
        </p>
        {visibleBio ? (
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {visibleBio}
          </p>
        ) : null}
      </div>

      {/* EDIT PROFILE FORM */}
      {isEditingProfile && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0A0A0A] border border-primary/20 p-6 rounded-sm space-y-5"
          data-testid="section-edit-profile"
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-primary" />
            Edit Profile
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                Username
              </label>
              <input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                data-testid="input-username"
                placeholder="3-24 chars: a-z, 0-9, _"
                className="w-full bg-black border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white focus:border-primary/40 focus:outline-none transition-colors"
              />
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-1">
                lowercase letters, numbers, underscore only
              </p>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                Profile image (max 500KB)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border border-white/10 overflow-hidden bg-black/40 flex items-center justify-center shrink-0">
                  {(pendingAvatarDataUrl || creatorProfile?.avatarUrl) ? (
                    <img src={pendingAvatarDataUrl || creatorProfile?.avatarUrl || ""} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-6 h-6 text-zinc-600" />
                  )}
                </div>
                <label className="cursor-pointer text-[10px] font-bold uppercase tracking-widest px-4 py-2 border border-white/15 rounded-sm text-zinc-400 hover:text-primary hover:border-primary/40 transition-colors">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={onAvatarFile} data-testid="input-avatar" />
                </label>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                Country
              </label>
              <select
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value)}
                data-testid="select-country"
                className="w-full bg-black border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white focus:border-primary/40 focus:outline-none transition-colors"
              >
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                Bio
              </label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                data-testid="input-bio"
                placeholder="Tell the world about your music..."
                rows={3}
                className="w-full bg-black border border-white/10 rounded-sm px-3 py-2.5 text-sm text-white focus:border-primary/40 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveProfile}
              disabled={saving}
              data-testid="button-save-profile"
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-bold text-[10px] uppercase tracking-widest rounded-sm hover:brightness-110 transition-all disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={cancelEditing}
              data-testid="button-cancel-edit"
              className="flex items-center gap-2 px-5 py-2.5 border border-white/10 text-zinc-400 font-bold text-[10px] uppercase tracking-widest rounded-sm hover:text-white hover:border-white/30 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
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
          <div className="flex justify-center mb-1"><Heart className="w-4 h-4 text-primary/60" /></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TOTAL LIKES</p>
          <p className="text-3xl font-display font-bold text-primary">{totalLikes}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm space-y-2 text-center">
          <div className="flex justify-center mb-1"><TrendingUp className="w-4 h-4 text-primary/60" /></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TOTAL PLAYS</p>
          <p className="text-3xl font-display font-bold text-primary">{totalPlays}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm space-y-2 text-center">
          <div className="flex justify-center mb-1"><Users className="w-4 h-4 text-primary/60" /></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">FOLLOWERS</p>
          <p className="text-3xl font-display font-bold text-primary">{followerCount}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm space-y-2 text-center">
          <div className="flex justify-center mb-1"><Zap className="w-4 h-4 text-primary/60" /></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">BATTLE WINS</p>
          <p className="text-3xl font-display font-bold text-primary">{totalBattleWins}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm space-y-2 text-center">
          <div className="flex justify-center mb-1"><Trophy className="w-4 h-4 text-primary/60" /></div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">BEST RANK</p>
          <p className="text-3xl font-display font-bold text-primary">
            {bestRank ? `#${bestRank}` : "-"}
          </p>
        </div>
      </div>

      {/* Creator battle snapshot (own profile only) */}
      {matchMeRoute && isCreatorProfileRole(myProfile?.role) && battleSummaries.length > 0 ? (
        <div className="rounded-sm border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-transparent p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2">
                <Zap className="w-4 h-4" /> Battle pulse
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-xl">
                Your latest arena matchups: vote bar shows listener battle votes for each side (updates as the community votes).
              </p>
            </div>
            <Link
              href="/battle"
              className="text-[10px] font-bold uppercase tracking-widest text-primary border border-primary/35 px-3 py-2 rounded-sm hover:bg-primary/10 transition-colors shrink-0"
            >
              Open arena →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {battleSummaries.map((b) => {
              const totalVotes = b.myVotes + b.opponentVotes;
              const myPct = totalVotes > 0 ? Math.round((b.myVotes / totalVotes) * 100) : 50;
              const leader = b.opponentVotes === b.myVotes ? "tie" : b.myVotes > b.opponentVotes ? "you" : "opp";
              return (
                <div
                  key={`${b.battleId}-${b.trackId}`}
                  className="border border-white/10 rounded-sm bg-black/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                      Match · battle #{b.battleId}
                    </span>
                    {leader === "you" ? (
                      <span className="text-[9px] font-black uppercase text-primary">Leading</span>
                    ) : leader === "opp" ? (
                      <span className="text-[9px] font-black uppercase text-zinc-500">Trailing</span>
                    ) : (
                      <span className="text-[9px] font-black uppercase text-zinc-500">Tied</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-sm overflow-hidden bg-zinc-900 shrink-0 border border-primary/20">
                      {b.trackCoverImageUrl ? (
                        <img src={b.trackCoverImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-6 h-6 text-zinc-700 m-auto mt-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/track/${b.trackId}`} className="text-sm font-bold text-white hover:text-primary line-clamp-2">
                        {b.trackTitle}
                      </Link>
                      <p className="text-[10px] text-primary font-mono mt-1">{b.myVotes} votes</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden flex border border-white/5">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${myPct}%` }}
                    />
                    <div className="bg-zinc-600 h-full flex-1 min-w-0" />
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="w-11 h-11 rounded-sm overflow-hidden bg-zinc-900 shrink-0 border border-white/10">
                      {b.opponentCoverImageUrl ? (
                        <img src={b.opponentCoverImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-5 h-5 text-zinc-700 m-auto mt-3" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/track/${b.opponentTrackId}`} className="text-xs font-semibold text-zinc-300 hover:text-white line-clamp-2">
                        {b.opponentTitle}
                      </Link>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{b.opponentVotes} votes</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

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
                const chartRank = chartRankByTrackId.get(track.id);
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
                          {chartRank != null ? String(chartRank).padStart(2, "0") : "—"}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold uppercase text-white group-hover:text-primary transition-colors">
                            <TrackNewBadge createdAt={(track as { createdAt?: string }).createdAt} testId={`badge-new-${track.id}`} className="mr-1.5 align-middle" />
                            {track.title}
                          </h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">{track.aiTool} · {track.genre}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[11px] font-bold text-white">{track.votes} <span className="text-[9px] text-zinc-600">votes</span></p>
                        <p className="text-[11px] font-bold text-white">{track.likesCount ?? 0} <span className="text-[9px] text-zinc-600">likes</span></p>
                        <p className="text-[11px] font-bold text-white">{track.playsCount ?? track.playCount ?? 0} <span className="text-[9px] text-zinc-600">plays</span></p>
                        <p className="text-[11px] font-bold text-white">{track.wins ?? 0} <span className="text-[9px] text-zinc-600">wins</span></p>
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
