import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart3, ArrowLeft, Users, Heart, Play, Swords, Ticket, Radio } from "lucide-react";
import { isCreatorStudioRole } from "@shared/constants";
import { useTranslation } from "react-i18next";

type AnalyticsPayload = {
  profileId: number;
  username: string;
  followerCount: number;
  trackCount: number;
  boostTicketBalance: number;
  totals: {
    chartPlayCount: number;
    metricsPlays: number;
    completedPlays: number;
    likes: number;
    listenerVotes: number;
    battles: number;
    battleWins: number;
    uniqueListeners: number;
    relistens: number;
  };
  tracks: Array<{
    id: number;
    title: string;
    status: string;
    genre: string;
    trackType: string;
    chartPlayCount: number;
    listenerVotes: number;
    rankingScore: number;
    neoScore: number;
    winStreak: number;
    lastPlayedAt: string | null;
    createdAt: string;
    metrics: {
      likesCount: number;
      playsCount: number;
      completedPlaysCount: number;
      uniqueListenersCount: number;
      relistenPlaysCount: number;
      battleTotalCount: number;
      battleWinsCount: number;
    } | null;
    battleStats: { totalBattles: number; wins: number; winRate: number };
  }>;
  generatedAt: string;
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-[#080808] border border-white/5 rounded-sm p-4 space-y-2">
      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
        <Icon className="w-3.5 h-3.5 text-primary/70" />
        {label}
      </div>
      <p className="font-display text-2xl text-white tabular-nums">{value}</p>
      {sub ? <p className="text-[10px] text-zinc-600 leading-snug">{sub}</p> : null}
    </div>
  );
}

export function CreatorAnalytics() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profiles/me"],
    queryFn: async () => {
      const res = await fetch("/api/profiles/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json() as Promise<{ id: number; role?: string; username?: string } | null>;
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: analytics, isLoading: analyticsLoading, error } = useQuery({
    queryKey: ["/api/profiles/me/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/profiles/me/analytics", { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err?.message === "string" ? err.message : "Failed to load analytics");
      }
      return res.json() as Promise<AnalyticsPayload>;
    },
    enabled: isAuthenticated && isCreatorStudioRole(profile?.role),
    retry: false,
  });

  if (authLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-primary/60">{t("creatorAnalytics.loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="py-40 text-center space-y-6">
        <p className="font-display text-2xl uppercase tracking-widest text-zinc-500">{t("creatorAnalytics.loginRequired")}</p>
        <a
          href={`/auth?returnTo=${encodeURIComponent("/profile/me/analytics")}`}
          className="inline-block border border-primary/30 text-primary px-6 py-3 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-primary/10 transition-all"
        >
          {t("layout.login")}
        </a>
      </div>
    );
  }

  if (!isCreatorStudioRole(profile?.role)) {
    return (
      <div className="py-40 text-center space-y-6">
        <div className="border border-white/5 border-dashed p-16 rounded-sm max-w-md mx-auto space-y-4">
          <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto" />
          <p className="font-display text-xl uppercase tracking-widest text-zinc-500">{t("creatorAnalytics.creatorOnly")}</p>
        </div>
      </div>
    );
  }

  if (analyticsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-primary/60">{t("creatorAnalytics.loading")}</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="py-40 text-center space-y-4 max-w-md mx-auto">
        <p className="text-zinc-500 text-sm">{error instanceof Error ? error.message : t("creatorAnalytics.loadFailed")}</p>
        <button
          type="button"
          onClick={() => navigate("/profile/me")}
          className="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline"
        >
          {t("creatorAnalytics.backProfile")}
        </button>
      </div>
    );
  }

  const { totals } = analytics;
  const gen = new Date(analytics.generatedAt).toLocaleString();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto pb-24 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/profile/me"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-[10px] font-bold uppercase tracking-[0.2em]"
          >
            <ArrowLeft className="w-4 h-4" /> {t("creatorAnalytics.backProfile")}
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tighter text-white neon-text-green flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary/80" />
            {t("creatorAnalytics.title")}
          </h1>
          <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">
            @{analytics.username} · {t("creatorAnalytics.snapshotNote", { time: gen })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label={t("creatorAnalytics.followers")} value={analytics.followerCount} />
        <StatCard icon={Radio} label={t("creatorAnalytics.tracks")} value={analytics.trackCount} />
        <StatCard icon={Ticket} label={t("creatorAnalytics.boostTickets")} value={analytics.boostTicketBalance} />
        <StatCard
          icon={Heart}
          label={t("creatorAnalytics.totalLikes")}
          value={totals.likes}
          sub={t("creatorAnalytics.subLikes")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={Play}
          label={t("creatorAnalytics.chartPlays")}
          value={totals.chartPlayCount}
          sub={t("creatorAnalytics.subChartPlays")}
        />
        <StatCard
          icon={Play}
          label={t("creatorAnalytics.sessionPlays")}
          value={totals.metricsPlays}
          sub={t("creatorAnalytics.subSessionPlays")}
        />
        <StatCard icon={Play} label={t("creatorAnalytics.completedPlays")} value={totals.completedPlays} />
        <StatCard icon={Heart} label={t("creatorAnalytics.listenerVotes")} value={totals.listenerVotes} />
        <StatCard icon={Users} label={t("creatorAnalytics.uniqueListeners")} value={totals.uniqueListeners} />
        <StatCard icon={Swords} label={t("creatorAnalytics.battleRecord")} value={`${totals.battleWins} / ${totals.battles}`} />
      </div>

      <div className="space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">{t("creatorAnalytics.perTrack")}</h2>
        {analytics.tracks.length === 0 ? (
          <div className="border border-white/5 border-dashed rounded-sm p-12 text-center text-zinc-600 text-sm">{t("creatorAnalytics.noTracks")}</div>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-white/5">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-black/50 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-3 py-2">{t("creatorAnalytics.colTitle")}</th>
                  <th className="px-3 py-2 hidden md:table-cell">{t("creatorAnalytics.colStatus")}</th>
                  <th className="px-3 py-2 text-right tabular-nums">{t("creatorAnalytics.colChartPlays")}</th>
                  <th className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">{t("creatorAnalytics.colLikes")}</th>
                  <th className="px-3 py-2 text-right tabular-nums">{t("creatorAnalytics.colVotes")}</th>
                  <th className="px-3 py-2 text-right tabular-nums hidden lg:table-cell">{t("creatorAnalytics.colBattle")}</th>
                  <th className="px-3 py-2 text-right tabular-nums hidden xl:table-cell">{t("creatorAnalytics.colRank")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {analytics.tracks.map((tr) => (
                  <tr key={tr.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2">
                      <Link href={`/track/${tr.id}`} className="text-white font-semibold hover:text-primary transition-colors line-clamp-2">
                        {tr.title}
                      </Link>
                      <p className="text-[9px] text-zinc-600 mt-0.5">
                        {tr.genre} · {tr.trackType}
                      </p>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell text-zinc-500">{tr.status}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{tr.chartPlayCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-300 hidden sm:table-cell">{tr.metrics?.likesCount ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-300">{tr.listenerVotes}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-400 hidden lg:table-cell">
                      {tr.battleStats.wins}/{tr.battleStats.totalBattles} ({tr.battleStats.winRate}%)
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-500 hidden xl:table-cell">{Number(tr.rankingScore).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
