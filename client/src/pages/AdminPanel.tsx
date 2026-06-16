import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, CheckCircle, XCircle, ExternalLink,
  Clock, RefreshCw, Loader2, UserPlus, Handshake, Trash2, BarChart3, AlertTriangle,
  Download, Database, FileJson, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

type Submission = {
  id: number;
  title: string;
  creatorName: string;
  genre: string;
  trackLink: string;
  portfolioLink?: string | null;
  status: "PENDING" | "SUBMITTED" | "BATTLE_POOL" | "REJECTED" | "CHART" | "MV";
  createdAt: string;
};

type CreatorApplication = {
  profileId: number;
  username: string;
  email: string | null;
  country: string | null;
  aiToolUsed: string | null;
  bio: string | null;
  userId: string;
};

type TrackClaimRequest = {
  id: number;
  trackId: number;
  trackTitle: string;
  requesterProfileId: number;
  requesterUsername: string;
  createdAt: string;
};

type TrackEditRequest = {
  commentId: number;
  trackId: number;
  trackTitle: string;
  requesterUsername: string | null;
  detail: string;
  proposedLink: string | null;
  createdAt: string;
};

type AdminInsights = {
  generatedAt: string;
  totals: {
    creators: number;
    /** Present after server deploy; old API omit → UI shows "—". */
    userSignups?: number;
    tracks: number;
    tracksApproved: number;
    tracksPending: number;
    tracksChart: number;
    plays: number;
    likes: number;
    listenerVotes: number;
    battles: number;
    battleWins: number;
    activeBoosts: number;
  };
  today: {
    newTracks: number;
    newUserSignups?: number;
    plays: number;
    votes: number;
    battles: number;
  };
};

type UserActivityRow = {
  userId: string;
  email: string | null;
  username: string | null;
  role: string | null;
  lastLoginAt: string | null;
  lastVisitAt: string | null;
  visitCount: number;
  tracksPlayedCount: number;
  battleVoteCount: number;
  signedUpAt: string | null;
  activityStatus: "active" | "inactive";
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  SUBMITTED:   "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  BATTLE_POOL: "text-primary   bg-primary/10   border-primary/30",
  REJECTED:    "text-red-400   bg-red-400/10   border-red-400/30",
  CHART:       "text-purple-400 bg-purple-400/10 border-purple-400/30",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border ${STATUS_COLORS[status] ?? "text-zinc-500 bg-zinc-500/10 border-zinc-500/30"}`}>
      {status}
    </span>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminPanel() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [claimableTrackId, setClaimableTrackId] = useState("");
  const [deactivateUsername, setDeactivateUsername] = useState("");
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);

  const isAdmin = user?.role === "admin";

  async function downloadAdminCsv(path: string, key: string) {
    setExportBusy(key);
    try {
      const res = await fetch(path, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(dispo);
      const filename = match?.[1] ?? `nex-export-${key}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("adminPanel.exportOk"), description: filename });
    } catch (e) {
      toast({
        title: t("adminPanel.exportFail"),
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setExportBusy(null);
    }
  }

  async function downloadDataDictionary() {
    setExportBusy("dictionary");
    try {
      const res = await fetch("/api/admin/export/data-dictionary.json", { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nex-data-dictionary-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("adminPanel.exportOk"), description: "data-dictionary.json" });
    } catch (e) {
      toast({
        title: t("adminPanel.exportFail"),
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setExportBusy(null);
    }
  }

  async function pushB2bWebhook() {
    setExportBusy("webhook");
    try {
      const res = await apiRequest("POST", "/api/admin/export/b2b/push-webhook", {});
      const out = (await res.json()) as { ok?: boolean; status?: number; counts?: Record<string, number> };
      toast({
        title: out.ok ? t("adminPanel.webhookOk") : t("adminPanel.webhookFail"),
        description: out.counts ? `plays ${out.counts.plays ?? 0}` : String(out.status ?? ""),
      });
    } catch (e) {
      toast({
        title: t("adminPanel.webhookFail"),
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setExportBusy(null);
    }
  }

  async function captureSnapshotNow() {
    setSnapshotBusy(true);
    try {
      const res = await apiRequest("POST", "/api/admin/snapshots/capture", {});
      const out = (await res.json()) as { trackRows?: number; snapshotDate?: string };
      toast({
        title: t("adminPanel.snapshotOk"),
        description: `${out.snapshotDate ?? "—"} · ${out.trackRows ?? 0} tracks`,
      });
      void refetchSnapshotStatus();
    } catch (e) {
      toast({
        title: t("adminPanel.snapshotFail"),
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSnapshotBusy(false);
    }
  }

  // Redirect guests and non-admin roles away from /admin
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user || user.role !== "admin") {
      setLocation("/");
    }
  }, [isAuthenticated, authLoading, user, setLocation]);

  // --- Step 2: load submissions only when confirmed admin ---
  const {
    data: snapshotStatus,
    refetch: refetchSnapshotStatus,
  } = useQuery<{
    lastTrackSnapshotDate: string | null;
    lastPlatformSnapshotDate: string | null;
    trackSnapshotDays: number;
  }>({
    queryKey: ["/api/admin/snapshots/status"],
    enabled: isAdmin,
    retry: false,
  });

  const {
    data: insights,
    isLoading: insightsLoading,
    refetch: refetchInsights,
  } = useQuery<AdminInsights>({
    queryKey: ["/api/admin/insights"],
    enabled: isAdmin,
    retry: false,
    staleTime: 0,
  });

  const {
    data: userActivity,
    isLoading: userActivityLoading,
    refetch: refetchUserActivity,
  } = useQuery<UserActivityRow[]>({
    queryKey: ["/api/admin/user-activity"],
    enabled: isAdmin,
    retry: false,
    staleTime: 0,
  });

  const {
    data: submissions,
    isLoading: subsLoading,
    refetch,
  } = useQuery<Submission[]>({
    queryKey: ["/api/admin/submissions"],
    enabled: isAdmin,
    retry: false,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("POST", `/api/admin/tracks/${id}/review`, { status }).then((r) => r.json()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      void qc.invalidateQueries({ queryKey: ["/api/admin/insights"] });
    },
  });

  const {
    data: creatorApplications,
    isLoading: creatorAppsLoading,
    refetch: refetchCreatorApps,
  } = useQuery<CreatorApplication[]>({
    queryKey: ["/api/admin/creator-applications"],
    enabled: isAdmin,
    retry: false,
  });

  const approveCreatorMutation = useMutation({
    mutationFn: (profileId: number) =>
      apiRequest("POST", `/api/admin/profiles/${profileId}/approve-creator`, {}).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/creator-applications"] });
    },
  });

  const rejectCreatorMutation = useMutation({
    mutationFn: (profileId: number) =>
      apiRequest("POST", `/api/admin/profiles/${profileId}/reject-creator`, {}).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/creator-applications"] });
    },
  });

  const deactivateCreatorMutation = useMutation({
    mutationFn: (username: string) =>
      apiRequest("POST", "/api/admin/creators/deactivate", { username }).then((r) => r.json()),
    onSuccess: (out: { archivedTrackCount?: number }) => {
      setDeactivateUsername("");
      toast({
        title: "Creator deactivated",
        description: `Archived tracks: ${out?.archivedTrackCount ?? 0}`,
      });
      void qc.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      void qc.invalidateQueries({ queryKey: ["/api/admin/insights"] });
      void qc.invalidateQueries({ queryKey: ["/api/creators"] });
    },
    onError: (e: Error) =>
      toast({ title: "Deactivate failed", description: e.message, variant: "destructive" }),
  });

  const {
    data: trackClaimRequests,
    isLoading: claimReqLoading,
    refetch: refetchClaimReq,
  } = useQuery<TrackClaimRequest[]>({
    queryKey: ["/api/admin/track-claim-requests"],
    enabled: isAdmin,
    retry: false,
  });

  const {
    data: trackEditRequests,
    isLoading: editReqLoading,
    refetch: refetchEditReq,
  } = useQuery<TrackEditRequest[]>({
    queryKey: ["/api/admin/track-edit-requests"],
    enabled: isAdmin,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const approveClaimMutation = useMutation({
    mutationFn: (requestId: number) =>
      apiRequest("POST", `/api/admin/track-claim-requests/${requestId}/approve`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["/api/admin/track-claim-requests"] });
      toast({ title: "Ownership transfer approved" });
    },
    onError: (e: Error) =>
      toast({ title: "Approve failed", description: e.message, variant: "destructive" }),
  });

  const rejectClaimMutation = useMutation({
    mutationFn: (requestId: number) =>
      apiRequest("POST", `/api/admin/track-claim-requests/${requestId}/reject`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["/api/admin/track-claim-requests"] });
      toast({ title: "Request rejected" });
    },
    onError: (e: Error) =>
      toast({ title: "Reject failed", description: e.message, variant: "destructive" }),
  });

  const dismissEditRequestMutation = useMutation({
    mutationFn: (commentId: number) => apiRequest("DELETE", `/api/admin/track-edit-requests/${commentId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["/api/admin/track-edit-requests"] });
      toast({
        title: i18n.t("admin.dismissOkTitle"),
        description: i18n.t("admin.dismissOkDesc"),
      });
    },
    onError: (e: Error) =>
      toast({ title: i18n.t("admin.deleteFailTitle"), description: e.message, variant: "destructive" }),
  });

  const setClaimableMutation = useMutation({
    mutationFn: (body: { trackId: number; claimable: boolean }) =>
      apiRequest("PATCH", `/api/admin/tracks/${body.trackId}/claimable`, {
        claimable: body.claimable,
      }),
    onSuccess: () => {
      setClaimableTrackId("");
      toast({ title: "Track updated", description: "Creators can now request ownership on that track page." });
    },
    onError: (e: Error) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const isAwaitingReview = (s: Submission) => s.status === "PENDING" || s.status === "SUBMITTED";
  const pending   = submissions?.filter(isAwaitingReview)   ?? [];
  const processed = submissions?.filter((s) => !isAwaitingReview(s))   ?? [];

  // ---- Render: loading ----
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    );
  }

  // ---- Render: not logged in ----
  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <ShieldCheck className="w-10 h-10 text-zinc-700 mx-auto mb-4" strokeWidth={1} />
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-4">
          Login required
        </p>
        <a
          href={`/auth?returnTo=${encodeURIComponent("/admin")}`}
          className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          Sign in
        </a>
      </div>
    );
  }

  // ---- Render: not admin (redirect is in flight via useEffect) ----
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    );
  }

  // ---- Render: full admin panel ----
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary/60 mb-1">NEX Platform</p>
          <h1 data-testid="heading-admin-panel" className="text-2xl font-black uppercase tracking-[0.15em] text-white neon-text-green">
            Admin Panel
          </h1>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1">
            Track submission review · Creator applications
          </p>
        </div>
        <button
          onClick={() => {
            void refetchInsights();
            void refetchUserActivity();
            void refetch();
            void refetchCreatorApps();
            void refetchClaimReq();
            void refetchEditReq();
          }}
          data-testid="button-refresh"
          className="p-2 border border-white/10 rounded-sm text-zinc-500 hover:text-primary hover:border-primary/30 transition-all"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-4 h-4 text-emerald-300" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
            Platform Insights
          </p>
        </div>
        <div>
            {insightsLoading || !insights ? (
              <div className="border border-white/5 rounded-sm p-8 flex justify-center">
                <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
              </div>
            ) : (
              <>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">
                  Snapshot: {fmt(insights.generatedAt)}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  <div className="border border-white/5 rounded-sm p-3 bg-black/20"><p className="text-[9px] text-zinc-500 uppercase">Creators</p><p className="text-xl font-black text-white">{insights.totals.creators}</p></div>
                  <div className="border border-white/5 rounded-sm p-3 bg-black/20"><p className="text-[9px] text-zinc-500 uppercase">Total signups</p><p className="text-xl font-black text-white">{insights.totals.userSignups ?? "—"}</p><p className="text-[8px] text-zinc-600 mt-1 leading-normal">Real accounts · excl. admin/founder/nex, auto seed/artist rows</p></div>
                  <div className="border border-white/5 rounded-sm p-3 bg-black/20"><p className="text-[9px] text-zinc-500 uppercase">Tracks</p><p className="text-xl font-black text-white">{insights.totals.tracks}</p></div>
                  <div className="border border-white/5 rounded-sm p-3 bg-black/20"><p className="text-[9px] text-zinc-500 uppercase">Approved / Chart</p><p className="text-xl font-black text-white">{insights.totals.tracksApproved} / {insights.totals.tracksChart}</p></div>
                  <div className="border border-white/5 rounded-sm p-3 bg-black/20"><p className="text-[9px] text-zinc-500 uppercase">Pending</p><p className="text-xl font-black text-white">{insights.totals.tracksPending}</p></div>
                  <div className="border border-white/5 rounded-sm p-3 bg-black/20"><p className="text-[9px] text-zinc-500 uppercase">Total Plays</p><p className="text-xl font-black text-white">{insights.totals.plays}</p></div>
                  <div className="border border-white/5 rounded-sm p-3 bg-black/20"><p className="text-[9px] text-zinc-500 uppercase">Likes / Votes</p><p className="text-xl font-black text-white">{insights.totals.likes} / {insights.totals.listenerVotes}</p></div>
                  <div className="border border-white/5 rounded-sm p-3 bg-black/20"><p className="text-[9px] text-zinc-500 uppercase">Battles / Wins</p><p className="text-xl font-black text-white">{insights.totals.battles} / {insights.totals.battleWins}</p></div>
                  <div className="border border-white/5 rounded-sm p-3 bg-black/20"><p className="text-[9px] text-zinc-500 uppercase">Active Boosts</p><p className="text-xl font-black text-white">{insights.totals.activeBoosts}</p></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mt-3">
                  <div className="border border-emerald-400/20 rounded-sm p-3 bg-emerald-400/5"><p className="text-[9px] text-emerald-300 uppercase">Today signups</p><p className="text-lg font-black text-white">{insights.today.newUserSignups ?? "—"}</p><p className="text-[8px] text-emerald-400/50 mt-1">UTC midnight → now</p></div>
                  <div className="border border-emerald-400/20 rounded-sm p-3 bg-emerald-400/5"><p className="text-[9px] text-emerald-300 uppercase">Today New Tracks</p><p className="text-lg font-black text-white">{insights.today.newTracks}</p></div>
                  <div className="border border-emerald-400/20 rounded-sm p-3 bg-emerald-400/5"><p className="text-[9px] text-emerald-300 uppercase">Today Plays</p><p className="text-lg font-black text-white">{insights.today.plays}</p></div>
                  <div className="border border-emerald-400/20 rounded-sm p-3 bg-emerald-400/5"><p className="text-[9px] text-emerald-300 uppercase">Today Votes</p><p className="text-lg font-black text-white">{insights.today.votes}</p></div>
                  <div className="border border-emerald-400/20 rounded-sm p-3 bg-emerald-400/5"><p className="text-[9px] text-emerald-300 uppercase">Today Battles</p><p className="text-lg font-black text-white">{insights.today.battles}</p></div>
                </div>
              </>
            )}
        </div>
      </div>

      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-4 h-4 text-violet-300" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-300">
            User Activity
          </p>
        </div>
        <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
          Per-user engagement summary. <span className="text-emerald-400">active</span> = visited within the last 7 days (UTC).
        </p>
        {userActivityLoading || !userActivity ? (
          <div className="border border-white/5 rounded-sm p-8 flex justify-center">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : userActivity.length === 0 ? (
          <p className="text-[11px] text-zinc-600 uppercase tracking-widest">No users yet</p>
        ) : (
          <div className="border border-white/5 rounded-sm overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-white/10 text-[9px] uppercase tracking-widest text-zinc-500">
                  <th className="px-3 py-2 font-bold">User</th>
                  <th className="px-3 py-2 font-bold">Role</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 font-bold">Last login</th>
                  <th className="px-3 py-2 font-bold">Last visit</th>
                  <th className="px-3 py-2 font-bold text-right">Visits</th>
                  <th className="px-3 py-2 font-bold text-right">Unique plays</th>
                  <th className="px-3 py-2 font-bold text-right">Battle votes</th>
                </tr>
              </thead>
              <tbody>
                {userActivity.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                    data-testid={`row-user-activity-${row.userId}`}
                  >
                    <td className="px-3 py-2.5">
                      <p className="text-white font-semibold">{row.username ?? "—"}</p>
                      <p className="text-[10px] text-zinc-600 truncate max-w-[180px]">{row.email ?? row.userId}</p>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400 uppercase text-[10px]">{row.role ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border ${
                          row.activityStatus === "active"
                            ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
                            : "text-zinc-500 bg-zinc-500/10 border-zinc-500/30"
                        }`}
                      >
                        {row.activityStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400 whitespace-nowrap">
                      {row.lastLoginAt ? fmt(row.lastLoginAt) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400 whitespace-nowrap">
                      {row.lastVisitAt ? fmt(row.lastVisitAt) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white font-mono">{row.visitCount}</td>
                    <td className="px-3 py-2.5 text-right text-white font-mono">{row.tracksPlayedCount}</td>
                    <td className="px-3 py-2.5 text-right text-white font-mono">{row.battleVoteCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-10 border border-cyan-400/20 rounded-sm bg-cyan-400/[0.04] p-4">
        <div className="flex items-start justify-between gap-4 mb-4 flex-col sm:flex-row">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                {t("adminPanel.b2bTitle")}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed max-w-2xl">
                {t("adminPanel.b2bBody")}
              </p>
              {snapshotStatus && (
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-2">
                  {t("adminPanel.snapshotMeta", {
                    last: snapshotStatus.lastPlatformSnapshotDate ?? "—",
                    days: snapshotStatus.trackSnapshotDays,
                  })}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void captureSnapshotNow()}
            disabled={snapshotBusy}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest border border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-50 shrink-0"
          >
            {snapshotBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {t("adminPanel.snapshotCapture")}
          </button>
        </div>

        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          {t("adminPanel.internalExport")}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => void downloadAdminCsv("/api/admin/export/creator-tracks.csv", "creator-tracks")}
            disabled={exportBusy === "creator-tracks"}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest border border-yellow-400/25 text-yellow-200/90 hover:bg-yellow-400/10 disabled:opacity-50"
          >
            {exportBusy === "creator-tracks" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {t("adminPanel.creatorTracksCsv")}
          </button>
        </div>

        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          {t("adminPanel.b2bExports")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["plays", "/api/admin/export/b2b/plays.csv"],
              ["battles", "/api/admin/export/b2b/battles.csv"],
              ["battle-votes", "/api/admin/export/b2b/battle-votes.csv"],
              ["catalog", "/api/admin/export/b2b/catalog.csv"],
              ["ai-insights", "/api/admin/export/b2b/ai-insights.csv"],
              ["daily-tracks", "/api/admin/export/b2b/daily-track-snapshots.csv"],
              ["daily-platform", "/api/admin/export/b2b/daily-platform-snapshots.csv"],
            ] as const
          ).map(([key, path]) => (
            <button
              key={key}
              type="button"
              onClick={() => void downloadAdminCsv(path, key)}
              disabled={exportBusy === key}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest border border-white/10 text-zinc-300 hover:border-cyan-400/30 hover:text-cyan-100 disabled:opacity-50"
            >
              {exportBusy === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {t(`adminPanel.export_${key}`)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void downloadDataDictionary()}
            disabled={exportBusy === "dictionary"}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest border border-white/10 text-zinc-300 hover:border-cyan-400/30 hover:text-cyan-100 disabled:opacity-50"
          >
            {exportBusy === "dictionary" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5" />}
            {t("adminPanel.dataDictionary")}
          </button>
          <button
            type="button"
            onClick={() => void pushB2bWebhook()}
            disabled={exportBusy === "webhook"}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest border border-emerald-400/25 text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-50"
          >
            {exportBusy === "webhook" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
            {t("adminPanel.webhookPush")}
          </button>
        </div>
      </div>

      {/* Track submission pipeline — keep above long queues so admins see it without scrolling */}
      <div className="mb-10 border border-yellow-500/15 rounded-sm bg-yellow-500/[0.03] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400/90 mb-3">
          Track submissions · Pending review
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["PENDING","BATTLE_POOL","REJECTED","CHART"] as const).map((s) => {
            const cnt =
              s === "PENDING"
                ? submissions?.filter((t) => t.status === "PENDING" || t.status === "SUBMITTED").length ?? 0
                : submissions?.filter((t) => t.status === s).length ?? 0;
            return (
              <div
                key={s}
                className="border border-white/5 rounded-sm p-3 bg-black/20 text-center"
                data-testid={`stat-${s.toLowerCase().replace("_","-")}`}
              >
                <p className="text-lg font-black text-white">{subsLoading ? "—" : cnt}</p>
                <StatusBadge status={s} />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-4 h-4 text-yellow-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400" id="admin-pending-review">
            Pending Review
          </p>
          {pending.length > 0 && (
            <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-sm">
              {pending.length}
            </span>
          )}
        </div>

        {subsLoading ? (
          <div className="border border-white/5 rounded-sm p-8 flex justify-center">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <div className="border border-white/5 rounded-sm p-8 text-center bg-black/10">
            <CheckCircle className="w-8 h-8 text-zinc-700 mx-auto mb-3" strokeWidth={1} />
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">No pending tracks</p>
            <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed normal-case max-w-lg mx-auto">
              You are looking in the right place. If both this list and Platform Insights “Pending” show 0, the database has no tracks
              waiting for review — they were already approved or never stored as PENDING/SUBMITTED. Check the track on its /track/… page for status;
              remember the NEW page lists audio only (not MV).
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {pending.map((track) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border border-yellow-400/10 bg-black/30 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  data-testid={`row-pending-${track.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">#{track.id}</span>
                      <span className="text-[9px] font-bold text-zinc-700 px-1.5 py-0.5 border border-white/5 rounded-sm uppercase tracking-widest">
                        {track.genre}
                      </span>
                    </div>
                    <p className="font-bold text-white text-sm truncate" data-testid={`text-title-${track.id}`}>
                      {track.title}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                      {track.creatorName}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <a
                        href={track.trackLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-primary/70 hover:text-primary flex items-center gap-1 uppercase tracking-widest transition-colors"
                        data-testid={`link-track-${track.id}`}
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Open Track
                      </a>
                      <span className="text-[9px] text-zinc-700 uppercase tracking-widest">{fmt(track.createdAt)}</span>
                    </div>
                    {track.portfolioLink ? (
                      <a
                        href={track.portfolioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1 uppercase tracking-widest transition-colors mt-2"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Social / Portfolio
                      </a>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={track.status} />
                    <button
                      onClick={() =>
                        reviewMutation.mutate({
                          id: track.id,
                          status: track.trackType === "video" ? "MV" : "BATTLE_POOL",
                        })
                      }
                      disabled={reviewMutation.isPending}
                      data-testid={`button-approve-${track.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 hover:bg-primary/25 rounded-sm transition-all disabled:opacity-40"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => reviewMutation.mutate({ id: track.id, status: "REJECTED" })}
                      disabled={reviewMutation.isPending}
                      data-testid={`button-reject-${track.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-400/30 bg-red-400/5 hover:bg-red-400/15 rounded-sm transition-all disabled:opacity-40"
                    >
                      <XCircle className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {processed.length > 0 && (
          <div className="mt-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-4">Processed</p>
            <div className="space-y-1.5">
              {processed.map((track) => (
                <div
                  key={track.id}
                  className="border border-white/5 bg-black/15 rounded-sm px-4 py-3 flex items-center gap-4"
                  data-testid={`row-processed-${track.id}`}
                >
                  <span className="text-[9px] font-bold text-zinc-600 w-8">#{track.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-300 truncate">{track.title}</p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest">{track.creatorName} · {track.genre}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[9px] text-zinc-700 hidden sm:block">{fmt(track.createdAt)}</span>
                    <StatusBadge status={track.status} />
                    <a href={track.trackLink} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-primary transition-colors">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mb-8 border border-primary/25 rounded-sm bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">{t("adminPanel.insightsTitle")}</p>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed max-w-xl">{t("adminPanel.insightsBody")}</p>
          </div>
        </div>
        <Link
          href="/profile/me/analytics"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest bg-primary/90 text-black hover:brightness-110 whitespace-nowrap shrink-0"
        >
          {t("adminPanel.insightsCta")}
        </Link>
      </div>

      {/* Creator applications */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-4 h-4 text-cyan-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
            Creator applications
          </p>
          {(creatorApplications?.length ?? 0) > 0 && (
            <span className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-sm">
              {creatorApplications!.length}
            </span>
          )}
        </div>
        {creatorAppsLoading ? (
          <div className="border border-white/5 rounded-sm p-8 flex justify-center">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : !creatorApplications?.length ? (
          <div className="border border-white/5 rounded-sm p-8 text-center bg-black/10">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">No pending creator applications</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {creatorApplications.map((row) => (
                <motion.div
                  key={row.profileId}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border border-cyan-400/15 bg-black/30 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  data-testid={`row-creator-app-${row.profileId}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{row.username}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                      {row.email ?? "—"}
                      {row.country ? ` · ${row.country}` : ""}
                      {row.aiToolUsed ? ` · ${row.aiToolUsed}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => approveCreatorMutation.mutate(row.profileId)}
                      disabled={approveCreatorMutation.isPending || rejectCreatorMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 hover:bg-primary/25 rounded-sm transition-all disabled:opacity-40"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Approve creator
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectCreatorMutation.mutate(row.profileId)}
                      disabled={approveCreatorMutation.isPending || rejectCreatorMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-400/30 bg-red-400/5 hover:bg-red-400/15 rounded-sm transition-all disabled:opacity-40"
                    >
                      <XCircle className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="mb-10 border border-red-500/20 rounded-sm bg-red-500/[0.04] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-300">Creator Cleanup (Danger)</p>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
              Deactivate one creator by username. This hides all of their owned tracks (archives them) and removes the profile from public creator listings.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            value={deactivateUsername}
            onChange={(e) => setDeactivateUsername(e.target.value)}
            placeholder="username (e.g. divineverseai)"
            className="flex-1 bg-black border border-red-400/20 rounded-sm px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            disabled={deactivateCreatorMutation.isPending || !deactivateUsername.trim()}
            onClick={() => deactivateCreatorMutation.mutate(deactivateUsername.trim())}
            className="px-4 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest border border-red-400/40 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
          >
            {deactivateCreatorMutation.isPending ? "Processing..." : "Deactivate creator"}
          </button>
        </div>
      </div>

      {/* Track ownership claims */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Handshake className="w-4 h-4 text-amber-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
            Track ownership requests
          </p>
          {(trackClaimRequests?.length ?? 0) > 0 && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-sm">
              {trackClaimRequests!.length}
            </span>
          )}
        </div>
        {claimReqLoading ? (
          <div className="border border-white/5 rounded-sm p-8 flex justify-center">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : !trackClaimRequests?.length ? (
          <div className="border border-white/5 rounded-sm p-6 text-center bg-black/10">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">No pending ownership requests</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {trackClaimRequests.map((row) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border border-amber-400/15 bg-black/30 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{row.trackTitle}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                      Track #{row.trackId} · Requested by @{row.requesterUsername}
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-1">{fmt(row.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/track/${row.trackId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-primary"
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                    <button
                      type="button"
                      onClick={() => approveClaimMutation.mutate(row.id)}
                      disabled={approveClaimMutation.isPending || rejectClaimMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/40 bg-primary/10 hover:bg-primary/25 rounded-sm transition-all disabled:opacity-40"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectClaimMutation.mutate(row.id)}
                      disabled={approveClaimMutation.isPending || rejectClaimMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-400/30 bg-red-400/5 hover:bg-red-400/15 rounded-sm transition-all disabled:opacity-40"
                    >
                      <XCircle className="w-3 h-3" />
                      Deny
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-6 border border-white/5 rounded-sm p-4 bg-black/20 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Allow creator claims (seed track)
          </p>
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            Enter a track ID to mark it as claimable. The artist will see “Claim this track” on the track page and can request approval or use the instant code.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="number"
              min={1}
              placeholder="Track ID"
              value={claimableTrackId}
              onChange={(e) => setClaimableTrackId(e.target.value)}
              className="flex-1 bg-black border border-white/10 rounded-sm px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={setClaimableMutation.isPending || !claimableTrackId.trim()}
              onClick={() => {
                const n = Number(claimableTrackId);
                if (!Number.isFinite(n) || n < 1) return;
                setClaimableMutation.mutate({ trackId: n, claimable: true });
              }}
              className="px-4 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-40"
            >
              Mark claimable
            </button>
          </div>
        </div>
      </div>

      {/* Track edit requests */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Handshake className="w-4 h-4 text-emerald-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
            Track edit requests
          </p>
          {(trackEditRequests?.length ?? 0) > 0 && (
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-sm">
              {trackEditRequests!.length}
            </span>
          )}
        </div>
        {editReqLoading ? (
          <div className="border border-white/5 rounded-sm p-8 flex justify-center">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : !trackEditRequests?.length ? (
          <div className="border border-white/5 rounded-sm p-6 text-center bg-black/10">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">No pending edit requests</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {trackEditRequests.map((row) => (
                <motion.div
                  key={row.commentId}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border border-emerald-400/15 bg-black/30 rounded-sm p-4 flex flex-col gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{row.trackTitle}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                      Track #{row.trackId} · Requested by @{row.requesterUsername ?? "unknown"}
                    </p>
                    {row.detail ? (
                      <p className="text-[11px] text-zinc-300 mt-2 whitespace-pre-wrap break-words">{row.detail}</p>
                    ) : null}
                    {row.proposedLink ? (
                      <a
                        href={row.proposedLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex mt-2 items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-300 hover:text-emerald-200"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Proposed link
                      </a>
                    ) : null}
                    <p className="text-[9px] text-zinc-600 mt-1">{fmt(row.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href={`/track/${row.trackId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:text-primary"
                    >
                      <ExternalLink className="w-3 h-3" /> Open track
                    </a>
                    <button
                      type="button"
                      onClick={() => dismissEditRequestMutation.mutate(row.commentId)}
                      disabled={dismissEditRequestMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-600/40 bg-zinc-900/40 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/35 rounded-sm transition-all disabled:opacity-40"
                      title={t("admin.removeQueueTitle")}
                    >
                      <Trash2 className="w-3 h-3" />
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* System flow */}
      <div className="mt-10 border border-white/5 rounded-sm p-4 text-[9px] text-zinc-600 uppercase tracking-widest">
        <p className="text-zinc-500 font-bold mb-2">System flow</p>
        <p className="text-zinc-500">
          Submit → <span className="text-yellow-400">PENDING</span>{" "}
          → Approve → <span className="text-primary">BATTLE_POOL</span>{" "}
          (appears in Music Chart + Battles){" "}
          → Battle × 10 · Win Rate ≥ 55% → <span className="text-purple-400">CHART</span>
        </p>
        <p className="mt-1">
          Reject → <span className="text-red-400">REJECTED</span> (excluded from chart and battles)
        </p>
      </div>
    </div>
  );
}
