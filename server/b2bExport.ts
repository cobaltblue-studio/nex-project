import { normalizeTrackProvenanceStatus } from "@shared/constants";
import { anonymizeSessionKey, anonymizeUserId } from "./dataAnonymize";

export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function b2bCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(row.map((c) => csvCell(c)).join(","));
  }
  return lines.join("\n") + "\n";
}

export function b2bExportFilename(prefix: string, rowCount: number, ext = "csv"): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `nex-b2b-${prefix}-${stamp}-${rowCount}rows.${ext}`;
}

export type B2bPlayExportRow = {
  playId: number;
  trackId: number;
  listenerType: "authenticated" | "guest";
  listenerId: string;
  listenerCountry: string;
  deviceClass: string;
  referrerHost: string;
  completed: boolean;
  playedAt: string;
};

export function b2bPlaysCsv(rows: B2bPlayExportRow[]): string {
  return b2bCsv(
    [
      "play_id",
      "track_id",
      "listener_type",
      "listener_id",
      "listener_country",
      "device_class",
      "referrer_host",
      "completed",
      "played_at_utc",
    ],
    rows.map((r) => [
      r.playId,
      r.trackId,
      r.listenerType,
      r.listenerId,
      r.listenerCountry,
      r.deviceClass,
      r.referrerHost,
      r.completed,
      r.playedAt,
    ]),
  );
}

export type B2bBattleExportRow = {
  battleId: number;
  genre: string;
  trackAId: number;
  trackBId: number;
  trackAVotes: number;
  trackBVotes: number;
  winnerId: number | null;
  isArchived: boolean;
  createdAt: string;
};

export function b2bBattlesCsv(rows: B2bBattleExportRow[]): string {
  return b2bCsv(
    [
      "battle_id",
      "genre",
      "track_a_id",
      "track_b_id",
      "track_a_votes",
      "track_b_votes",
      "winner_id",
      "is_archived",
      "created_at_utc",
    ],
    rows.map((r) => [
      r.battleId,
      r.genre,
      r.trackAId,
      r.trackBId,
      r.trackAVotes,
      r.trackBVotes,
      r.winnerId ?? "",
      r.isArchived,
      r.createdAt,
    ]),
  );
}

export type B2bBattleVoteExportRow = {
  voteId: number;
  battleId: number;
  trackId: number;
  listenerId: string;
  votedAt: string;
};

export function b2bBattleVotesCsv(rows: B2bBattleVoteExportRow[]): string {
  return b2bCsv(
    ["vote_id", "battle_id", "track_id", "listener_id", "voted_at_utc"],
    rows.map((r) => [r.voteId, r.battleId, r.trackId, r.listenerId, r.votedAt]),
  );
}

export type B2bDailyTrackSnapshotRow = {
  snapshotDate: string;
  trackId: number;
  title: string;
  genre: string;
  aiTool: string;
  trackType: string;
  status: string;
  provenanceStatus: string;
  isDeleted: boolean;
  playsCount: number;
  likesCount: number;
  completedPlaysCount: number;
  uniqueListenersCount: number;
  battleWinsCount: number;
  battleTotalCount: number;
  chartRank: number | null;
  rankingScore: number;
  listenerVotes: number;
};

export function b2bDailyTrackSnapshotsCsv(rows: B2bDailyTrackSnapshotRow[]): string {
  return b2bCsv(
    [
      "snapshot_date_utc",
      "track_id",
      "title",
      "genre",
      "ai_tool",
      "track_type",
      "status",
      "provenance_status",
      "is_deleted",
      "plays",
      "likes",
      "completed_plays",
      "unique_listeners",
      "battle_wins",
      "battle_total",
      "chart_rank",
      "ranking_score",
      "listener_votes",
    ],
    rows.map((r) => [
      r.snapshotDate,
      r.trackId,
      r.title,
      r.genre,
      r.aiTool,
      r.trackType,
      r.status,
      normalizeTrackProvenanceStatus(r.provenanceStatus),
      r.isDeleted,
      r.playsCount,
      r.likesCount,
      r.completedPlaysCount,
      r.uniqueListenersCount,
      r.battleWinsCount,
      r.battleTotalCount,
      r.chartRank ?? "",
      r.rankingScore,
      r.listenerVotes,
    ]),
  );
}

export type B2bDailyPlatformSnapshotRow = {
  snapshotDate: string;
  creators: number;
  userSignups: number;
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
  trackPlaysToday: number;
  votesToday: number;
  battlesToday: number;
  newTracksToday: number;
  newUserSignupsToday: number;
};

export function b2bDailyPlatformSnapshotsCsv(rows: B2bDailyPlatformSnapshotRow[]): string {
  return b2bCsv(
    [
      "snapshot_date_utc",
      "creators",
      "user_signups",
      "tracks",
      "tracks_approved",
      "tracks_pending",
      "tracks_chart",
      "plays",
      "likes",
      "listener_votes",
      "battles",
      "battle_wins",
      "active_boosts",
      "plays_today",
      "votes_today",
      "battles_today",
      "new_tracks_today",
      "new_signups_today",
    ],
    rows.map((r) => [
      r.snapshotDate,
      r.creators,
      r.userSignups,
      r.tracks,
      r.tracksApproved,
      r.tracksPending,
      r.tracksChart,
      r.plays,
      r.likes,
      r.listenerVotes,
      r.battles,
      r.battleWins,
      r.activeBoosts,
      r.trackPlaysToday,
      r.votesToday,
      r.battlesToday,
      r.newTracksToday,
      r.newUserSignupsToday,
    ]),
  );
}

export type B2bCatalogExportRow = {
  trackId: number;
  title: string;
  artistName: string;
  genre: string;
  aiTool: string;
  trackType: string;
  status: string;
  provenanceStatus: string;
  claimable: boolean;
  isDeleted: boolean;
  plays: number;
  likes: number;
  battleWins: number;
  battleTotal: number;
  uniqueListeners: number;
  chartRank: number | null;
  rankingScore: number;
  createdAt: string;
  /** Aggregated prompt length only — raw prompt excluded for B2B (licensing). */
  aiPromptCharCount: number;
};

export function b2bCatalogCsv(rows: B2bCatalogExportRow[]): string {
  return b2bCsv(
    [
      "track_id",
      "title",
      "artist_name",
      "genre",
      "ai_tool",
      "track_type",
      "status",
      "provenance_status",
      "claimable",
      "is_deleted",
      "plays",
      "likes",
      "battle_wins",
      "battle_total",
      "unique_listeners",
      "chart_rank",
      "ranking_score",
      "created_at_utc",
      "ai_prompt_char_count",
    ],
    rows.map((r) => [
      r.trackId,
      r.title,
      r.artistName,
      r.genre,
      r.aiTool,
      r.trackType,
      r.status,
      normalizeTrackProvenanceStatus(r.provenanceStatus),
      r.claimable,
      r.isDeleted,
      r.plays,
      r.likes,
      r.battleWins,
      r.battleTotal,
      r.uniqueListeners,
      r.chartRank ?? "",
      r.rankingScore,
      r.createdAt,
      r.aiPromptCharCount,
    ]),
  );
}

export type B2bAiInsightRow = {
  genre: string;
  aiTool: string;
  trackCount: number;
  totalPlays: number;
  totalLikes: number;
  totalBattleWins: number;
  totalBattles: number;
  avgWinRate: number;
  avgCompletionRate: number;
};

export function b2bAiInsightsCsv(rows: B2bAiInsightRow[]): string {
  return b2bCsv(
    [
      "genre",
      "ai_tool",
      "track_count",
      "total_plays",
      "total_likes",
      "total_battle_wins",
      "total_battles",
      "avg_win_rate",
      "avg_completion_rate",
    ],
    rows.map((r) => [
      r.genre,
      r.aiTool,
      r.trackCount,
      r.totalPlays,
      r.totalLikes,
      r.totalBattleWins,
      r.totalBattles,
      r.avgWinRate.toFixed(4),
      r.avgCompletionRate.toFixed(4),
    ]),
  );
}

/** Map raw DB row to anonymized listener id for exports. */
export function exportListenerId(userId: string | null | undefined, sessionKey: string | null | undefined): {
  listenerType: "authenticated" | "guest";
  listenerId: string;
} {
  if (userId?.trim()) {
    return { listenerType: "authenticated", listenerId: anonymizeUserId(userId) };
  }
  return { listenerType: "guest", listenerId: anonymizeSessionKey(sessionKey) };
}
