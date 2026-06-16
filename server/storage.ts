import {
  users,
  profiles,
  tracks,
  likes,
  votes,
  follows,
  trackPlays,
  trackMetrics,
  battles,
  battleVotes,
  battleListenCompletions,
  comments,
  notifications,
  userActivityStats,
  trackClaimRequests,
  boostTickets,
  boostUsageLogs,
  boostImpressionEvents,
  boostStatus,
  dataDailyTrackSnapshots,
  dataDailyPlatformSnapshots,
  type Profile,
  type Track,
  type Follow,
  type Battle,
} from "@shared/schema";
import type { User } from "@shared/models/auth";
import { BATTLE_AND_NEW_AUDIO_STATUSES } from "@shared/constants";
import { computeCreatorPopularityScore } from "@shared/creatorPopularity";
import { resolvePublicPlayCount } from "@shared/publicPlayCount";
import {
  type AdminCreatorTrackExportRow,
  extractYoutubeHandle,
  isExportableRegistrationEmail,
  publicTrackPageUrl,
} from "./adminExport";
import {
  type B2bAiInsightRow,
  type B2bBattleExportRow,
  type B2bBattleVoteExportRow,
  type B2bCatalogExportRow,
  type B2bDailyPlatformSnapshotRow,
  type B2bDailyTrackSnapshotRow,
  type B2bPlayExportRow,
  exportListenerId,
} from "./b2bExport";
import { utcMidnight } from "./dailySnapshot";
import { db } from "./db";
import {
  isEmailEnabled,
  sendBattleWinEmail,
  sendTrackApprovedEmail,
  sendTrackLikedEmail,
  sendTrackRejectedEmail,
} from "./email";
import { eq, desc, and, or, sql, count, gt, gte, ne, inArray, notInArray, isNotNull, isNull } from "drizzle-orm";

const RANKING_WEIGHT_BATTLE = 0.5;
const RANKING_WEIGHT_LIKES = 0.2;
const RANKING_WEIGHT_PLAYS = 0.2;
const RANKING_WEIGHT_FOLLOWERS = 0.1;

/** MV chart: engagement only (no battles). */
const MV_RANKING_WEIGHT_PLAYS = 0.4;
const MV_RANKING_WEIGHT_LIKES = 0.35;
const MV_RANKING_WEIGHT_COMMENTS = 0.25;

const MV_CHART_STATUSES_SQL = sql`${tracks.status} IN ('MV', 'CHART', 'BATTLE_POOL', 'PUBLISHED', 'APPROVED')`;

/** Same pool as `/api/tracks/new` (audio only; not MV/video). */
function battleEligibleTracksFilter() {
  return and(
    inArray(tracks.status, [...BATTLE_AND_NEW_AUDIO_STATUSES]),
    eq(tracks.isDeleted, false),
    ne(tracks.trackType, "video"),
  );
}

/** Walk drizzle / driver wrappers to read PostgreSQL `sqlstate` (e.g. `23505`). */
function getPostgresSqlState(err: unknown): string | undefined {
  let cur: any = err;
  for (let depth = 0; depth < 8 && cur; depth += 1) {
    if (typeof cur.code === "string" && /^[0-9A-Z]{5}$/.test(cur.code)) return cur.code;
    cur = cur.cause ?? cur.originalError ?? cur.error ?? cur.err;
  }
  return undefined;
}

function isPostgresUniqueViolation(err: unknown): boolean {
  if (getPostgresSqlState(err) === "23505") return true;
  const msg = String((err as any)?.message ?? "");
  return /duplicate key value violates unique constraint/i.test(msg);
}

function isUndefinedColumnError(err: unknown): boolean {
  return getPostgresSqlState(err) === "42703";
}

function isPostgresFkViolation(err: unknown): boolean {
  return getPostgresSqlState(err) === "23503";
}

function isMissingRelationError(err: unknown): boolean {
  return getPostgresSqlState(err) === "42P01";
}

function getRecentBoost(createdAt: Date): number {
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursOld < 24) return 30;
  if (hoursOld < 48) return 20;
  if (hoursOld < 72) return 10;
  return 0;
}

/**
 * Composite chart score:
 * battle 50% + likes 20% + plays 20% + followers 10% (+ freshness boost).
 */
export function computeRankingScore(input: {
  battleWins: number;
  battleTotal: number;
  likesCount: number;
  playCount: number;
  followerCount: number;
  completionRate: number;
  saveRelistenRate: number;
  uniqueListeners: number;
  createdAt: Date;
}): number {
  const battleQuality = input.battleWins * 2 + input.battleTotal;
  const battleNorm = Math.log1p(Math.max(0, battleQuality));
  const likesNorm = Math.log1p(Math.max(0, input.likesCount));
  const playsNorm = Math.log1p(Math.max(0, input.playCount));
  const followersNorm = Math.log1p(Math.max(0, input.followerCount));
  const uniqueListenersNorm = Math.log1p(Math.max(0, input.uniqueListeners));

  const weightedCore =
    (battleNorm * RANKING_WEIGHT_BATTLE) +
    (likesNorm * RANKING_WEIGHT_LIKES) +
    (playsNorm * RANKING_WEIGHT_PLAYS) +
    (followersNorm * RANKING_WEIGHT_FOLLOWERS);

  // Quality/retention bonus from additional signals:
  // 1) completion rate, 2) save+relisten rate, 3) unique listeners depth.
  const qualityBonusFactor =
    (Math.max(0, Math.min(1, input.completionRate)) * 0.08) +
    (Math.max(0, Math.min(1, input.saveRelistenRate)) * 0.04) +
    (Math.max(0, Math.min(1, uniqueListenersNorm / 6)) * 0.03);

  const recentBoost = getRecentBoost(input.createdAt);
  return Number((weightedCore * (1 + qualityBonusFactor) * 100 + recentBoost).toFixed(4));
}

/**
 * Music Video TOP 100: plays + likes + comments (no battle signal).
 */
export function computeMvRankingScore(input: {
  likesCount: number;
  playCount: number;
  commentsCount: number;
  completionRate: number;
  saveRelistenRate: number;
  createdAt: Date;
}): number {
  const playsNorm = Math.log1p(Math.max(0, input.playCount));
  const likesNorm = Math.log1p(Math.max(0, input.likesCount));
  const commentsNorm = Math.log1p(Math.max(0, input.commentsCount));

  const weightedCore =
    playsNorm * MV_RANKING_WEIGHT_PLAYS +
    likesNorm * MV_RANKING_WEIGHT_LIKES +
    commentsNorm * MV_RANKING_WEIGHT_COMMENTS;

  const qualityBonusFactor =
    Math.max(0, Math.min(1, input.completionRate)) * 0.06 +
    Math.max(0, Math.min(1, input.saveRelistenRate)) * 0.04;

  const recentBoost = getRecentBoost(input.createdAt);
  return Number((weightedCore * (1 + qualityBonusFactor) * 100 + recentBoost).toFixed(4));
}

/** MV chart API sort: live plays/likes/comments only (no stale DB score, no freshness skew). */
export function computeMvChartLiveScore(input: {
  likesCount: number;
  playCount: number;
  commentsCount: number;
}): number {
  const playsNorm = Math.log1p(Math.max(0, input.playCount));
  const likesNorm = Math.log1p(Math.max(0, input.likesCount));
  const commentsNorm = Math.log1p(Math.max(0, input.commentsCount));
  return Number(
    (
      playsNorm * MV_RANKING_WEIGHT_PLAYS +
      likesNorm * MV_RANKING_WEIGHT_LIKES +
      commentsNorm * MV_RANKING_WEIGHT_COMMENTS
    ).toFixed(6),
  );
}

function weightedPickTwo<T extends { rankingScore: number; id: number }>(
  items: T[],
  opts?: { multiplierByTrackId?: Map<number, number> },
): [T, T] {
  const weights = items.map((t) => {
    const base = Math.max(1, t.rankingScore);
    const multiplier = opts?.multiplierByTrackId?.get(t.id) ?? 1;
    return Math.max(1, base * multiplier);
  });
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const pickIndex = (excludeIdx: number): number => {
    const adjustedTotal = totalWeight - (excludeIdx >= 0 ? weights[excludeIdx] : 0);
    let r = Math.random() * adjustedTotal;
    for (let i = 0; i < items.length; i++) {
      if (i === excludeIdx) continue;
      r -= weights[i];
      if (r <= 0) return i;
    }
    return items.length - 1 === excludeIdx ? items.length - 2 : items.length - 1;
  };

  const idxA = pickIndex(-1);
  const idxB = pickIndex(idxA);
  return [items[idxA], items[idxB]];
}

/** Fair matchmaking: two different creators when the pool allows (fallback: same creator). */
function weightedPickTwoDifferentCreators<T extends { rankingScore: number; id: number; creatorId: number }>(
  items: T[],
  opts?: { multiplierByTrackId?: Map<number, number> },
): [T, T] {
  const weights = items.map((t) => {
    const base = Math.max(1, t.rankingScore);
    const multiplier = opts?.multiplierByTrackId?.get(t.id) ?? 1;
    return Math.max(1e-9, base * multiplier);
  });
  const totalAll = weights.reduce((sum, w) => sum + w, 0);

  const pickFirstIndex = (): number => {
    let r = Math.random() * totalAll;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return items.length - 1;
  };

  const pickIndexExcluding = (excludeIdx: number, wts: number[]): number => {
    const adjustedTotal = wts.reduce((sum, w, i) => sum + (i === excludeIdx ? 0 : w), 0);
    let r = Math.random() * adjustedTotal;
    for (let i = 0; i < items.length; i++) {
      if (i === excludeIdx) continue;
      r -= wts[i];
      if (r <= 0) return i;
    }
    return items.length - 1 === excludeIdx ? items.length - 2 : items.length - 1;
  };

  const idxA = pickFirstIndex();
  const creatorA = items[idxA].creatorId;
  const totalDifferentCreator = weights.reduce(
    (sum, w, i) => sum + (i === idxA || items[i].creatorId === creatorA ? 0 : w),
    0,
  );
  if (totalDifferentCreator <= 1e-9) {
    const idxB = pickIndexExcluding(idxA, weights);
    return [items[idxA], items[idxB]];
  }
  let rB = Math.random() * totalDifferentCreator;
  for (let i = 0; i < items.length; i++) {
    if (i === idxA || items[i].creatorId === creatorA) continue;
    rB -= weights[i];
    if (rB <= 0) return [items[idxA], items[i]];
  }
  for (let i = 0; i < items.length; i++) {
    if (i !== idxA && items[i].creatorId !== creatorA) return [items[idxA], items[i]];
  }
  const idxB = pickIndexExcluding(idxA, weights);
  return [items[idxA], items[idxB]];
}

/** Last N battles: tracks here get a lower selection weight (rotation). */
const BATTLE_FAIRNESS_RECENT_BATTLE_COUNT = 32;
/** Multiplier applied to ranking weight when the track appeared in a recent battle (0–1). */
const BATTLE_FAIRNESS_RECENT_WEIGHT_MUL = 0.16;
/** When the user who started the battle owns the track (same profile id), extra down-weight. */
const BATTLE_FAIRNESS_REQUESTER_OWN_MUL = 0.38;

export interface IStorage {
  getProfileByUserId(userId: string): Promise<Profile | undefined>;
  createUser(u: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null }): Promise<any>;
  getUserById(id: string): Promise<User | undefined>;
  upsertOAuthUser(u: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  }): Promise<void>;
  getProfileByUsername(username: string): Promise<Profile | undefined>;
  getProfile(id: number): Promise<(Profile & { tracks: Track[]; followerCount: number }) | undefined>;
  createProfile(p: any): Promise<Profile>;
  updateProfile(id: number, data: Partial<Profile>): Promise<Profile>;
  /** Admin safety action: hide creator + archive owned tracks by current username. */
  deactivateCreatorByUsername(username: string): Promise<{ ok: boolean; reason?: string; profileId?: number; archivedTrackCount?: number }>;
  getTracks(filter: {
    status?: string;
    /** Public /music-video chart only — include legacy CHART/BATTLE_POOL video rows. */
    mvChartListing?: boolean;
    featured?: boolean;
    limit?: number;
    genre?: string;
    sortBy?: "rankingScore" | "neoScore" | "createdAt";
    trackType?: string;
    creatorId?: number;
    q?: string;
  }): Promise<any[]>;
  getTracksByCreator(creatorId: number): Promise<any[]>;
  getTrack(id: number): Promise<any | undefined>;
  createTrack(track: any): Promise<Track>;
  submitTrack(data: { title: string; artistName: string; genre: string; trackLink: string; trackType: string; aiPrompt?: string | null; coverImageUrl?: string | null; portfolioLink?: string | null; creatorId: number }): Promise<Track>;
  checkAndPromoteToChart(trackId: number): Promise<boolean>;
  hasVoted(userId: string, trackId: number): Promise<boolean>;
  voteTrack(userId: string, trackId: number): Promise<void>;
  likeTrack(userId: string, trackId: number): Promise<{ likesCount: number }>;
  /** True if this user already has a like for this track for the current UTC calendar day. */
  hasLikedTrackToday(userId: string, trackId: number): Promise<boolean>;
  recordPlay(
    userId: string,
    trackId: number,
    opts?: { completed?: boolean; listenerCountry?: string | null; deviceClass?: string | null; referrerHost?: string | null },
  ): Promise<{ counted: boolean; completionUpdated: boolean }>;
  recordGuestPlay(
    sessionKey: string,
    trackId: number,
    opts?: { completed?: boolean; deviceClass?: string | null; referrerHost?: string | null },
  ): Promise<{ counted: boolean; completionUpdated: boolean }>;
  captureDailySnapshots(snapshotDate?: Date): Promise<{ snapshotDate: string; trackRows: number; platformCaptured: boolean }>;
  getSnapshotStatus(): Promise<{ lastTrackSnapshotDate: string | null; lastPlatformSnapshotDate: string | null; trackSnapshotDays: number }>;
  getB2bPlayExportRows(opts?: { since?: Date; limit?: number }): Promise<B2bPlayExportRow[]>;
  getB2bBattleExportRows(): Promise<B2bBattleExportRow[]>;
  getB2bBattleVoteExportRows(opts?: { since?: Date; limit?: number }): Promise<B2bBattleVoteExportRow[]>;
  getB2bDailyTrackSnapshotExportRows(opts?: { since?: Date }): Promise<B2bDailyTrackSnapshotRow[]>;
  getB2bDailyPlatformSnapshotExportRows(opts?: { since?: Date }): Promise<B2bDailyPlatformSnapshotRow[]>;
  getB2bCatalogExportRows(): Promise<B2bCatalogExportRow[]>;
  getB2bAiInsightExportRows(): Promise<B2bAiInsightRow[]>;
  updateTrackStatus(id: number, status: string, aiCraftScore?: number): Promise<void>;
  updateTrackMetadata(
    id: number,
    data: {
      title?: string;
      artistName?: string | null;
      genre?: string;
      coverImageUrl?: string | null;
      audioUrl?: string;
      mvUrl?: string | null;
      aiPrompt?: string | null;
      /** When the track owner edits `aiPrompt`; increments edit count and sets last-edited time. */
      bumpAiPromptEditStats?: boolean;
    },
  ): Promise<Track | undefined>;
  /** Admin-only: remove a track comment that is an edit-request ticket. */
  deleteTrackEditRequestComment(commentId: number): Promise<boolean>;
  deleteTrack(id: number): Promise<boolean>;
  recalculateAllRankingScores(): Promise<void>;
  followCreator(followerId: string, creatorProfileId: number): Promise<void>;
  unfollowCreator(followerId: string, creatorProfileId: number): Promise<void>;
  isFollowing(followerId: string, creatorProfileId: number): Promise<boolean>;
  getFollowerCount(creatorProfileId: number): Promise<number>;
  getAvailableBattleGenres(): Promise<string[]>;
  createBattle(
    genre: string,
    requester?: { profileId?: number | null; userId?: string | null },
  ): Promise<any | null>;
  getBattle(id: number): Promise<any | null>;
  hasBattleVoted(battleId: number, userId: string): Promise<boolean>;
  /** Idempotent: records that `userId` finished the battle preview for `trackId` (must be track A or B). */
  recordBattleListenComplete(battleId: number, userId: string, trackId: number): Promise<void>;
  recordBattleVote(
    battleId: number,
    userId: string,
    trackId: number,
    opts?: { skipListenCheck?: boolean },
  ): Promise<{ trackAVotes: number; trackBVotes: number; winnerId: number; trackAWinStreak: number; trackBWinStreak: number }>;
  getRisingTracks(q?: string): Promise<any[]>;
  addComment(userId: string, trackId: number, content: string): Promise<void>;
  listTrackComments(
    trackId: number,
  ): Promise<{ id: number; userId: string; content: string; createdAt: Date; authorName: string | null }[]>;
  /** Public counts per track (excludes [EDIT REQUEST] admin tickets). */
  getCommentCountsForTracks(trackIds: number[]): Promise<Record<number, number>>;
  listPendingTrackEditRequests(): Promise<
    {
      commentId: number;
      trackId: number;
      trackTitle: string;
      requesterUsername: string | null;
      detail: string;
      proposedLink: string | null;
      createdAt: Date;
    }[]
  >;
  getBattleStatsForTracks(trackIds: number[]): Promise<Record<number, { totalBattles: number; wins: number; winRate: number }>>;
  getDailyBattleVoteCount(userId: string): Promise<number>;
  getRecentBattle(): Promise<any | null>;
  getTodayStats(): Promise<{ totalVotesToday: number; battlesPlayedToday: number; tracksInPool: number; newTracksToday: number }>;
  trackUrlExists(url: string): Promise<boolean>;
  getCreators(): Promise<Profile[]>;
  getPendingCreatorApplications(): Promise<{ profile: Profile; email: string | null }[]>;
  transferTrackOwnershipFromClaim(trackId: number, newCreatorProfileId: number): Promise<Track | null>;
  createTrackClaimRequest(trackId: number, requesterProfileId: number): Promise<{ created: boolean; duplicate: boolean }>;
  listPendingTrackClaimRequests(): Promise<
    {
      id: number;
      trackId: number;
      trackTitle: string;
      requesterProfileId: number;
      requesterUsername: string;
      createdAt: Date;
    }[]
  >;
  approveTrackClaimRequest(requestId: number): Promise<{ ok: boolean; reason?: string }>;
  rejectTrackClaimRequest(requestId: number): Promise<boolean>;
  claimTrackWithSecret(trackId: number, requesterProfileId: number, secret: string): Promise<{ ok: boolean; reason?: string }>;
  setTrackClaimableByCreators(trackId: number, claimable: boolean): Promise<Track | null>;
  syncNexPickClaimableFlags(): Promise<{ nexPickClaimable: number; verifiedNotClaimable: number }>;
  getAdminCreatorTrackExportRows(): Promise<AdminCreatorTrackExportRow[]>;
  getLatestBattleSummariesForCreatorProfile(creatorProfileId: number): Promise<
    {
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
      createdAt: Date;
    }[]
  >;
  getBoostTicketBalance(profileId: number): Promise<number>;
  grantBoostTickets(profileId: number, amount: number): Promise<number>;
  getCreatorAnalyticsSnapshot(
    profileId: number,
  ): Promise<{
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
    tracks: {
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
    }[];
    generatedAt: string;
  } | null>;
  getAdminInsightsSnapshot(): Promise<{
    generatedAt: string;
    totals: {
      creators: number;
      /** Registered auth accounts (`users` table). */
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
    };
    today: {
      newTracks: number;
      newUserSignups: number;
      plays: number;
      votes: number;
      battles: number;
    };
  }>;
  recordUserLogin(userId: string): Promise<void>;
  recordUserVisit(userId: string): Promise<void>;
  listAdminUserActivitySummary(): Promise<
    {
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
    }[]
  >;
  checkBoostEligibility(params: {
    ownerProfileId: number;
    trackId: number;
  }): Promise<{
    eligible: boolean;
    reason?: string;
    cooldownUntil?: Date | null;
    weeklyStartsUsed: number;
    weeklyStartsMax: number;
    hasActiveBoost: boolean;
  }>;
  activateBoostForTrack(params: {
    ownerProfileId: number;
    trackId: number;
    targetImpressions?: number;
  }): Promise<{ ok: boolean; reason?: string; usageLogId?: number; remainingTickets?: number; cooldownUntil?: Date | null }>;
  incrementBoostImpression(params: {
    trackId: number;
    viewerUserId?: string | null;
    sessionKey?: string | null;
  }): Promise<{
    counted: boolean;
    active: boolean;
    currentImpressions?: number;
    targetImpressions?: number;
    status?: "ACTIVE" | "COMPLETED";
  }>;
  getActiveBoostLogsForOwner(profileId: number): Promise<
    {
      id: number;
      trackId: number;
      title: string;
      targetImpressions: number;
      currentImpressions: number;
      status: string;
      startedAt: Date;
    }[]
  >;
}

export class DatabaseStorage implements IStorage {
  // To keep chart scoring fair under burst traffic, we debounce rankingScore recomputation.
  // Instead of recomputing immediately for every like/play/vote, we batch affected trackIds.
  private pendingRankingRecomputeTrackIds = new Set<number>();
  private rankingRecomputeFlushTimer: ReturnType<typeof setTimeout> | null = null;

  private get rankingRecomputeDebounceMs(): number {
    const raw = process.env.RANKING_RECOMPUTE_DEBOUNCE_MS;
    const n = raw ? Number(raw) : 5000;
    return Number.isFinite(n) ? n : 5000;
  }

  private get rankingRecomputeMaxBatch(): number {
    const raw = process.env.RANKING_RECOMPUTE_MAX_BATCH;
    const n = raw ? Number(raw) : 50;
    return Number.isFinite(n) ? n : 50;
  }

  /** Wall-clock cooldown after a boost run completes (default 48h). */
  private get boostCooldownMs(): number {
    const h = Number(process.env.BOOST_COOLDOWN_HOURS ?? 48);
    const hours = Number.isFinite(h) && h > 0 ? h : 48;
    return hours * 3600000;
  }

  /** Max boost activations per profile per track in a rolling 7-day window. */
  private get boostMaxStartsPerWeekPerTrack(): number {
    const n = Number(process.env.BOOST_MAX_STARTS_PER_WEEK_PER_TRACK ?? 3);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 3;
  }

  private scheduleRecomputeTrackRankingScore(trackId: number): void {
    if (!Number.isFinite(trackId)) return;
    void (async () => {
      const [row] = await db
        .select({ trackType: tracks.trackType })
        .from(tracks)
        .where(eq(tracks.id, trackId));
      if (row?.trackType === "video") {
        await this.recomputeTrackRankingScore(trackId);
        return;
      }
      this.pendingRankingRecomputeTrackIds.add(trackId);
      if (this.rankingRecomputeFlushTimer) return;
      this.rankingRecomputeFlushTimer = setTimeout(() => {
        void this.flushRankingRecomputeQueue();
      }, this.rankingRecomputeDebounceMs);
    })();
  }

  private async flushRankingRecomputeQueue(): Promise<void> {
    this.rankingRecomputeFlushTimer = null;

    const ids: number[] = [];
    this.pendingRankingRecomputeTrackIds.forEach((id) => ids.push(id));
    this.pendingRankingRecomputeTrackIds.clear();
    if (ids.length === 0) return;

    const batch = ids.slice(0, this.rankingRecomputeMaxBatch);
    const rest = ids.slice(batch.length);
    if (rest.length) {
      for (const id of rest) this.pendingRankingRecomputeTrackIds.add(id);
    }

    // Run sequentially to reduce DB concurrency under burst traffic.
    for (const id of batch) {
      await this.recomputeTrackRankingScore(id);
    }

    if (this.pendingRankingRecomputeTrackIds.size > 0) {
      // Keep draining the queue, but don't spin too aggressively.
      this.rankingRecomputeFlushTimer = setTimeout(() => {
        void this.flushRankingRecomputeQueue();
      }, 1000);
    }
  }

  private async ensureTrackMetricsRow(trackId: number, creatorId?: number): Promise<void> {
    if (!Number.isFinite(trackId)) return;
    const [existing] = await db.select({ id: trackMetrics.id }).from(trackMetrics).where(eq(trackMetrics.trackId, trackId));
    if (existing) return;

    let resolvedCreatorId = creatorId;
    if (!resolvedCreatorId) {
      const [t] = await db.select({ creatorId: tracks.creatorId }).from(tracks).where(eq(tracks.id, trackId));
      resolvedCreatorId = t?.creatorId;
    }
    const followerCount = resolvedCreatorId ? await this.getFollowerCount(resolvedCreatorId) : 0;
    await db.insert(trackMetrics).values({ trackId, followerCount }).onConflictDoNothing();
  }

  private async rebuildTrackMetrics(trackId: number): Promise<void> {
    const [t] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    if (!t) return;

    const [likesResult] = await db
      .select({ count: count() })
      .from(likes)
      .where(eq(likes.trackId, trackId));
    const likesCount = likesResult?.count || 0;

    const [playsResult] = await db
      .select({ count: count() })
      .from(trackPlays)
      .where(eq(trackPlays.trackId, trackId));
    const playsCount = playsResult?.count || 0;

    const [completedResult] = await db
      .select({ count: count() })
      .from(trackPlays)
      .where(and(eq(trackPlays.trackId, trackId), eq(trackPlays.completed, true)));
    const completedPlaysCount = completedResult?.count || 0;

    const [uniqueResult] = await db
      .select({
        count: sql<number>`count(distinct coalesce(${trackPlays.userId}, ${trackPlays.sessionKey}))`,
      })
      .from(trackPlays)
      .where(eq(trackPlays.trackId, trackId));
    const uniqueListenersCount = Number(uniqueResult?.count || 0);
    const relistenPlaysCount = Math.max(0, playsCount - uniqueListenersCount);

    const { totalBattles: battleTotalCount, wins: battleWinsCount } = await this.getTrackBattleStats(trackId);
    const followerCount = await this.getFollowerCount(t.creatorId);

    await db
      .insert(trackMetrics)
      .values({
        trackId,
        likesCount,
        playsCount,
        completedPlaysCount,
        uniqueListenersCount,
        relistenPlaysCount,
        battleTotalCount,
        battleWinsCount,
        followerCount,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: trackMetrics.trackId,
        set: {
          likesCount,
          playsCount,
          completedPlaysCount,
          uniqueListenersCount,
          relistenPlaysCount,
          battleTotalCount,
          battleWinsCount,
          followerCount,
          updatedAt: new Date(),
        },
      });
  }

  private async getTrackBattleStats(trackId: number): Promise<{ totalBattles: number; wins: number }> {
    const allBattles = await db.select().from(battles)
      .where(sql`${battles.winnerId} IS NOT NULL AND (${battles.trackAId} = ${trackId} OR ${battles.trackBId} = ${trackId})`);
    const totalBattles = allBattles.length;
    const wins = allBattles.filter((b) => b.winnerId === trackId).length;
    return { totalBattles, wins };
  }

  private async recomputeTrackRankingScore(trackId: number): Promise<void> {
    const [t] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    if (!t) return;

    await this.ensureTrackMetricsRow(trackId, t.creatorId);
    let [m] = await db.select().from(trackMetrics).where(eq(trackMetrics.trackId, trackId));
    if (!m) {
      await this.rebuildTrackMetrics(trackId);
      [m] = await db.select().from(trackMetrics).where(eq(trackMetrics.trackId, trackId));
      if (!m) return;
    }

    const completionRate = m.playsCount > 0 ? m.completedPlaysCount / m.playsCount : 0;
    const relistenRate = m.playsCount > 0 ? m.relistenPlaysCount / m.playsCount : 0;
    const saveRate = m.uniqueListenersCount > 0 ? Math.min(1, m.likesCount / m.uniqueListenersCount) : 0;
    const saveRelistenRate = (saveRate + relistenRate) / 2;

    const playCount = Math.max(t.playCount ?? 0, m.playsCount ?? 0);
    let rs: number;
    if (t.trackType === "video") {
      const commentCounts = await this.getCommentCountsForTracks([trackId]);
      rs = computeMvRankingScore({
        likesCount: m.likesCount,
        playCount,
        commentsCount: commentCounts[trackId] ?? 0,
        completionRate,
        saveRelistenRate,
        createdAt: t.createdAt,
      });
    } else {
      rs = computeRankingScore({
        battleWins: m.battleWinsCount,
        battleTotal: m.battleTotalCount,
        likesCount: m.likesCount,
        playCount,
        followerCount: m.followerCount,
        completionRate,
        saveRelistenRate,
        uniqueListeners: m.uniqueListenersCount,
        createdAt: t.createdAt,
      });
    }

    await db.update(tracks).set({ rankingScore: rs }).where(eq(tracks.id, trackId));
  }

  private async recomputeCreatorTrackRankingScores(creatorId: number): Promise<void> {
    const creatorTracks = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.creatorId, creatorId));
    for (const row of creatorTracks) {
      this.scheduleRecomputeTrackRankingScore(row.id);
    }
  }

  async createUser(u: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null }): Promise<any> {
    const values = {
      id: u.id,
      email: u.email ?? null,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      profileImageUrl: u.profileImageUrl ?? null,
    };

    const inserted = await db.insert(users).values(values).onConflictDoNothing().returning();
    if (inserted.length) return inserted[0];

    const [existing] = await db.select().from(users).where(eq(users.id, u.id));
    return existing;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row;
  }

  async upsertOAuthUser(u: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  }): Promise<void> {
    const emailNorm = u.email != null && String(u.email).trim() !== "" ? String(u.email).trim().toLowerCase() : null;

    /**
     * Move all rows pointing at `fromId` to `toId`, then delete `fromId`.
     * `toId` must already exist in `users` (FK targets profiles, likes, …).
     */
    const mergeUserId = async (fromId: string, toId: string) => {
      if (fromId === toId) return;
      await db.transaction(async (tx) => {
        const [pFrom] = await tx.select().from(profiles).where(eq(profiles.userId, fromId));
        const [pTo] = await tx.select().from(profiles).where(eq(profiles.userId, toId));

        if (pFrom && pTo) {
          await tx.update(tracks).set({ creatorId: pTo.id }).where(eq(tracks.creatorId, pFrom.id));
          await tx.delete(profiles).where(eq(profiles.id, pFrom.id));
        } else if (pFrom && !pTo) {
          await tx.update(profiles).set({ userId: toId }).where(eq(profiles.userId, fromId));
        }

        await tx.update(likes).set({ userId: toId }).where(eq(likes.userId, fromId));
        await tx.update(votes).set({ userId: toId }).where(eq(votes.userId, fromId));
        await tx.update(follows).set({ followerId: toId }).where(eq(follows.followerId, fromId));
        await tx.update(trackPlays).set({ userId: toId }).where(eq(trackPlays.userId, fromId));
        await tx.update(battleVotes).set({ userId: toId }).where(eq(battleVotes.userId, fromId));
        await tx.update(comments).set({ userId: toId }).where(eq(comments.userId, fromId));

        await tx.delete(users).where(eq(users.id, fromId));
      });
    };

    // 1) Ensure the canonical row (Google `sub` = u.id) exists without setting email yet — avoids
    //    users_email_unique violations when another row already has this address (old UUID user, etc.).
    await db
      .insert(users)
      .values({
        id: u.id,
        email: null,
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        profileImageUrl: u.profileImageUrl ?? null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          firstName: u.firstName ?? null,
          lastName: u.lastName ?? null,
          profileImageUrl: u.profileImageUrl ?? null,
          updatedAt: sql`now()`,
        },
      });

    // 2) Merge any other user rows that already use this email into u.id (must run before final email update).
    if (emailNorm) {
      const conflicts = await db
        .select()
        .from(users)
        .where(and(ne(users.id, u.id), sql`lower(trim(coalesce(${users.email}, ''))) = ${emailNorm}`));

      for (const row of conflicts) {
        await mergeUserId(row.id, u.id);
      }
    }

    // 3) Safe to set email: no other row can still hold this unique value.
    await db
      .update(users)
      .set({
        email: emailNorm ?? u.email ?? null,
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        profileImageUrl: u.profileImageUrl ?? null,
        updatedAt: sql`now()`,
      })
      .where(eq(users.id, u.id));
  }

  async getProfileByUserId(userId: string): Promise<Profile | undefined> {
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return p;
  }

  async getProfileByUsername(username: string): Promise<Profile | undefined> {
    const u = username.trim().toLowerCase();
    const [p] = await db.select().from(profiles).where(eq(profiles.username, u));
    return p;
  }

  async getProfile(id: number): Promise<(Profile & { tracks: Track[]; followerCount: number }) | undefined> {
    const [p] = await db.select().from(profiles).where(eq(profiles.id, id));
    if (!p) return undefined;
    const t = await db
      .select()
      .from(tracks)
      .where(and(eq(tracks.creatorId, id), eq(tracks.isDeleted, false)));
    const followerCount = await this.getFollowerCount(id);
    return { ...p, tracks: t, followerCount };
  }

  async createProfile(p: any): Promise<Profile> {
    const [np] = await db.insert(profiles).values(p).returning();
    return np;
  }

  async updateProfile(id: number, data: Partial<Profile>): Promise<Profile> {
    const [updated] = await db.update(profiles).set(data).where(eq(profiles.id, id)).returning();
    return updated;
  }

  async deactivateCreatorByUsername(username: string): Promise<{ ok: boolean; reason?: string; profileId?: number; archivedTrackCount?: number }> {
    const normalized = username.trim().toLowerCase();
    if (!normalized) return { ok: false, reason: "INVALID_USERNAME" };

    const [target] = await db.select().from(profiles).where(eq(profiles.username, normalized));
    if (!target) return { ok: false, reason: "NOT_FOUND" };
    if (target.role === "admin" || target.role === "founder") return { ok: false, reason: "PROTECTED_ROLE" };

    return db.transaction(async (tx) => {
      const [countRow] = await tx
        .select({ c: count() })
        .from(tracks)
        .where(and(eq(tracks.creatorId, target.id), eq(tracks.isDeleted, false)));
      const archivedTrackCount = Number(countRow?.c ?? 0);

      if (archivedTrackCount > 0) {
        await tx
          .update(tracks)
          .set({ isDeleted: true, archivedAt: new Date() })
          .where(and(eq(tracks.creatorId, target.id), eq(tracks.isDeleted, false)));
      }

      let tombstone = `deleted_${target.id}`;
      let suffix = 1;
      for (;;) {
        const [dup] = await tx.select().from(profiles).where(eq(profiles.username, tombstone));
        if (!dup || dup.id === target.id) break;
        suffix += 1;
        tombstone = `deleted_${target.id}_${suffix}`;
      }

      await tx
        .update(profiles)
        .set({
          username: tombstone,
          role: "listener",
          creatorApplicationStatus: "rejected",
          bio: null,
          aiToolUsed: null,
          nexNumber: null,
          totalScore: 0,
          isVerified: false,
        })
        .where(eq(profiles.id, target.id));

      return { ok: true, profileId: target.id, archivedTrackCount };
    });
  }

  async getPendingCreatorApplications(): Promise<{ profile: Profile; email: string | null }[]> {
    const rows = await db
      .select({ profile: profiles, email: users.email })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(eq(profiles.creatorApplicationStatus, "pending"));
    return rows.map((r) => ({ profile: r.profile, email: r.email ?? null }));
  }

  /**
   * NEW feed: same eligibility as the battle pool + `/api/tracks` default list,
   * but audio-only and sorted by recent activity (not upload date alone).
   */
  async getNewFeedTracks(limit = 500, searchQuery?: string): Promise<any[]> {
    const filters = [
      eq(tracks.isDeleted, false),
      eq(tracks.trackType, "audio"),
      inArray(tracks.status, [...BATTLE_AND_NEW_AUDIO_STATUSES]),
    ];

    const qNorm = typeof searchQuery === "string" ? searchQuery.trim().toLowerCase() : "";
    if (qNorm) {
      const likePattern = `%${qNorm}%`;
      filters.push(
        sql`(
          lower(${tracks.title}) like ${likePattern}
          or lower(coalesce(${tracks.artistName}, '')) like ${likePattern}
          or lower(${profiles.username}) like ${likePattern}
          or lower(${tracks.genre}) like ${likePattern}
        )`,
      );
    }

    const results = await db
      .select({ track: tracks, creator: profiles, metrics: trackMetrics })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .leftJoin(trackMetrics, eq(trackMetrics.trackId, tracks.id))
      .where(and(...filters))
      .orderBy(sql`coalesce(${tracks.lastPlayedAt}, ${tracks.createdAt}) desc`)
      .limit(limit);

    return results.map((r) => ({
      ...r.track,
      creator: r.creator,
      likesCount: r.metrics?.likesCount ?? 0,
      playsCount: r.metrics?.playsCount ?? 0,
    }));
  }

  async getTracks({
    status,
    mvChartListing,
    featured,
    limit,
    genre,
    sortBy,
    trackType,
    creatorId,
    q: searchQuery,
  }: {
    status?: string;
    mvChartListing?: boolean;
    featured?: boolean;
    limit?: number;
    genre?: string;
    sortBy?: "rankingScore" | "neoScore" | "createdAt";
    trackType?: string;
    creatorId?: number;
    q?: string;
  }): Promise<any[]> {
    let query = db
      .select({ track: tracks, creator: profiles, metrics: trackMetrics })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .leftJoin(trackMetrics, eq(trackMetrics.trackId, tracks.id))
      .$dynamic();
    const filters = [];
    if (trackType === "video") {
      filters.push(MV_CHART_STATUSES_SQL);
    } else if (status) {
      if (status === "MV" && mvChartListing) {
        filters.push(MV_CHART_STATUSES_SQL);
      } else {
        filters.push(eq(tracks.status, status));
      }
    } else {
      // Default: show battle/chart eligible tracks (includes auto-approved submissions)
      filters.push(sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL', 'APPROVED', 'CHART')`);
    }
    if (featured) filters.push(eq(tracks.isFeatured, true));
    if (genre) filters.push(eq(tracks.genre, genre));
    if (trackType) filters.push(eq(tracks.trackType, trackType));
    if (creatorId != null && Number.isFinite(creatorId)) {
      filters.push(eq(tracks.creatorId, creatorId));
    }
    const qNorm = typeof searchQuery === "string" ? searchQuery.trim().toLowerCase() : "";
    if (qNorm) {
      const likePattern = `%${qNorm}%`;
      filters.push(
        sql`(
          lower(${tracks.title}) like ${likePattern}
          or lower(coalesce(${tracks.artistName}, '')) like ${likePattern}
          or lower(${profiles.username}) like ${likePattern}
          or lower(${tracks.genre}) like ${likePattern}
        )`,
      );
    }
    filters.push(eq(tracks.isDeleted, false));
    if (filters.length) query = query.where(and(...filters));
    // Sort by requested field or default rankingScore
    if (sortBy === "neoScore") {
      query = query.orderBy(desc(tracks.neoScore));
    } else if (sortBy === "createdAt") {
      query = query.orderBy(desc(tracks.createdAt));
    } else {
      query = query.orderBy(desc(tracks.rankingScore));
    }
    if (limit) query = query.limit(limit);
    const results = await query;
    return results.map((r) => ({
      ...r.track,
      creator: r.creator,
      likesCount: r.metrics?.likesCount ?? 0,
      playsCount: r.metrics?.playsCount ?? 0,
    }));
  }

  async getTrack(id: number): Promise<any | undefined> {
    const [r] = await db
      .select({ track: tracks, creator: profiles, metrics: trackMetrics })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .leftJoin(trackMetrics, eq(trackMetrics.trackId, tracks.id))
      .where(and(eq(tracks.id, id), eq(tracks.isDeleted, false)));
    return r
      ? {
          ...r.track,
          creator: r.creator,
          likesCount: r.metrics?.likesCount ?? 0,
          playsCount: r.metrics?.playsCount ?? 0,
        }
      : undefined;
  }

  async getTracksByCreator(creatorId: number): Promise<any[]> {
    const results = await db
      .select({ track: tracks, creator: profiles, metrics: trackMetrics })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .leftJoin(trackMetrics, eq(trackMetrics.trackId, tracks.id))
      .where(and(eq(tracks.creatorId, creatorId), eq(tracks.isDeleted, false)))
      .orderBy(desc(tracks.rankingScore));
    return results.map((r) => ({
      ...r.track,
      creator: r.creator,
      likesCount: r.metrics?.likesCount ?? 0,
      playsCount: r.metrics?.playsCount ?? r.track.playCount ?? 0,
    }));
  }

  async getCreatorAnalyticsSnapshot(profileId: number) {
    const [p] = await db
      .select({ id: profiles.id, username: profiles.username })
      .from(profiles)
      .where(eq(profiles.id, profileId));
    if (!p) return null;

    const followerCount = await this.getFollowerCount(profileId);
    const boostTicketBalance = await this.getBoostTicketBalance(profileId);

    const trackRows = await db
      .select()
      .from(tracks)
      .where(and(eq(tracks.creatorId, profileId), eq(tracks.isDeleted, false)))
      .orderBy(desc(tracks.rankingScore));

    const ids = trackRows.map((t) => t.id);
    const battleByTrack = ids.length > 0 ? await this.getBattleStatsForTracks(ids) : {};
    const metricsRows =
      ids.length > 0
        ? await db.select().from(trackMetrics).where(inArray(trackMetrics.trackId, ids))
        : [];
    const metricsByTrackId = new Map(metricsRows.map((m) => [m.trackId, m]));

    const totals = {
      chartPlayCount: 0,
      metricsPlays: 0,
      completedPlays: 0,
      likes: 0,
      listenerVotes: 0,
      battles: 0,
      battleWins: 0,
      uniqueListeners: 0,
      relistens: 0,
    };

    const outTracks = trackRows.map((t) => {
      const m = metricsByTrackId.get(t.id);
      const bs = battleByTrack[t.id];
      totals.chartPlayCount += t.playCount;
      totals.listenerVotes += t.listenerVotes;
      if (m) {
        totals.metricsPlays += m.playsCount;
        totals.completedPlays += m.completedPlaysCount;
        totals.likes += m.likesCount;
        totals.battles += m.battleTotalCount;
        totals.battleWins += m.battleWinsCount;
        totals.uniqueListeners += m.uniqueListenersCount;
        totals.relistens += m.relistenPlaysCount;
      }

      return {
        id: t.id,
        title: t.title,
        status: t.status,
        genre: t.genre,
        trackType: t.trackType,
        chartPlayCount: t.playCount,
        listenerVotes: t.listenerVotes,
        rankingScore: t.rankingScore,
        neoScore: t.neoScore,
        winStreak: t.winStreak,
        lastPlayedAt: t.lastPlayedAt ? new Date(t.lastPlayedAt).toISOString() : null,
        createdAt: new Date(t.createdAt).toISOString(),
        metrics: m
          ? {
              likesCount: m.likesCount,
              playsCount: m.playsCount,
              completedPlaysCount: m.completedPlaysCount,
              uniqueListenersCount: m.uniqueListenersCount,
              relistenPlaysCount: m.relistenPlaysCount,
              battleTotalCount: m.battleTotalCount,
              battleWinsCount: m.battleWinsCount,
            }
          : null,
        battleStats: {
          totalBattles: bs?.totalBattles ?? 0,
          wins: bs?.wins ?? 0,
          winRate: bs?.winRate ?? 0,
        },
      };
    });

    return {
      profileId: p.id,
      username: p.username,
      followerCount,
      trackCount: trackRows.length,
      boostTicketBalance,
      totals,
      tracks: outTracks,
      generatedAt: new Date().toISOString(),
    };
  }

  async getAdminInsightsSnapshot() {
    const todayStartUtc = new Date();
    todayStartUtc.setUTCHours(0, 0, 0, 0);

    const memberRoleFilter = notInArray(profiles.role, ["admin", "founder", "nex"]);
    /** Real humans: not seed rows, not auto-created artist placeholders from import scripts. */
    const organicSignupFilter = and(
      memberRoleFilter,
      isNotNull(users.email),
      sql`trim(coalesce(${users.email}, '')) <> ''`,
      sql`${users.id} not like 'seed_user_%'`,
      sql`${users.id} not like 'artist_%'`,
      sql`lower(${users.email}) not like '%@artist.local'`,
      sql`lower(${users.email}) not like '%@neo.ai'`,
    );

    const [
      creatorsRow,
      usersTotalRow,
      tracksTotalRow,
      tracksApprovedRow,
      tracksPendingRow,
      tracksChartRow,
      metricsAggRow,
      votesTodayRow,
      playsTodayRow,
      battlesTodayRow,
      newTracksTodayRow,
      newUsersTodayRow,
    ] = await Promise.all([
      db.select({ c: count() }).from(profiles).where(eq(profiles.role, "creator")),
      // Profiles linked to a real auth row (excludes synthetic seed/artist import users).
      db.select({ c: count() }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(organicSignupFilter),
      db.select({ c: count() }).from(tracks).where(eq(tracks.isDeleted, false)),
      db.select({ c: count() }).from(tracks).where(and(eq(tracks.isDeleted, false), eq(tracks.status, "APPROVED"))),
      db.select({ c: count() }).from(tracks).where(and(eq(tracks.isDeleted, false), eq(tracks.status, "PENDING"))),
      db.select({ c: count() }).from(tracks).where(and(eq(tracks.isDeleted, false), eq(tracks.status, "CHART"))),
      db
        .select({
          plays: sql<number>`coalesce(sum(${trackMetrics.playsCount}), 0)`,
          likes: sql<number>`coalesce(sum(${trackMetrics.likesCount}), 0)`,
          listenerVotes: sql<number>`coalesce(sum(${tracks.listenerVotes}), 0)`,
          battles: sql<number>`coalesce(sum(${trackMetrics.battleTotalCount}), 0)`,
          battleWins: sql<number>`coalesce(sum(${trackMetrics.battleWinsCount}), 0)`,
        })
        .from(trackMetrics)
        .leftJoin(tracks, eq(tracks.id, trackMetrics.trackId)),
      db.select({ c: count() }).from(votes).where(gte(votes.createdAt, todayStartUtc)),
      db.select({ c: count() }).from(trackPlays).where(gte(trackPlays.playedAt, todayStartUtc)),
      db.select({ c: count() }).from(battles).where(gte(battles.createdAt, todayStartUtc)),
      db.select({ c: count() }).from(tracks).where(and(eq(tracks.isDeleted, false), gte(tracks.createdAt, todayStartUtc))),
      db
        .select({ c: count() })
        .from(profiles)
        .innerJoin(users, eq(users.id, profiles.userId))
        .where(and(organicSignupFilter, gte(profiles.createdAt, todayStartUtc))),
    ]);

    let activeBoosts = 0;
    try {
      const [activeBoostsRow] = await db
        .select({ c: count() })
        .from(boostStatus)
        .where(eq(boostStatus.isActive, true));
      activeBoosts = Number(activeBoostsRow?.c ?? 0);
    } catch (err: any) {
      if (err?.code !== "42P01") throw err;
    }

    const m = metricsAggRow[0];
    return {
      generatedAt: new Date().toISOString(),
      totals: {
        creators: Number(creatorsRow[0]?.c ?? 0),
        userSignups: Number(usersTotalRow[0]?.c ?? 0),
        tracks: Number(tracksTotalRow[0]?.c ?? 0),
        tracksApproved: Number(tracksApprovedRow[0]?.c ?? 0),
        tracksPending: Number(tracksPendingRow[0]?.c ?? 0),
        tracksChart: Number(tracksChartRow[0]?.c ?? 0),
        plays: Number(m?.plays ?? 0),
        likes: Number(m?.likes ?? 0),
        listenerVotes: Number(m?.listenerVotes ?? 0),
        battles: Number(m?.battles ?? 0),
        battleWins: Number(m?.battleWins ?? 0),
        activeBoosts,
      },
      today: {
        newTracks: Number(newTracksTodayRow[0]?.c ?? 0),
        newUserSignups: Number(newUsersTodayRow[0]?.c ?? 0),
        plays: Number(playsTodayRow[0]?.c ?? 0),
        votes: Number(votesTodayRow[0]?.c ?? 0),
        battles: Number(battlesTodayRow[0]?.c ?? 0),
      },
    };
  }

  private utcDayStart(d: Date): Date {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
  }

  private async ensureUserActivityStatsRow(userId: string): Promise<void> {
    const id = String(userId ?? "").trim();
    if (!id) return;
    try {
      await db.insert(userActivityStats).values({ userId: id }).onConflictDoNothing();
    } catch (err) {
      if (isMissingRelationError(err)) return;
      throw err;
    }
  }

  async recordUserVisit(userId: string): Promise<void> {
    const id = String(userId ?? "").trim();
    if (!id) return;
    await this.ensureUserActivityStatsRow(id);
    try {
      const now = new Date();
      const todayStart = this.utcDayStart(now);
      const [row] = await db.select().from(userActivityStats).where(eq(userActivityStats.userId, id));
      if (!row) return;
      const lastVisitDay = row.lastVisitAt ? this.utcDayStart(row.lastVisitAt) : null;
      const isNewDay = !lastVisitDay || lastVisitDay.getTime() < todayStart.getTime();
      await db
        .update(userActivityStats)
        .set({
          lastVisitAt: now,
          visitCount: isNewDay ? sql`${userActivityStats.visitCount} + 1` : row.visitCount,
          updatedAt: now,
        })
        .where(eq(userActivityStats.userId, id));
    } catch (err) {
      if (isMissingRelationError(err)) return;
      throw err;
    }
  }

  async recordUserLogin(userId: string): Promise<void> {
    const id = String(userId ?? "").trim();
    if (!id) return;
    await this.ensureUserActivityStatsRow(id);
    try {
      const now = new Date();
      await db
        .update(userActivityStats)
        .set({ lastLoginAt: now, updatedAt: now })
        .where(eq(userActivityStats.userId, id));
      await this.recordUserVisit(id);
    } catch (err) {
      if (isMissingRelationError(err)) return;
      throw err;
    }
  }

  private async incrementUserTracksPlayed(userId: string): Promise<void> {
    const id = String(userId ?? "").trim();
    if (!id) return;
    await this.ensureUserActivityStatsRow(id);
    try {
      await db
        .update(userActivityStats)
        .set({
          tracksPlayedCount: sql`${userActivityStats.tracksPlayedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(userActivityStats.userId, id));
    } catch (err) {
      if (isMissingRelationError(err)) return;
      throw err;
    }
  }

  private async incrementUserBattleVotes(userId: string): Promise<void> {
    const id = String(userId ?? "").trim();
    if (!id) return;
    await this.ensureUserActivityStatsRow(id);
    try {
      await db
        .update(userActivityStats)
        .set({
          battleVoteCount: sql`${userActivityStats.battleVoteCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(userActivityStats.userId, id));
    } catch (err) {
      if (isMissingRelationError(err)) return;
      throw err;
    }
  }

  private async backfillUserActivityCounters(): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO user_activity_stats (user_id, tracks_played_count, battle_vote_count, updated_at)
        SELECT u.id,
          COALESCE((SELECT count(DISTINCT tp.track_id)::int FROM track_plays tp WHERE tp.user_id = u.id), 0),
          COALESCE((SELECT count(*)::int FROM battle_votes bv WHERE bv.user_id = u.id), 0),
          now()
        FROM users u
        ON CONFLICT (user_id) DO UPDATE SET
          tracks_played_count = GREATEST(user_activity_stats.tracks_played_count, EXCLUDED.tracks_played_count),
          battle_vote_count = GREATEST(user_activity_stats.battle_vote_count, EXCLUDED.battle_vote_count),
          updated_at = now()
      `);
    } catch (err) {
      if (isMissingRelationError(err)) return;
      throw err;
    }
  }

  async listAdminUserActivitySummary() {
    await this.backfillUserActivityCounters();
    const activeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
      const rows = await db
        .select({
          userId: users.id,
          email: users.email,
          username: profiles.username,
          role: profiles.role,
          lastLoginAt: userActivityStats.lastLoginAt,
          lastVisitAt: userActivityStats.lastVisitAt,
          visitCount: userActivityStats.visitCount,
          tracksPlayedCount: userActivityStats.tracksPlayedCount,
          battleVoteCount: userActivityStats.battleVoteCount,
          signedUpAt: users.createdAt,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .leftJoin(userActivityStats, eq(userActivityStats.userId, users.id))
        .orderBy(desc(sql`coalesce(${userActivityStats.lastVisitAt}, ${users.createdAt})`));

      return rows.map((r) => {
        const lastVisitAt = r.lastVisitAt ?? null;
        return {
          userId: r.userId,
          email: r.email ?? null,
          username: r.username ?? null,
          role: r.role ?? null,
          lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
          lastVisitAt: lastVisitAt?.toISOString() ?? null,
          visitCount: Number(r.visitCount ?? 0),
          tracksPlayedCount: Number(r.tracksPlayedCount ?? 0),
          battleVoteCount: Number(r.battleVoteCount ?? 0),
          signedUpAt: r.signedUpAt?.toISOString() ?? null,
          activityStatus:
            lastVisitAt && lastVisitAt >= activeSince ? ("active" as const) : ("inactive" as const),
        };
      });
    } catch (err) {
      if (isMissingRelationError(err)) return [];
      throw err;
    }
  }

  async createTrack(t: any): Promise<Track> {
    const now = new Date();
    const isVideo = t.trackType === "video";
    const rs = isVideo
      ? computeMvRankingScore({
          likesCount: 0,
          playCount: 0,
          commentsCount: 0,
          completionRate: 0,
          saveRelistenRate: 0,
          createdAt: now,
        })
      : computeRankingScore({
          battleWins: 0,
          battleTotal: 0,
          likesCount: 0,
          playCount: 0,
          followerCount: 0,
          completionRate: 0,
          saveRelistenRate: 0,
          uniqueListeners: 0,
          createdAt: now,
        });
    const [nt] = await db.insert(tracks).values({ ...t, rankingScore: rs }).returning();
    await this.ensureTrackMetricsRow(nt.id, nt.creatorId);
    this.scheduleRecomputeTrackRankingScore(nt.id);
    return nt;
  }

  async hasVoted(userId: string, trackId: number): Promise<boolean> {
    const [r] = await db.select().from(votes)
      .where(and(eq(votes.userId, userId), eq(votes.trackId, trackId)));
    return !!r;
  }

  async voteTrack(userId: string, trackId: number): Promise<void> {
    const already = await this.hasVoted(userId, trackId);
    if (already) throw new Error("ALREADY_VOTED");

    await db.insert(votes).values({ userId, trackId });

    const [t] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    if (!t) return;
    const newVotes = t.listenerVotes + 1;

    await db.update(tracks).set({
      listenerVotes: sql`${tracks.listenerVotes} + 1`,
      neoScore: sql`(${tracks.aiCraftScore} * 0.7) + ((${tracks.listenerVotes} + 1) * 0.3)`,
    }).where(eq(tracks.id, trackId));
    this.scheduleRecomputeTrackRankingScore(trackId);
  }

  /** Any cheer row for this user+track (used when `likes.created_at` is missing on older DBs). */
  private async hasAnyLikeRow(userId: string, trackId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.trackId, trackId)))
      .limit(1);
    return !!row;
  }

  async hasLikedTrackToday(userId: string, trackId: number): Promise<boolean> {
    if (!userId) return false;
    const todayStartUtc = new Date();
    todayStartUtc.setUTCHours(0, 0, 0, 0);
    try {
      const [alreadyToday] = await db
        .select({ id: likes.id })
        .from(likes)
        .where(and(eq(likes.userId, userId), eq(likes.trackId, trackId), gte(likes.createdAt, todayStartUtc)))
        .limit(1);
      return !!alreadyToday;
    } catch (e: any) {
      if (isUndefinedColumnError(e) || isMissingRelationError(e)) {
        /** Legacy DB without `created_at` — one row per user+track. */
        try {
          return await this.hasAnyLikeRow(userId, trackId);
        } catch {
          return false;
        }
      }
      throw e;
    }
  }

  private async readTrackLikesCount(trackId: number): Promise<number> {
    const [m] = await db
      .select({ likesCount: trackMetrics.likesCount })
      .from(trackMetrics)
      .where(eq(trackMetrics.trackId, trackId))
      .limit(1);
    return Number(m?.likesCount ?? 0);
  }

  private async incrementLikeMetricsOnly(trackId: number): Promise<void> {
    try {
      await this.ensureTrackMetricsRow(trackId);
      await db.update(trackMetrics).set({
        likesCount: sql`${trackMetrics.likesCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(trackMetrics.trackId, trackId));
      this.scheduleRecomputeTrackRankingScore(trackId);
    } catch (metricsErr: any) {
      console.error("[like] incrementLikeMetricsOnly failed", {
        trackId,
        code: getPostgresSqlState(metricsErr),
        message: metricsErr?.message,
      });
    }
  }

  /** Recompute displayed like count from `likes` rows (avoids +1 drift / failed bumps). */
  private async syncLikeMetricsFromLikesTable(trackId: number): Promise<void> {
    try {
      const [likesResult] = await db
        .select({ count: count() })
        .from(likes)
        .where(eq(likes.trackId, trackId));
      const likesCount = Number(likesResult?.count ?? 0);
      await this.ensureTrackMetricsRow(trackId);
      await db.update(trackMetrics).set({
        likesCount,
        updatedAt: new Date(),
      }).where(eq(trackMetrics.trackId, trackId));
      this.scheduleRecomputeTrackRankingScore(trackId);
    } catch (metricsErr: any) {
      console.error("[like] sync metrics from likes table failed", {
        trackId,
        code: getPostgresSqlState(metricsErr),
        message: metricsErr?.message,
      });
      try {
        await this.rebuildTrackMetrics(trackId);
        this.scheduleRecomputeTrackRankingScore(trackId);
      } catch (rebuildErr: any) {
        console.error("[like] metrics rebuild failed", {
          trackId,
          code: getPostgresSqlState(rebuildErr),
          message: rebuildErr?.message,
        });
      }
    }
  }

  /** New UTC day on an existing cheer row — bump public count once. */
  private async refreshLikeForNewUtcDay(likeRowId: number, trackId: number): Promise<void> {
    try {
      await db.update(likes).set({ createdAt: new Date() }).where(eq(likes.id, likeRowId));
    } catch (e: any) {
      if (isUndefinedColumnError(e)) {
        throw new Error("ALREADY_LIKED_TODAY");
      }
      throw e;
    }
    await this.incrementLikeMetricsOnly(trackId);
  }

  private async insertLikeRowOrThrowDailyLimit(
    userId: string,
    trackId: number,
    todayStartUtc: Date,
  ): Promise<"inserted" | "refreshed"> {
    const handleUniqueConflict = async (): Promise<"refreshed"> => {
      try {
        const [existing] = await db
          .select({ id: likes.id, createdAt: likes.createdAt })
          .from(likes)
          .where(and(eq(likes.userId, userId), eq(likes.trackId, trackId)))
          .limit(1);
        if (!existing) throw new Error("LIKE_INSERT_CONFLICT");
        if (!existing.createdAt || existing.createdAt >= todayStartUtc) {
          throw new Error("ALREADY_LIKED_TODAY");
        }
        await this.refreshLikeForNewUtcDay(existing.id, trackId);
        return "refreshed";
      } catch (e: any) {
        if (e?.message === "ALREADY_LIKED_TODAY" || e?.message === "LIKE_INSERT_CONFLICT") throw e;
        if (isUndefinedColumnError(e)) {
          throw new Error("ALREADY_LIKED_TODAY");
        }
        throw e;
      }
    };

    try {
      await db.insert(likes).values({ userId, trackId });
      return "inserted";
    } catch (e: any) {
      if (isPostgresFkViolation(e)) {
        await this.createUser({ id: userId });
        try {
          await db.insert(likes).values({ userId, trackId });
          return "inserted";
        } catch (retryErr: any) {
          if (isPostgresUniqueViolation(retryErr)) {
            return await handleUniqueConflict();
          }
          throw retryErr;
        }
      }
      if (!isPostgresUniqueViolation(e)) throw e;
      return await handleUniqueConflict();
    }
  }

  private async bumpPlayMetricsSafe(
    trackId: number,
    hadAny: boolean,
    completed: boolean,
  ): Promise<void> {
    try {
      await this.ensureTrackMetricsRow(trackId);
      await db.update(trackMetrics).set({
        playsCount: sql`${trackMetrics.playsCount} + 1`,
        completedPlaysCount: sql`${trackMetrics.completedPlaysCount} + ${completed ? 1 : 0}`,
        uniqueListenersCount: sql`${trackMetrics.uniqueListenersCount} + ${hadAny ? 0 : 1}`,
        relistenPlaysCount: sql`${trackMetrics.relistenPlaysCount} + ${hadAny ? 1 : 0}`,
        updatedAt: new Date(),
      }).where(eq(trackMetrics.trackId, trackId));

      await db.update(tracks).set({
        playCount: sql`${tracks.playCount} + 1`,
        lastPlayedAt: new Date(),
      }).where(eq(tracks.id, trackId));
    } catch (metricsErr: any) {
      console.error("[play] metrics bump failed (play row saved)", {
        trackId,
        code: getPostgresSqlState(metricsErr),
        message: metricsErr?.message,
      });
      try {
        await this.rebuildTrackMetrics(trackId);
      } catch (rebuildErr: any) {
        console.error("[play] metrics rebuild failed", {
          trackId,
          code: getPostgresSqlState(rebuildErr),
          message: rebuildErr?.message,
        });
      }
    }
    this.scheduleRecomputeTrackRankingScore(trackId);
  }

  /**
   * One cheer per `(userId, trackId)` per UTC day. Other tracks same day have no shared cap.
   * Legacy DBs without `likes.created_at` fall back to insert + unique-row handling below.
   */
  async likeTrack(userId: string, trackId: number): Promise<{ likesCount: number }> {
    if (!String(userId ?? "").trim()) {
      throw new Error("MISSING_USER_ID");
    }
    if (!Number.isFinite(trackId) || trackId <= 0) {
      throw new Error("INVALID_TRACK_ID");
    }

    const [trackRow] = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, trackId)).limit(1);
    if (!trackRow) throw new Error("TRACK_NOT_FOUND");

    /** Rare sessions hit FK on `likes.user_id` if OAuth never persisted a row — fix before insert. */
    await this.createUser({ id: userId });
    const [userRow] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!userRow) throw new Error("USER_NOT_FOUND");

    const todayStartUtc = new Date();
    todayStartUtc.setUTCHours(0, 0, 0, 0);

    if (await this.hasLikedTrackToday(userId, trackId)) {
      throw new Error("ALREADY_LIKED_TODAY");
    }

    const outcome = await this.insertLikeRowOrThrowDailyLimit(userId, trackId, todayStartUtc);
    if (outcome === "inserted") {
      await this.incrementLikeMetricsOnly(trackId);
      void this.notifyTrackLiked(trackId, userId).catch(() => {});
    } else {
      await this.syncLikeMetricsFromLikesTable(trackId);
    }

    return { likesCount: await this.readTrackLikesCount(trackId) };
  }

  private playContextFields(opts?: {
    listenerCountry?: string | null;
    deviceClass?: string | null;
    referrerHost?: string | null;
  }) {
    return {
      listenerCountry: opts?.listenerCountry ?? null,
      deviceClass: opts?.deviceClass ?? null,
      referrerHost: opts?.referrerHost ?? null,
    };
  }

  async recordPlay(
    userId: string,
    trackId: number,
    opts?: { completed?: boolean; listenerCountry?: string | null; deviceClass?: string | null; referrerHost?: string | null },
  ): Promise<{ counted: boolean; completionUpdated: boolean }> {
    if (!String(userId ?? "").trim()) {
      return { counted: false, completionUpdated: false };
    }
    if (!Number.isFinite(trackId) || trackId <= 0) {
      return { counted: false, completionUpdated: false };
    }

    await this.createUser({ id: userId });

    const completed = !!opts?.completed;
    const [hadAny] = await db
      .select({ id: trackPlays.id })
      .from(trackPlays)
      .where(and(eq(trackPlays.userId, userId), eq(trackPlays.trackId, trackId)))
      .limit(1);
    // Spam prevention: same user can only increment once per 10 minutes per track
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const [recent] = await db.select().from(trackPlays)
      .where(and(
        eq(trackPlays.userId, userId),
        eq(trackPlays.trackId, trackId),
        gt(trackPlays.playedAt, tenMinutesAgo)
      ));

    if (recent) {
      if (completed && !recent.completed) {
        await db.update(trackPlays).set({ completed: true }).where(eq(trackPlays.id, recent.id));
        try {
          await this.ensureTrackMetricsRow(trackId);
          await db.update(trackMetrics).set({
            completedPlaysCount: sql`${trackMetrics.completedPlaysCount} + 1`,
            updatedAt: new Date(),
          }).where(eq(trackMetrics.trackId, trackId));
          this.scheduleRecomputeTrackRankingScore(trackId);
        } catch (metricsErr: any) {
          console.error("[play] completion metrics failed", {
            trackId,
            code: getPostgresSqlState(metricsErr),
            message: metricsErr?.message,
          });
        }
        return { counted: false, completionUpdated: true };
      }
      return { counted: false, completionUpdated: false };
    }

    const ctx = this.playContextFields(opts);
    try {
      await db.insert(trackPlays).values({ userId, trackId, completed, ...ctx });
    } catch (e: any) {
      if (isPostgresFkViolation(e)) {
        await this.createUser({ id: userId });
        await db.insert(trackPlays).values({ userId, trackId, completed, ...ctx });
      } else {
        throw e;
      }
    }

    await this.bumpPlayMetricsSafe(trackId, !!hadAny, completed);
    if (!hadAny) void this.incrementUserTracksPlayed(userId).catch(() => {});
    return { counted: true, completionUpdated: false };
  }

  async recordGuestPlay(
    sessionKey: string,
    trackId: number,
    opts?: { completed?: boolean; deviceClass?: string | null; referrerHost?: string | null },
  ): Promise<{ counted: boolean; completionUpdated: boolean }> {
    const key = String(sessionKey ?? "").trim();
    if (!key || key.length < 8) {
      return { counted: false, completionUpdated: false };
    }
    if (!Number.isFinite(trackId) || trackId <= 0) {
      return { counted: false, completionUpdated: false };
    }

    const completed = !!opts?.completed;
    const [hadAny] = await db
      .select({ id: trackPlays.id })
      .from(trackPlays)
      .where(and(eq(trackPlays.sessionKey, key), eq(trackPlays.trackId, trackId)))
      .limit(1);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const [recent] = await db
      .select()
      .from(trackPlays)
      .where(
        and(eq(trackPlays.sessionKey, key), eq(trackPlays.trackId, trackId), gt(trackPlays.playedAt, tenMinutesAgo)),
      );

    if (recent) {
      if (completed && !recent.completed) {
        await db.update(trackPlays).set({ completed: true }).where(eq(trackPlays.id, recent.id));
        try {
          await this.ensureTrackMetricsRow(trackId);
          await db.update(trackMetrics).set({
            completedPlaysCount: sql`${trackMetrics.completedPlaysCount} + 1`,
            updatedAt: new Date(),
          }).where(eq(trackMetrics.trackId, trackId));
          this.scheduleRecomputeTrackRankingScore(trackId);
        } catch (metricsErr: any) {
          console.error("[play/guest] completion metrics failed", {
            trackId,
            code: getPostgresSqlState(metricsErr),
            message: metricsErr?.message,
          });
        }
        return { counted: false, completionUpdated: true };
      }
      return { counted: false, completionUpdated: false };
    }

    const ctx = this.playContextFields(opts);
    await db.insert(trackPlays).values({ sessionKey: key, trackId, completed, ...ctx });
    await this.bumpPlayMetricsSafe(trackId, !!hadAny, completed);
    return { counted: true, completionUpdated: false };
  }

  async updateTrackStatus(id: number, status: string, aiCraftScore?: number): Promise<void> {
    const set: any = { status };
    if (aiCraftScore !== undefined) {
      set.aiCraftScore = aiCraftScore;
      set.neoScore = sql`(${aiCraftScore} * 0.7) + (${tracks.listenerVotes} * 0.3)`;
    }
    await db.update(tracks).set(set).where(eq(tracks.id, id));
    this.scheduleRecomputeTrackRankingScore(id);
  }

  /** Recompute MV chart scores from current plays/likes/comments (e.g. after deploy). */
  async recalculateAllMvRankingScores(): Promise<number> {
    const rows = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(and(eq(tracks.isDeleted, false), eq(tracks.trackType, "video"), MV_CHART_STATUSES_SQL));
    for (const row of rows) {
      await this.recomputeTrackRankingScore(row.id);
    }
    return rows.length;
  }

  async updateTrackMetadata(
    id: number,
    data: {
      title?: string;
      artistName?: string | null;
      genre?: string;
      coverImageUrl?: string | null;
      audioUrl?: string;
      mvUrl?: string | null;
      aiPrompt?: string | null;
      bumpAiPromptEditStats?: boolean;
    },
  ): Promise<Track | undefined> {
    const [existing] = await db.select().from(tracks).where(eq(tracks.id, id));
    if (!existing) return undefined;

    const updates: Partial<Track> = {};
    if (data.title !== undefined) updates.title = data.title;
    if (data.artistName !== undefined) updates.artistName = data.artistName;
    if (data.genre !== undefined) updates.genre = data.genre;
    if (data.coverImageUrl !== undefined) updates.coverImageUrl = data.coverImageUrl;
    if (data.audioUrl !== undefined) updates.audioUrl = data.audioUrl;
    if (data.mvUrl !== undefined) updates.mvUrl = data.mvUrl;
    if (data.aiPrompt !== undefined) updates.aiPrompt = data.aiPrompt;
    if (data.bumpAiPromptEditStats) {
      updates.aiPromptEditCount = (existing.aiPromptEditCount ?? 0) + 1;
      updates.aiPromptLastEditedAt = new Date();
    }

    if (Object.keys(updates).length === 0) return existing;

    const [updated] = await db.update(tracks).set(updates).where(eq(tracks.id, id)).returning();
    // Ranking might depend on metrics derived from battles/plays/likes; schedule a refresh anyway.
    this.scheduleRecomputeTrackRankingScore(updated.id);
    return updated;
  }

  async deleteTrackEditRequestComment(commentId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: comments.id, content: comments.content })
      .from(comments)
      .where(eq(comments.id, commentId));
    if (!row) return false;
    if (!/^\[EDIT REQUEST\]/i.test(row.content.trim())) return false;
    await db.delete(comments).where(eq(comments.id, commentId));
    return true;
  }

  async deleteTrack(trackId: number): Promise<boolean> {
    const [existing] = await db.select({ id: tracks.id }).from(tracks).where(and(eq(tracks.id, trackId), eq(tracks.isDeleted, false)));
    if (!existing) return false;

    await db.transaction(async (tx) => {
      const affectedBattles = await tx
        .select({ id: battles.id })
        .from(battles)
        .where(or(eq(battles.trackAId, trackId), eq(battles.trackBId, trackId), eq(battles.winnerId, trackId)));
      const battleIds = [...new Set(affectedBattles.map((b) => b.id))];
      if (battleIds.length) {
        await tx.update(battles).set({ isArchived: true }).where(inArray(battles.id, battleIds));
      }

      await tx.update(tracks).set({
        isDeleted: true,
        archivedAt: new Date(),
        status: "ARCHIVED",
      }).where(eq(tracks.id, trackId));
    });
    return true;
  }

  // Recalculate rankingScore for ALL tracks — run on startup
  async recalculateAllRankingScores(): Promise<void> {
    const allTracks = await db.select().from(tracks);
    for (const row of allTracks) {
      await this.rebuildTrackMetrics(row.id);
      await this.recomputeTrackRankingScore(row.id);
    }
  }

  async getAvailableBattleGenres(): Promise<string[]> {
    // Battle-eligible: approved/chart audio tracks only (not music videos).
    const genreResults = await db
      .select({ genre: tracks.genre, cnt: count() })
      .from(tracks)
      .where(battleEligibleTracksFilter())
      .groupBy(tracks.genre)
      .having(sql`count(*) >= 2`);

    const genres = genreResults.map(r => r.genre);

    // Always include "ALL" if there are >=2 eligible tracks total (enables cross-genre battles)
    const [{ total }] = await db
      .select({ total: count() })
      .from(tracks)
      .where(battleEligibleTracksFilter());

    if (Number(total) >= 2) {
      return ["ALL", ...genres];
    }
    return genres;
  }

  private async getBoostMultiplierByTrackIds(trackIds: number[]): Promise<Map<number, number>> {
    if (trackIds.length === 0) return new Map();
    let rows: { trackId: number }[] = [];
    try {
      rows = await db
        .select({ trackId: boostStatus.trackId })
        .from(boostStatus)
        .where(and(eq(boostStatus.isActive, true), inArray(boostStatus.trackId, trackIds)));
    } catch (err: any) {
      // Fallback for environments where boost_status migration is not applied yet.
      if (err?.code === "42P01") return new Map();
      throw err;
    }
    const out = new Map<number, number>();
    for (const row of rows) {
      out.set(row.trackId, 3);
    }
    return out;
  }

  /**
   * Tracks this listener already faced today (UTC): every battle they voted in
   * plus the latest battle they fully previewed (both sides listened), even if they skipped vote.
   */
  async getUserTodaysBattleExcludeTrackIds(userId: string): Promise<number[]> {
    const now = new Date();
    const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const exclude = new Set<number>();

    const votedRows = await db
      .select({ trackAId: battles.trackAId, trackBId: battles.trackBId })
      .from(battleVotes)
      .innerJoin(battles, eq(battleVotes.battleId, battles.id))
      .where(and(eq(battleVotes.userId, userId), gte(battleVotes.votedAt, startOfDayUTC)));
    for (const row of votedRows) {
      exclude.add(row.trackAId);
      exclude.add(row.trackBId);
    }

    const listenedRows = await db
      .select({
        battleId: battleListenCompletions.battleId,
        trackId: battleListenCompletions.trackId,
      })
      .from(battleListenCompletions)
      .where(
        and(
          eq(battleListenCompletions.userId, userId),
          gte(battleListenCompletions.completedAt, startOfDayUTC),
        ),
      );
    const listenCountByBattle = new Map<number, Set<number>>();
    for (const row of listenedRows) {
      const set = listenCountByBattle.get(row.battleId) ?? new Set<number>();
      set.add(row.trackId);
      listenCountByBattle.set(row.battleId, set);
    }
    let latestFullListenBattleId: number | null = null;
    for (const [battleId, heard] of listenCountByBattle) {
      if (heard.size < 2) continue;
      if (latestFullListenBattleId == null || battleId > latestFullListenBattleId) {
        latestFullListenBattleId = battleId;
      }
    }
    if (latestFullListenBattleId != null) {
      const [b] = await db
        .select({ trackAId: battles.trackAId, trackBId: battles.trackBId })
        .from(battles)
        .where(eq(battles.id, latestFullListenBattleId));
      if (b) {
        exclude.add(b.trackAId);
        exclude.add(b.trackBId);
      }
    }

    return [...exclude];
  }

  async createBattle(
    genre: string,
    requester?: { profileId?: number | null; userId?: string | null },
  ): Promise<any | null> {
    const requesterProfileId = requester?.profileId ?? null;
    const requesterUserId = requester?.userId?.trim() || null;
    const eligibleSql = battleEligibleTracksFilter();

    let pool = await db.select().from(tracks).where(
      genre && genre !== "ALL"
        ? and(eligibleSql, eq(tracks.genre, genre))
        : eligibleSql
    );

    if (pool.length < 2) {
      pool = await db.select().from(tracks).where(eligibleSql);
    }

    if (pool.length < 2) return null;

    if (requesterUserId) {
      const sessionExcludeIds = await this.getUserTodaysBattleExcludeTrackIds(requesterUserId);
      if (sessionExcludeIds.length > 0) {
        const exclude = new Set(sessionExcludeIds);
        const withoutSession = pool.filter((t) => !exclude.has(t.id));
        if (withoutSession.length < 2) return null;
        pool = withoutSession;
      }
    }

    const recentBattleRows = await db
      .select({ trackAId: battles.trackAId, trackBId: battles.trackBId })
      .from(battles)
      .orderBy(desc(battles.id))
      .limit(BATTLE_FAIRNESS_RECENT_BATTLE_COUNT);
    const recentTrackIds = new Set<number>();
    for (const row of recentBattleRows) {
      recentTrackIds.add(row.trackAId);
      recentTrackIds.add(row.trackBId);
    }

    const boostMultiplierByTrackId = await this.getBoostMultiplierByTrackIds(pool.map((t) => t.id));
    const fairnessMultiplierByTrackId = new Map<number, number>();
    for (const t of pool) {
      let m = boostMultiplierByTrackId.get(t.id) ?? 1;
      if (recentTrackIds.has(t.id)) m *= BATTLE_FAIRNESS_RECENT_WEIGHT_MUL;
      if (
        requesterProfileId != null &&
        Number.isFinite(requesterProfileId) &&
        t.creatorId === requesterProfileId
      ) {
        m *= BATTLE_FAIRNESS_REQUESTER_OWN_MUL;
      }
      fairnessMultiplierByTrackId.set(t.id, m);
    }

    // Random pairing across the full NEW/Radio-eligible audio pool (not only status=BATTLE_POOL).
    const [trackA, trackB] = weightedPickTwoDifferentCreators(pool, {
      multiplierByTrackId: fairnessMultiplierByTrackId,
    });

    const battleGenre = (genre && genre !== "ALL") ? genre : trackA.genre;

    const [battle] = await db.insert(battles).values({
      genre: battleGenre,
      trackAId: trackA.id,
      trackBId: trackB.id,
    }).returning();

    return this.getBattle(battle.id);
  }

  async getRisingTracks(q?: string): Promise<any[]> {
    const eligibleSql = inArray(tracks.status, [...BATTLE_AND_NEW_AUDIO_STATUSES]);

    const top100Rows = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(
        and(eligibleSql, eq(tracks.trackType, "audio"), eq(tracks.isDeleted, false)),
      )
      .orderBy(desc(tracks.rankingScore))
      .limit(100);
    const top100Ids = top100Rows.map((t) => t.id);

    const conds = [eligibleSql, eq(tracks.trackType, "audio")];
    const qNorm = typeof q === "string" ? q.trim().toLowerCase() : "";
    if (qNorm) {
      const likePattern = `%${qNorm}%`;
      conds.push(
        sql`(
          lower(${tracks.title}) like ${likePattern}
          or lower(coalesce(${tracks.artistName}, '')) like ${likePattern}
          or lower(${profiles.username}) like ${likePattern}
          or lower(${tracks.genre}) like ${likePattern}
        )`,
      );
    }
    if (top100Ids.length > 0) {
      conds.push(notInArray(tracks.id, top100Ids));
    }

    const rows = await db
      .select({ track: tracks, creator: profiles, metrics: trackMetrics })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .leftJoin(trackMetrics, eq(trackMetrics.trackId, tracks.id))
      .where(and(...conds))
      .orderBy(desc(tracks.playCount), desc(tracks.createdAt))
      .limit(100);

    const trackIds = rows.map((r) => r.track.id);
    const battleStats = await this.getBattleStatsForTracks(trackIds);

    return rows.map((r) => {
      const t = r.track;
      const s = battleStats[t.id];
      const playCount = resolvePublicPlayCount({
        playCount: t.playCount,
        playsCount: r.metrics?.playsCount,
      });
      return {
        ...t,
        playCount,
        creatorName: t.artistName || r.creator.username,
        likesCount: r.metrics?.likesCount ?? 0,
        playsCount: r.metrics?.playsCount ?? 0,
        totalBattles: s?.totalBattles ?? 0,
        wins: s?.wins ?? 0,
        winRate: s?.winRate ?? 0,
      };
    });
  }

  async addComment(userId: string, trackId: number, content: string): Promise<void> {
    const body = content.trim();
    if (!body) throw new Error("EMPTY_COMMENT");
    if (body.length > 2000) throw new Error("COMMENT_TOO_LONG");
    const [t] = await db
      .select({ id: tracks.id, trackType: tracks.trackType })
      .from(tracks)
      .where(eq(tracks.id, trackId));
    if (!t) throw new Error("TRACK_NOT_FOUND");
    await db.insert(comments).values({ userId, trackId, content: body });
    this.scheduleRecomputeTrackRankingScore(trackId);
  }

  async listTrackComments(
    trackId: number,
  ): Promise<{ id: number; userId: string; content: string; createdAt: Date; authorName: string | null }[]> {
    return db
      .select({
        id: comments.id,
        userId: comments.userId,
        content: comments.content,
        createdAt: comments.createdAt,
        authorName: profiles.username,
      })
      .from(comments)
      .leftJoin(profiles, eq(comments.userId, profiles.userId))
      .where(eq(comments.trackId, trackId))
      .orderBy(desc(comments.createdAt))
      .limit(200);
  }

  async getCommentCountsForTracks(trackIds: number[]): Promise<Record<number, number>> {
    if (trackIds.length === 0) return {};
    const rows = await db
      .select({
        trackId: comments.trackId,
        c: count(),
      })
      .from(comments)
      .where(
        and(
          inArray(comments.trackId, trackIds),
          sql`${comments.content} !~ '^\\[EDIT REQUEST\\]'`,
        ),
      )
      .groupBy(comments.trackId);
    const out: Record<number, number> = {};
    for (const row of rows) {
      out[row.trackId] = Number(row.c ?? 0);
    }
    return out;
  }

  async listPendingTrackEditRequests(): Promise<
    {
      commentId: number;
      trackId: number;
      trackTitle: string;
      requesterUsername: string | null;
      detail: string;
      proposedLink: string | null;
      createdAt: Date;
    }[]
  > {
    const rows = await db
      .select({
        commentId: comments.id,
        trackId: comments.trackId,
        trackTitle: tracks.title,
        requesterUsername: profiles.username,
        content: comments.content,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(tracks, eq(comments.trackId, tracks.id))
      .leftJoin(profiles, eq(comments.userId, profiles.userId))
      // Postgres: ~ avoids drizzle LIKE placeholder quirks; prefix is always ASCII from the API.
      .where(sql`${comments.content} ~ '^\\[EDIT REQUEST\\]'`)
      .orderBy(desc(comments.createdAt))
      .limit(100);

    return rows.map((r) => {
      const body = r.content ?? "";
      const detail = body
        .replace(/^\[EDIT REQUEST\]\s*/i, "")
        .split("\n[PROPOSED LINK]")[0]
        .trim();
      const linkMatch = body.match(/\[PROPOSED LINK\]\s*(https?:\/\/\S+)/i);
      return {
        commentId: r.commentId,
        trackId: r.trackId,
        trackTitle: r.trackTitle,
        requesterUsername: r.requesterUsername,
        detail,
        proposedLink: linkMatch?.[1] ?? null,
        createdAt: r.createdAt,
      };
    });
  }

  async getBattleStatsForTracks(trackIds: number[]): Promise<Record<number, { totalBattles: number; wins: number; winRate: number }>> {
    if (trackIds.length === 0) return {};
    const allBattles = await db.select().from(battles).where(sql`${battles.winnerId} IS NOT NULL`);
    const stats: Record<number, { battles: number; wins: number }> = {};
    const idSet = new Set(trackIds);
    for (const b of allBattles) {
      for (const id of [b.trackAId, b.trackBId]) {
        if (!idSet.has(id)) continue;
        if (!stats[id]) stats[id] = { battles: 0, wins: 0 };
        stats[id].battles += 1;
      }
      if (b.winnerId && idSet.has(b.winnerId)) {
        if (!stats[b.winnerId]) stats[b.winnerId] = { battles: 0, wins: 0 };
        stats[b.winnerId].wins += 1;
      }
    }
    const result: Record<number, { totalBattles: number; wins: number; winRate: number }> = {};
    for (const [id, s] of Object.entries(stats)) {
      result[Number(id)] = {
        totalBattles: s.battles,
        wins: s.wins,
        winRate: s.battles > 0 ? Math.round((s.wins / s.battles) * 100) : 0,
      };
    }
    return result;
  }

  async getBattle(id: number): Promise<any | null> {
    const [battle] = await db.select().from(battles).where(eq(battles.id, id));
    if (!battle) return null;

    const [trackA] = await db
      .select({ track: tracks, creator: profiles })
      .from(tracks).innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .where(eq(tracks.id, battle.trackAId));

    const [trackB] = await db
      .select({ track: tracks, creator: profiles })
      .from(tracks).innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .where(eq(tracks.id, battle.trackBId));

    return {
      ...battle,
      trackA: trackA
        ? { ...trackA.track, creatorName: trackA.track.artistName || trackA.creator.username }
        : null,
      trackB: trackB
        ? { ...trackB.track, creatorName: trackB.track.artistName || trackB.creator.username }
        : null,
    };
  }

  async hasBattleVoted(battleId: number, userId: string): Promise<boolean> {
    const [r] = await db.select().from(battleVotes)
      .where(and(eq(battleVotes.battleId, battleId), eq(battleVotes.userId, userId)));
    return !!r;
  }

  async recordBattleListenComplete(battleId: number, userId: string, trackId: number): Promise<void> {
    const [battle] = await db.select().from(battles).where(eq(battles.id, battleId));
    if (!battle) throw new Error("BATTLE_NOT_FOUND");
    if (trackId !== battle.trackAId && trackId !== battle.trackBId) throw new Error("TRACK_NOT_IN_BATTLE");
    await db
      .insert(battleListenCompletions)
      .values({ battleId, userId, trackId })
      .onConflictDoNothing({
        target: [battleListenCompletions.userId, battleListenCompletions.battleId, battleListenCompletions.trackId],
      });
  }

  private async assertBothBattleTracksListened(battle: Battle, userId: string): Promise<void> {
    const rows = await db
      .select({ trackId: battleListenCompletions.trackId })
      .from(battleListenCompletions)
      .where(
        and(
          eq(battleListenCompletions.battleId, battle.id),
          eq(battleListenCompletions.userId, userId),
          inArray(battleListenCompletions.trackId, [battle.trackAId, battle.trackBId]),
        ),
      );
    const heard = new Set(rows.map((r) => r.trackId));
    if (!heard.has(battle.trackAId) || !heard.has(battle.trackBId)) {
      throw new Error("BATTLE_LISTEN_INCOMPLETE");
    }
  }

  private async syncBattleTalliesFromVotes(battle: Battle): Promise<Battle> {
    const votes = await db
      .select({ trackId: battleVotes.trackId })
      .from(battleVotes)
      .where(eq(battleVotes.battleId, battle.id));

    let trackAVotes = 0;
    let trackBVotes = 0;
    for (const vote of votes) {
      if (vote.trackId === battle.trackAId) trackAVotes += 1;
      else if (vote.trackId === battle.trackBId) trackBVotes += 1;
    }

    const winnerId =
      trackAVotes === 0 && trackBVotes === 0
        ? null
        : trackAVotes >= trackBVotes
          ? battle.trackAId
          : battle.trackBId;

    if (
      battle.trackAVotes === trackAVotes &&
      battle.trackBVotes === trackBVotes &&
      battle.winnerId === winnerId
    ) {
      return battle;
    }

    const [updated] = await db
      .update(battles)
      .set({ trackAVotes, trackBVotes, winnerId })
      .where(eq(battles.id, battle.id))
      .returning();
    return updated ?? { ...battle, trackAVotes, trackBVotes, winnerId };
  }

  async recordBattleVote(
    battleId: number,
    userId: string,
    trackId: number,
    opts?: { skipListenCheck?: boolean },
  ): Promise<{ trackAVotes: number; trackBVotes: number; winnerId: number; trackAWinStreak: number; trackBWinStreak: number }> {
    let [battle] = await db.select().from(battles).where(eq(battles.id, battleId));
    if (!battle) throw new Error("BATTLE_NOT_FOUND");

    battle = await this.syncBattleTalliesFromVotes(battle);

    if (!opts?.skipListenCheck) {
      await this.assertBothBattleTracksListened(battle, userId);
    }

    const already = await this.hasBattleVoted(battleId, userId);
    if (already) throw new Error("ALREADY_VOTED");
    const prevWinnerId = battle.winnerId;

    if (trackId !== battle.trackAId && trackId !== battle.trackBId) {
      throw new Error("TRACK_NOT_IN_BATTLE");
    }

    // Record vote
    await db.insert(battleVotes).values({ battleId, userId, trackId });
    void this.incrementUserBattleVotes(userId).catch(() => {});

    // Increment vote count for the chosen track
    const isA = trackId === battle.trackAId;
    const newAVotes = battle.trackAVotes + (isA ? 1 : 0);
    const newBVotes = battle.trackBVotes + (!isA ? 1 : 0);

    // Determine winner (track with more votes; current battle tally after this vote)
    const winnerId = newAVotes >= newBVotes ? battle.trackAId : battle.trackBId;
    const loserId = winnerId === battle.trackAId ? battle.trackBId : battle.trackAId;

    await db.update(battles).set({
      trackAVotes: newAVotes,
      trackBVotes: newBVotes,
      winnerId,
    }).where(eq(battles.id, battleId));

    await this.ensureTrackMetricsRow(battle.trackAId);
    await this.ensureTrackMetricsRow(battle.trackBId);
    if (prevWinnerId == null) {
      await db.update(trackMetrics).set({
        battleTotalCount: sql`${trackMetrics.battleTotalCount} + 1`,
        updatedAt: new Date(),
      }).where(inArray(trackMetrics.trackId, [battle.trackAId, battle.trackBId]));
    }
    if (prevWinnerId !== winnerId) {
      if (prevWinnerId != null) {
        await db.update(trackMetrics).set({
          battleWinsCount: sql`greatest(${trackMetrics.battleWinsCount} - 1, 0)`,
          updatedAt: new Date(),
        }).where(eq(trackMetrics.trackId, prevWinnerId));
      }
      await db.update(trackMetrics).set({
        battleWinsCount: sql`${trackMetrics.battleWinsCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(trackMetrics.trackId, winnerId));
      await this.notifyBattleWin(winnerId, battleId);
    }

    // Recompute ranking scores from updated battle outcomes (debounced).
    this.scheduleRecomputeTrackRankingScore(battle.trackAId);
    this.scheduleRecomputeTrackRankingScore(battle.trackBId);

    // Update win streaks: winner +1, loser reset to 0
    await db.update(tracks).set({ winStreak: sql`${tracks.winStreak} + 1` }).where(eq(tracks.id, winnerId));
    await db.update(tracks).set({ winStreak: 0 }).where(eq(tracks.id, loserId));

    // Fetch updated streak values
    const [winnerTrack] = await db.select({ winStreak: tracks.winStreak }).from(tracks).where(eq(tracks.id, winnerId));
    const [loserTrack] = await db.select({ winStreak: tracks.winStreak }).from(tracks).where(eq(tracks.id, loserId));

    const trackAWinStreak = winnerId === battle.trackAId ? (winnerTrack?.winStreak ?? 0) : (loserTrack?.winStreak ?? 0);
    const trackBWinStreak = winnerId === battle.trackBId ? (winnerTrack?.winStreak ?? 0) : (loserTrack?.winStreak ?? 0);

    // Check if either battle track should be promoted to CHART
    await this.checkAndPromoteToChart(battle.trackAId);
    await this.checkAndPromoteToChart(battle.trackBId);

    return { trackAVotes: newAVotes, trackBVotes: newBVotes, winnerId, trackAWinStreak, trackBWinStreak };
  }

  async checkAndPromoteToChart(trackId: number): Promise<boolean> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    if (!track || track.isDeleted || track.status === "CHART") return false;
    // Only battle-eligible statuses can graduate to the official chart.
    if (!["BATTLE_POOL", "APPROVED", "PUBLISHED"].includes(track.status)) return false;

    const allBattles = await db.select().from(battles)
      .where(sql`${battles.winnerId} IS NOT NULL AND (${battles.trackAId} = ${trackId} OR ${battles.trackBId} = ${trackId})`);

    const totalBattles = allBattles.length;
    const wins = allBattles.filter(b => b.winnerId === trackId).length;
    const winRate = totalBattles > 0 ? wins / totalBattles : 0;

    if (totalBattles >= 10 && winRate >= 0.55) {
      await db.update(tracks).set({ status: "CHART" }).where(eq(tracks.id, trackId));
      this.scheduleRecomputeTrackRankingScore(trackId);
      return true;
    }
    return false;
  }

  /** Re-run chart promotion for tracks that earned it before deploy or while status was stale. */
  async reconcileChartPromotions(): Promise<number> {
    const rows = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(
        and(
          eq(tracks.isDeleted, false),
          sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL', 'APPROVED')`,
        ),
      );
    let promoted = 0;
    for (const row of rows) {
      if (await this.checkAndPromoteToChart(row.id)) promoted += 1;
    }
    return promoted;
  }

  async trackUrlExists(url: string): Promise<boolean> {
    const [existing] = await db.select({ id: tracks.id }).from(tracks).where(or(eq(tracks.audioUrl, url), eq(tracks.mvUrl, url))).limit(1);
    return !!existing;
  }

  async submitTrack(data: { title: string; artistName: string; genre: string; trackLink: string; trackType: string; aiPrompt?: string | null; coverImageUrl?: string | null; portfolioLink?: string | null; creatorId: number }): Promise<Track> {
    const isVideo = data.trackType === "video";
    const [t] = await db.insert(tracks).values({
      title: data.title,
      artistName: data.artistName,
      genre: data.genre,
      audioUrl: data.trackLink,
      mvUrl: isVideo ? data.trackLink : null,
      coverImageUrl: data.coverImageUrl?.trim() || null,
      creatorId: data.creatorId,
      trackType: data.trackType,
      // New submissions must be reviewed by admin before public chart/battle exposure.
      status: "PENDING",
      aiTool: "submitted",
      aiPrompt: data.aiPrompt || null,
      description: data.portfolioLink?.trim() || null,
      aiCraftScore: 0,
      listenerVotes: 0,
      neoScore: 0,
      rankingScore: 0,
      claimableByCreators: false,
      provenanceStatus: "verified",
    }).returning();
    return t;
  }

  async transferTrackOwnershipFromClaim(trackId: number, newCreatorProfileId: number): Promise<Track | null> {
    const [updated] = await db
      .update(tracks)
      .set({
        creatorId: newCreatorProfileId,
        claimableByCreators: false,
        provenanceStatus: "verified",
      })
      .where(eq(tracks.id, trackId))
      .returning();
    return updated ?? null;
  }

  async createTrackClaimRequest(trackId: number, requesterProfileId: number): Promise<{ created: boolean; duplicate: boolean }> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    if (!track) return { created: false, duplicate: false };
    if (!track.claimableByCreators) return { created: false, duplicate: false };
    if (track.creatorId === requesterProfileId) return { created: false, duplicate: false };
    const [existing] = await db
      .select()
      .from(trackClaimRequests)
      .where(
        and(eq(trackClaimRequests.trackId, trackId), eq(trackClaimRequests.requesterProfileId, requesterProfileId)),
      );
    if (existing) {
      if (existing.status === "pending") return { created: false, duplicate: true };
      await db
        .update(trackClaimRequests)
        .set({ status: "pending" })
        .where(eq(trackClaimRequests.id, existing.id));
      return { created: true, duplicate: false };
    }
    await db.insert(trackClaimRequests).values({
      trackId,
      requesterProfileId,
      status: "pending",
    });
    return { created: true, duplicate: false };
  }

  async listPendingTrackClaimRequests(): Promise<
    Array<{
      id: number;
      trackId: number;
      trackTitle: string;
      requesterProfileId: number;
      requesterUsername: string;
      createdAt: Date;
    }>
  > {
    const rows = await db
      .select({
        id: trackClaimRequests.id,
        trackId: trackClaimRequests.trackId,
        trackTitle: tracks.title,
        requesterProfileId: trackClaimRequests.requesterProfileId,
        requesterUsername: profiles.username,
        createdAt: trackClaimRequests.createdAt,
      })
      .from(trackClaimRequests)
      .innerJoin(tracks, eq(tracks.id, trackClaimRequests.trackId))
      .innerJoin(profiles, eq(profiles.id, trackClaimRequests.requesterProfileId))
      .where(eq(trackClaimRequests.status, "pending"))
      .orderBy(desc(trackClaimRequests.createdAt));
    return rows;
  }

  async approveTrackClaimRequest(requestId: number): Promise<{ ok: boolean; reason?: string }> {
    const [req] = await db.select().from(trackClaimRequests).where(eq(trackClaimRequests.id, requestId));
    if (!req || req.status !== "pending") return { ok: false, reason: "not_found" };
    const [track] = await db.select().from(tracks).where(eq(tracks.id, req.trackId));
    if (!track) return { ok: false, reason: "track_missing" };
    if (!track.claimableByCreators) return { ok: false, reason: "not_claimable" };
    await db.transaction(async (tx) => {
      await tx
        .update(tracks)
        .set({
          creatorId: req.requesterProfileId,
          claimableByCreators: false,
          provenanceStatus: "verified",
        })
        .where(eq(tracks.id, req.trackId));
      await tx
        .update(trackClaimRequests)
        .set({ status: "approved" })
        .where(eq(trackClaimRequests.id, requestId));
      await tx
        .update(trackClaimRequests)
        .set({ status: "rejected" })
        .where(
          and(eq(trackClaimRequests.trackId, req.trackId), ne(trackClaimRequests.id, requestId)),
        );
      // Admin approval reward: grant 10 boost tickets to the claiming creator.
      const [ticketRow] = await tx
        .select()
        .from(boostTickets)
        .where(eq(boostTickets.userProfileId, req.requesterProfileId));
      if (!ticketRow) {
        await tx.insert(boostTickets).values({
          userProfileId: req.requesterProfileId,
          amount: 10,
        });
      } else {
        await tx
          .update(boostTickets)
          .set({
            amount: ticketRow.amount + 10,
            updatedAt: new Date(),
          })
          .where(eq(boostTickets.userProfileId, req.requesterProfileId));
      }
    });
    return { ok: true };
  }

  async rejectTrackClaimRequest(requestId: number): Promise<boolean> {
    const [req] = await db.select().from(trackClaimRequests).where(eq(trackClaimRequests.id, requestId));
    if (!req || req.status !== "pending") return false;
    await db
      .update(trackClaimRequests)
      .set({ status: "rejected" })
      .where(eq(trackClaimRequests.id, requestId));
    return true;
  }

  async claimTrackWithSecret(
    trackId: number,
    requesterProfileId: number,
    secret: string,
  ): Promise<{ ok: boolean; reason?: string }> {
    const expected = (process.env.TRACK_CLAIM_SECRET || "").trim();
    if (!expected || secret.trim() !== expected) return { ok: false, reason: "invalid_secret" };
    const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    if (!track) return { ok: false, reason: "not_found" };
    if (!track.claimableByCreators) return { ok: false, reason: "not_claimable" };
    if (track.creatorId === requesterProfileId) return { ok: false, reason: "already_owner" };
    await db.transaction(async (tx) => {
      await tx
        .update(tracks)
        .set({
          creatorId: requesterProfileId,
          claimableByCreators: false,
          provenanceStatus: "verified",
        })
        .where(eq(tracks.id, trackId));
      await tx
        .update(trackClaimRequests)
        .set({ status: "rejected" })
        .where(eq(trackClaimRequests.trackId, trackId));
    });
    return { ok: true };
  }

  async setTrackClaimableByCreators(trackId: number, claimable: boolean): Promise<Track | null> {
    const patch: { claimableByCreators: boolean; provenanceStatus?: string } = {
      claimableByCreators: claimable,
    };
    if (claimable) patch.provenanceStatus = "nex_pick";
    const [updated] = await db
      .update(tracks)
      .set(patch)
      .where(eq(tracks.id, trackId))
      .returning();
    return updated ?? null;
  }

  async syncNexPickClaimableFlags(): Promise<{ nexPickClaimable: number; verifiedNotClaimable: number }> {
    await db
      .update(tracks)
      .set({ claimableByCreators: true })
      .where(and(eq(tracks.isDeleted, false), eq(tracks.provenanceStatus, "nex_pick")));
    await db
      .update(tracks)
      .set({ claimableByCreators: false })
      .where(and(eq(tracks.isDeleted, false), eq(tracks.provenanceStatus, "verified")));
    const [row] = await db
      .select({
        nexPickClaimable: sql<number>`count(*) filter (where ${tracks.isDeleted} = false and ${tracks.provenanceStatus} = 'nex_pick' and ${tracks.claimableByCreators} = true)::int`,
        verifiedNotClaimable: sql<number>`count(*) filter (where ${tracks.isDeleted} = false and ${tracks.provenanceStatus} = 'verified' and ${tracks.claimableByCreators} = false)::int`,
      })
      .from(tracks);
    return {
      nexPickClaimable: Number(row?.nexPickClaimable ?? 0),
      verifiedNotClaimable: Number(row?.verifiedNotClaimable ?? 0),
    };
  }

  /** Live catalog export — claimable FALSE first, then TRUE; battle wins desc within each group. */
  async getAdminCreatorTrackExportRows(): Promise<AdminCreatorTrackExportRow[]> {
    const rows = await db
      .select({
        track: tracks,
        profile: profiles,
        email: users.email,
        metrics: trackMetrics,
      })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .leftJoin(users, eq(users.id, profiles.userId))
      .leftJoin(trackMetrics, eq(trackMetrics.trackId, tracks.id))
      .where(eq(tracks.isDeleted, false))
      .orderBy(desc(tracks.rankingScore));

    const trackIds = rows.map((r) => r.track.id);
    const battleStats = trackIds.length > 0 ? await this.getBattleStatsForTracks(trackIds) : {};

    const audioChart = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(
        and(eq(tracks.isDeleted, false), eq(tracks.status, "CHART"), eq(tracks.trackType, "audio")),
      )
      .orderBy(desc(tracks.rankingScore));
    const audioChartRank = new Map(audioChart.map((t, i) => [t.id, i + 1]));

    const mvChart = await db
      .select({ id: tracks.id, playCount: tracks.playCount, rankingScore: tracks.rankingScore })
      .from(tracks)
      .where(and(eq(tracks.isDeleted, false), eq(tracks.status, "MV"), eq(tracks.trackType, "video")))
      .orderBy(desc(tracks.rankingScore), desc(tracks.playCount));
    const mvChartRank = new Map(mvChart.map((t, i) => [t.id, i + 1]));

    const out: AdminCreatorTrackExportRow[] = rows.map((r) => {
      const t = r.track;
      const bs = battleStats[t.id];
      const battleWins = bs?.wins ?? r.metrics?.battleWinsCount ?? 0;
      const plays = resolvePublicPlayCount({
        playCount: t.playCount,
        playsCount: r.metrics?.playsCount,
      });
      const likes = r.metrics?.likesCount ?? 0;
      const creatorName = String(t.artistName ?? "").trim() || r.profile.username;
      const adminSubmittedForArtist =
        r.profile.role === "admin" &&
        creatorName.toLowerCase() !== String(r.profile.username ?? "").trim().toLowerCase();
      const chartRank =
        t.status === "CHART" && t.trackType === "audio"
          ? (audioChartRank.get(t.id) ?? null)
          : t.status === "MV" && t.trackType === "video"
            ? (mvChartRank.get(t.id) ?? null)
            : null;

      return {
        trackId: t.id,
        creatorName,
        ytHandle: extractYoutubeHandle(t.audioUrl, t.mvUrl, r.profile.username, [
          t.description,
          t.aiPrompt,
        ]),
        trackName: String(t.title ?? "").trim(),
        provenanceStatus: t.provenanceStatus ?? "verified",
        claimableByCreators: !!t.claimableByCreators,
        plays,
        likes,
        battleWins,
        chartRank,
        trackUrl: publicTrackPageUrl(t.id),
        registrationEmail: adminSubmittedForArtist
          ? ""
          : isExportableRegistrationEmail(r.email),
      };
    });

    out.sort((a, b) => {
      if (a.claimableByCreators !== b.claimableByCreators) {
        return a.claimableByCreators ? 1 : -1;
      }
      if (b.battleWins !== a.battleWins) return b.battleWins - a.battleWins;
      if (b.plays !== a.plays) return b.plays - a.plays;
      return a.trackId - b.trackId;
    });
    return out;
  }

  async getBoostTicketBalance(profileId: number): Promise<number> {
    const [row] = await db
      .select({ amount: boostTickets.amount })
      .from(boostTickets)
      .where(eq(boostTickets.userProfileId, profileId));
    return row?.amount ?? 0;
  }

  async grantBoostTickets(profileId: number, amount: number): Promise<number> {
    const delta = Math.max(0, Math.floor(amount));
    if (delta <= 0) return this.getBoostTicketBalance(profileId);
    const [existing] = await db
      .select()
      .from(boostTickets)
      .where(eq(boostTickets.userProfileId, profileId));
    if (!existing) {
      await db.insert(boostTickets).values({
        userProfileId: profileId,
        amount: delta,
      });
      return delta;
    }
    const [updated] = await db
      .update(boostTickets)
      .set({
        amount: existing.amount + delta,
        updatedAt: new Date(),
      })
      .where(eq(boostTickets.userProfileId, profileId))
      .returning({ amount: boostTickets.amount });
    return updated?.amount ?? existing.amount + delta;
  }

  async checkBoostEligibility(params: {
    ownerProfileId: number;
    trackId: number;
  }): Promise<{
    eligible: boolean;
    reason?: string;
    cooldownUntil?: Date | null;
    weeklyStartsUsed: number;
    weeklyStartsMax: number;
    hasActiveBoost: boolean;
  }> {
    const now = new Date();
    const weeklyStartsMax = this.boostMaxStartsPerWeekPerTrack;
    const [track] = await db.select().from(tracks).where(eq(tracks.id, params.trackId));
    if (!track) {
      return {
        eligible: false,
        reason: "track_not_found",
        weeklyStartsUsed: 0,
        weeklyStartsMax,
        hasActiveBoost: false,
      };
    }
    if (track.creatorId !== params.ownerProfileId) {
      return {
        eligible: false,
        reason: "not_owner",
        weeklyStartsUsed: 0,
        weeklyStartsMax,
        hasActiveBoost: false,
      };
    }

    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const [cntRow] = await db
      .select({ c: count() })
      .from(boostUsageLogs)
      .where(
        and(
          eq(boostUsageLogs.ownerProfileId, params.ownerProfileId),
          eq(boostUsageLogs.trackId, params.trackId),
          gte(boostUsageLogs.startedAt, weekAgo),
        ),
      );
    const weeklyStartsUsed = Number(cntRow?.c ?? 0);

    const [active] = await db
      .select({ id: boostUsageLogs.id })
      .from(boostUsageLogs)
      .where(and(eq(boostUsageLogs.trackId, params.trackId), eq(boostUsageLogs.status, "ACTIVE")));
    const hasActiveBoost = !!active;

    const [st] = await db.select().from(boostStatus).where(eq(boostStatus.trackId, params.trackId));
    const cooldownUntil = st?.cooldownUntil ?? null;
    const inCooldown = !!(cooldownUntil && cooldownUntil.getTime() > now.getTime());

    if (hasActiveBoost) {
      return {
        eligible: false,
        reason: "already_active",
        cooldownUntil,
        weeklyStartsUsed,
        weeklyStartsMax,
        hasActiveBoost: true,
      };
    }
    if (inCooldown) {
      return {
        eligible: false,
        reason: "cooldown_active",
        cooldownUntil,
        weeklyStartsUsed,
        weeklyStartsMax,
        hasActiveBoost: false,
      };
    }
    if (weeklyStartsUsed >= weeklyStartsMax) {
      return {
        eligible: false,
        reason: "weekly_limit",
        cooldownUntil,
        weeklyStartsUsed,
        weeklyStartsMax,
        hasActiveBoost: false,
      };
    }

    return {
      eligible: true,
      cooldownUntil,
      weeklyStartsUsed,
      weeklyStartsMax,
      hasActiveBoost: false,
    };
  }

  async activateBoostForTrack(params: {
    ownerProfileId: number;
    trackId: number;
    targetImpressions?: number;
  }): Promise<{ ok: boolean; reason?: string; usageLogId?: number; remainingTickets?: number; cooldownUntil?: Date | null }> {
    const target = Math.max(100, Math.floor(params.targetImpressions ?? 1000));
    const eligibility = await this.checkBoostEligibility({
      ownerProfileId: params.ownerProfileId,
      trackId: params.trackId,
    });
    if (!eligibility.eligible) {
      return {
        ok: false,
        reason: eligibility.reason,
        cooldownUntil: eligibility.cooldownUntil ?? null,
      };
    }

    const [ticketRow] = await db
      .select()
      .from(boostTickets)
      .where(eq(boostTickets.userProfileId, params.ownerProfileId));
    const balance = ticketRow?.amount ?? 0;
    if (balance <= 0) return { ok: false, reason: "no_tickets" };

    let usageLogId = 0;
    await db.transaction(async (tx) => {
      if (!ticketRow) {
        throw new Error("BOOST_TICKET_ROW_MISSING");
      }
      const nextAmount = Math.max(0, ticketRow.amount - 1);
      await tx
        .update(boostTickets)
        .set({ amount: nextAmount, updatedAt: new Date() })
        .where(eq(boostTickets.userProfileId, params.ownerProfileId));
      const [created] = await tx
        .insert(boostUsageLogs)
        .values({
          trackId: params.trackId,
          ownerProfileId: params.ownerProfileId,
          targetImpressions: target,
          currentImpressions: 0,
          status: "ACTIVE",
        })
        .returning({ id: boostUsageLogs.id });
      usageLogId = created.id;
      const now = new Date();
      await tx
        .insert(boostStatus)
        .values({
          trackId: params.trackId,
          isActive: true,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: boostStatus.trackId,
          set: {
            isActive: true,
            updatedAt: now,
          },
        });
    });
    return { ok: true, usageLogId, remainingTickets: balance - 1 };
  }

  async incrementBoostImpression(params: {
    trackId: number;
    viewerUserId?: string | null;
    sessionKey?: string | null;
  }): Promise<{
    counted: boolean;
    active: boolean;
    currentImpressions?: number;
    targetImpressions?: number;
    status?: "ACTIVE" | "COMPLETED";
  }> {
    const [active] = await db
      .select()
      .from(boostUsageLogs)
      .where(
        and(
          eq(boostUsageLogs.trackId, params.trackId),
          eq(boostUsageLogs.status, "ACTIVE"),
        ),
      )
      .orderBy(desc(boostUsageLogs.startedAt))
      .limit(1);
    if (!active) return { counted: false, active: false };

    const viewerUserId = params.viewerUserId?.trim() || null;
    const sessionKey = params.sessionKey?.trim() || null;
    if (!viewerUserId && !sessionKey) {
      return {
        counted: false,
        active: true,
        currentImpressions: active.currentImpressions,
        targetImpressions: active.targetImpressions,
        status: active.status as "ACTIVE" | "COMPLETED",
      };
    }

    const duplicate = viewerUserId
      ? await db
          .select({ id: boostImpressionEvents.id })
          .from(boostImpressionEvents)
          .where(
            and(
              eq(boostImpressionEvents.usageLogId, active.id),
              eq(boostImpressionEvents.viewerUserId, viewerUserId),
            ),
          )
          .limit(1)
      : await db
          .select({ id: boostImpressionEvents.id })
          .from(boostImpressionEvents)
          .where(
            and(
              eq(boostImpressionEvents.usageLogId, active.id),
              eq(boostImpressionEvents.sessionKey, sessionKey!),
            ),
          )
          .limit(1);

    if (duplicate.length > 0) {
      return {
        counted: false,
        active: true,
        currentImpressions: active.currentImpressions,
        targetImpressions: active.targetImpressions,
        status: active.status as "ACTIVE" | "COMPLETED",
      };
    }

    const [updated] = await db.transaction(async (tx) => {
      await tx.insert(boostImpressionEvents).values({
        usageLogId: active.id,
        trackId: active.trackId,
        viewerUserId,
        sessionKey,
      });
      const [row] = await tx
        .update(boostUsageLogs)
        .set({
          currentImpressions: active.currentImpressions + 1,
          status:
            active.currentImpressions + 1 >= active.targetImpressions
              ? "COMPLETED"
              : "ACTIVE",
        })
        .where(eq(boostUsageLogs.id, active.id))
        .returning({
          currentImpressions: boostUsageLogs.currentImpressions,
          targetImpressions: boostUsageLogs.targetImpressions,
          status: boostUsageLogs.status,
        });

      const completed = row.status === "COMPLETED";
      const now = new Date();
      const coolUntil = new Date(now.getTime() + this.boostCooldownMs);
      const [st] = await tx.select().from(boostStatus).where(eq(boostStatus.trackId, active.trackId));
      const nextTotal = (st?.totalImpressions ?? 0) + 1;
      if (!st) {
        await tx.insert(boostStatus).values({
          trackId: active.trackId,
          isActive: !completed,
          totalImpressions: nextTotal,
          lastUsedAt: completed ? now : null,
          cooldownUntil: completed ? coolUntil : null,
          updatedAt: now,
        });
      } else {
        await tx
          .update(boostStatus)
          .set({
            totalImpressions: nextTotal,
            isActive: !completed,
            lastUsedAt: completed ? now : st.lastUsedAt,
            cooldownUntil: completed ? coolUntil : st.cooldownUntil,
            updatedAt: now,
          })
          .where(eq(boostStatus.trackId, active.trackId));
      }

      return [row];
    });

    return {
      counted: true,
      active: true,
      currentImpressions: updated.currentImpressions,
      targetImpressions: updated.targetImpressions,
      status: updated.status as "ACTIVE" | "COMPLETED",
    };
  }

  async getActiveBoostLogsForOwner(profileId: number): Promise<
    {
      id: number;
      trackId: number;
      title: string;
      targetImpressions: number;
      currentImpressions: number;
      status: string;
      startedAt: Date;
    }[]
  > {
    const rows = await db
      .select({
        id: boostUsageLogs.id,
        trackId: boostUsageLogs.trackId,
        title: tracks.title,
        targetImpressions: boostUsageLogs.targetImpressions,
        currentImpressions: boostUsageLogs.currentImpressions,
        status: boostUsageLogs.status,
        startedAt: boostUsageLogs.startedAt,
      })
      .from(boostUsageLogs)
      .innerJoin(tracks, eq(tracks.id, boostUsageLogs.trackId))
      .where(eq(boostUsageLogs.ownerProfileId, profileId))
      .orderBy(desc(boostUsageLogs.startedAt))
      .limit(50);
    return rows;
  }

  async getLatestBattleSummariesForCreatorProfile(
    creatorProfileId: number,
  ): Promise<
    {
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
      createdAt: Date;
    }[]
  > {
    const myTrackRows = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(eq(tracks.creatorId, creatorProfileId));
    if (myTrackRows.length === 0) return [];
    const trackIds = myTrackRows.map((t) => t.id);
    const battleRows = await db
      .select()
      .from(battles)
      .where(or(inArray(battles.trackAId, trackIds), inArray(battles.trackBId, trackIds)))
      .orderBy(desc(battles.createdAt));

    const out: {
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
      createdAt: Date;
    }[] = [];
    const usedMyTrack = new Set<number>();

    for (const b of battleRows) {
      const inA = trackIds.includes(b.trackAId);
      const inB = trackIds.includes(b.trackBId);
      if (!inA && !inB) continue;
      const myTrackId = inA ? b.trackAId : b.trackBId;
      if (usedMyTrack.has(myTrackId)) continue;
      usedMyTrack.add(myTrackId);

      const oppId = myTrackId === b.trackAId ? b.trackBId : b.trackAId;
      const myVotes = myTrackId === b.trackAId ? b.trackAVotes : b.trackBVotes;
      const oppVotes = myTrackId === b.trackAId ? b.trackBVotes : b.trackAVotes;

      const [myT] = await db
        .select({ title: tracks.title, coverImageUrl: tracks.coverImageUrl })
        .from(tracks)
        .where(eq(tracks.id, myTrackId));
      const [oppT] = await db
        .select({ title: tracks.title, coverImageUrl: tracks.coverImageUrl })
        .from(tracks)
        .where(eq(tracks.id, oppId));
      if (!myT || !oppT) continue;

      out.push({
        trackId: myTrackId,
        trackTitle: myT.title,
        trackCoverImageUrl: myT.coverImageUrl ?? null,
        battleId: b.id,
        opponentTrackId: oppId,
        opponentTitle: oppT.title,
        opponentCoverImageUrl: oppT.coverImageUrl ?? null,
        myVotes,
        opponentVotes: oppVotes,
        iWon: b.winnerId != null && b.winnerId === myTrackId,
        createdAt: b.createdAt,
      });
      if (out.length >= 2) break;
    }

    return out;
  }

  async followCreator(followerId: string, creatorProfileId: number): Promise<void> {
    const already = await this.isFollowing(followerId, creatorProfileId);
    if (!already) {
      await db.insert(follows).values({ followerId, creatorProfileId });
      const creatorTracks = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.creatorId, creatorProfileId));
      for (const row of creatorTracks) {
        await this.ensureTrackMetricsRow(row.id, creatorProfileId);
        await db.update(trackMetrics).set({
          followerCount: sql`${trackMetrics.followerCount} + 1`,
          updatedAt: new Date(),
        }).where(eq(trackMetrics.trackId, row.id));
      }
      await this.recomputeCreatorTrackRankingScores(creatorProfileId);
    }
  }

  async unfollowCreator(followerId: string, creatorProfileId: number): Promise<void> {
    await db.delete(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.creatorProfileId, creatorProfileId))
    );
    const creatorTracks = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.creatorId, creatorProfileId));
    for (const row of creatorTracks) {
      await this.ensureTrackMetricsRow(row.id, creatorProfileId);
      await db.update(trackMetrics).set({
        followerCount: sql`greatest(${trackMetrics.followerCount} - 1, 0)`,
        updatedAt: new Date(),
      }).where(eq(trackMetrics.trackId, row.id));
    }
    await this.recomputeCreatorTrackRankingScores(creatorProfileId);
  }

  async isFollowing(followerId: string, creatorProfileId: number): Promise<boolean> {
    const [r] = await db.select().from(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.creatorProfileId, creatorProfileId))
    );
    return !!r;
  }

  async getFollowerCount(creatorProfileId: number): Promise<number> {
    const [r] = await db.select({ count: count() }).from(follows).where(eq(follows.creatorProfileId, creatorProfileId));
    return r?.count || 0;
  }

  async getDailyBattleVoteCount(userId: string): Promise<number> {
    const now = new Date();
    const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const [r] = await db
      .select({ count: count() })
      .from(battleVotes)
      .where(and(eq(battleVotes.userId, userId), gte(battleVotes.votedAt, startOfDayUTC)));
    return r?.count || 0;
  }

  async getTodayStats(): Promise<{ totalVotesToday: number; battlesPlayedToday: number; tracksInPool: number; newTracksToday: number }> {
    const now = new Date();
    const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [votesResult] = await db
      .select({ count: count() })
      .from(battleVotes)
      .where(gte(battleVotes.votedAt, startOfDayUTC));

    const [battlesResult] = await db
      .select({ count: count() })
      .from(battles)
      .where(gte(battles.createdAt, startOfDayUTC));

    const [poolResult] = await db
      .select({ count: count() })
      .from(tracks)
      .where(battleEligibleTracksFilter());

    const [newTracksResult] = await db
      .select({ count: count() })
      .from(tracks)
      .where(gte(tracks.createdAt, startOfDayUTC));

    return {
      totalVotesToday: votesResult?.count || 0,
      battlesPlayedToday: battlesResult?.count || 0,
      tracksInPool: poolResult?.count || 0,
      newTracksToday: newTracksResult?.count || 0,
    };
  }

  async getRecentBattle(): Promise<any | null> {
    const [battle] = await db.select().from(battles)
      .orderBy(desc(battles.createdAt))
      .limit(1);
    if (!battle) return null;
    return this.getBattle(battle.id);
  }

  /**
   * Studio-role profiles plus anyone who owns at least one **publicly listed** track
   * (same statuses as chart/NEW — excludes pending review-only uploads).
   */
  async getCreators(): Promise<Profile[]> {
    const directoryRoles = ["creator", "nex", "founder", "admin"] as const;
    const byRole = await db.select().from(profiles).where(inArray(profiles.role, [...directoryRoles]));
    const trackCreatorIds = await db
      .selectDistinct({ creatorId: tracks.creatorId })
      .from(tracks)
      .where(
        and(
          eq(tracks.isDeleted, false),
          sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL', 'APPROVED', 'CHART')`,
        ),
      );
    const ids = Array.from(new Set(trackCreatorIds.map((r) => r.creatorId)));
    const fromTracks =
      ids.length > 0 ? await db.select().from(profiles).where(inArray(profiles.id, ids)) : [];
    const map = new Map<number, Profile>();
    for (const p of byRole) map.set(p.id, p);
    for (const p of fromTracks) map.set(p.id, p);
    return Array.from(map.values());
  }

  /** Creator directory cards — same play/battle numbers as chart & NEW lists. */
  async getCreatorDirectoryEntries(): Promise<
    Array<{
      id: number;
      username: string;
      country: string | null;
      avatarUrl: string | null;
      role: string;
      displayName: string;
      totalTracks: number;
      totalPlays: number;
      totalLikes: number;
      battleWins: number;
      battleTotal: number;
      featuredTrackTitle: string | null;
      popularityScore: number;
      provenanceStatus: "verified" | "nex_pick";
      claimProfileTrackId: number | null;
    }>
  > {
    const profiles = await this.getCreators();
    const listedTracks = await this.getTracks({ limit: 5000, sortBy: "rankingScore" });
    const trackIds = listedTracks.map((t) => t.id);
    const battleStats = trackIds.length > 0 ? await this.getBattleStatsForTracks(trackIds) : {};

    type Agg = {
      totalTracks: number;
      totalPlays: number;
      totalLikes: number;
      battleWins: number;
      battleTotal: number;
      stageName: string | null;
      featuredTrackTitle: string | null;
      topPlayCount: number;
      hasVerifiedTrack: boolean;
      claimProfileTrackId: number | null;
    };
    const agg = new Map<number, Agg>();

    for (const t of listedTracks) {
      const cid = t.creatorId as number;
      let row = agg.get(cid);
      if (!row) {
        row = {
          totalTracks: 0,
          totalPlays: 0,
          totalLikes: 0,
          battleWins: 0,
          battleTotal: 0,
          stageName: null,
          featuredTrackTitle: null,
          topPlayCount: -1,
          hasVerifiedTrack: false,
          claimProfileTrackId: null,
        };
        agg.set(cid, row);
      }
      row.totalTracks += 1;
      const prov = String((t as { provenanceStatus?: string | null }).provenanceStatus ?? "verified");
      if (prov !== "nex_pick") row.hasVerifiedTrack = true;
      if (
        prov === "nex_pick" &&
        (t as { claimableByCreators?: boolean }).claimableByCreators &&
        row.claimProfileTrackId == null
      ) {
        row.claimProfileTrackId = t.id as number;
      }
      const plays = resolvePublicPlayCount({
        playCount: t.playCount,
        playsCount: (t as { playsCount?: number }).playsCount,
      });
      row.totalPlays += plays;
      row.totalLikes += Number((t as { likesCount?: number }).likesCount ?? 0);
      const bs = battleStats[t.id];
      if (bs) {
        row.battleWins += bs.wins;
        row.battleTotal += bs.totalBattles;
      }
      const artist = String(t.artistName ?? "").trim();
      if (artist) row.stageName = artist;
      if (plays >= row.topPlayCount) {
        row.topPlayCount = plays;
        row.featuredTrackTitle = t.title;
      }
    }

    const rows = profiles.map((p) => {
      const a = agg.get(p.id);
      const totalTracks = a?.totalTracks ?? 0;
      const totalPlays = a?.totalPlays ?? 0;
      const totalLikes = a?.totalLikes ?? 0;
      const battleWins = a?.battleWins ?? 0;
      const battleTotal = a?.battleTotal ?? 0;
      const popularityScore = computeCreatorPopularityScore({
        totalPlays,
        totalLikes,
        battleWins,
      });
      const provenanceStatus = a?.hasVerifiedTrack ? ("verified" as const) : ("nex_pick" as const);
      return {
        id: p.id,
        username: p.username,
        country: p.country ?? null,
        avatarUrl: p.avatarUrl ?? null,
        role: p.role,
        displayName: a?.stageName || p.username,
        totalTracks,
        totalPlays,
        totalLikes,
        battleWins,
        battleTotal,
        featuredTrackTitle: a?.featuredTrackTitle ?? null,
        popularityScore,
        provenanceStatus,
        claimProfileTrackId: provenanceStatus === "nex_pick" ? (a?.claimProfileTrackId ?? null) : null,
      };
    });

    rows.sort((a, b) => {
      if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore;
      return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
    });

    return rows;
  }

  async createNotification(input: {
    recipientUserId: string;
    type: string;
    title: string;
    body: string;
    trackId?: number | null;
    href?: string | null;
  }): Promise<void> {
    if (!String(input.recipientUserId ?? "").trim()) return;
    try {
      await db.insert(notifications).values({
        recipientUserId: input.recipientUserId,
        type: input.type,
        title: input.title,
        body: input.body,
        trackId: input.trackId ?? null,
        href: input.href ?? null,
      });
    } catch (err) {
      if (isMissingRelationError(err)) return;
      throw err;
    }
  }

  async listNotifications(
    recipientUserId: string,
    opts?: { limit?: number },
  ): Promise<
    {
      id: number;
      type: string;
      title: string;
      body: string;
      trackId: number | null;
      href: string | null;
      readAt: Date | null;
      createdAt: Date;
    }[]
  > {
    try {
      const limit = opts?.limit ?? 40;
      return await db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          body: notifications.body,
          trackId: notifications.trackId,
          href: notifications.href,
          readAt: notifications.readAt,
          createdAt: notifications.createdAt,
        })
        .from(notifications)
        .where(eq(notifications.recipientUserId, recipientUserId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    } catch (err) {
      if (isMissingRelationError(err)) return [];
      throw err;
    }
  }

  async getUnreadNotificationCount(recipientUserId: string): Promise<number> {
    try {
      const [row] = await db
        .select({ c: count() })
        .from(notifications)
        .where(and(eq(notifications.recipientUserId, recipientUserId), isNull(notifications.readAt)));
      return Number(row?.c ?? 0);
    } catch (err) {
      if (isMissingRelationError(err)) return 0;
      throw err;
    }
  }

  async markNotificationRead(recipientUserId: string, notificationId: number): Promise<boolean> {
    try {
      const updated = await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.recipientUserId, recipientUserId),
          ),
        )
        .returning({ id: notifications.id });
      return updated.length > 0;
    } catch (err) {
      if (isMissingRelationError(err)) return false;
      throw err;
    }
  }

  async markAllNotificationsRead(recipientUserId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(eq(notifications.recipientUserId, recipientUserId), isNull(notifications.readAt)));
    } catch (err) {
      if (isMissingRelationError(err)) return;
      throw err;
    }
  }

  private async emailCreator(
    recipientUserId: string,
    send: (to: string) => Promise<{ sent: boolean; reason?: string; detail?: string }>,
  ): Promise<{ sent: boolean; skipReason?: string; detail?: string }> {
    if (!isEmailEnabled()) {
      return { sent: false, skipReason: "email_disabled" };
    }
    const user = await this.getUserById(recipientUserId);
    const email = user?.email?.trim();
    if (!email) {
      console.warn("[email] no address for user", recipientUserId);
      return { sent: false, skipReason: "no_creator_email" };
    }
    try {
      const result = await send(email);
      if (!result.sent) {
        console.warn("[email] not sent", { recipientUserId, to: email, ...result });
        return { sent: false, skipReason: result.reason, detail: result.detail };
      }
      console.info("[email] sent", { recipientUserId, to: email });
      return { sent: true };
    } catch (err) {
      console.warn("[email] creator notify failed", err);
      return { sent: false, skipReason: "exception", detail: err instanceof Error ? err.message : String(err) };
    }
  }

  async notifyTrackReviewed(trackId: number, status: string): Promise<{
    notified: boolean;
    email: { sent: boolean; skipReason?: string; detail?: string };
  }> {
    const empty = { notified: false, email: { sent: false, skipReason: "skipped" as const } };
    const track = await this.getTrack(trackId);
    const recipientUserId = track?.creator?.userId;
    if (!recipientUserId) {
      console.warn("[notify] track review — missing creator userId", { trackId, status });
      return { ...empty, email: { sent: false, skipReason: "no_creator_user" } };
    }

    const title = track.title ?? "Your track";
    if (status === "REJECTED") {
      await this.createNotification({
        recipientUserId,
        type: "track_rejected",
        title: "Track not approved",
        body: `"${title}" was not approved this time. You can submit an updated version.`,
        trackId,
        href: "/my-tracks",
      });
      const email = await this.emailCreator(recipientUserId, (to) =>
        sendTrackRejectedEmail({ to, trackTitle: title }),
      );
      return { notified: true, email };
    }

    const approvedStatuses = ["BATTLE_POOL", "PUBLISHED", "MV", "APPROVED", "CHART"] as const;
    if ((approvedStatuses as readonly string[]).includes(status)) {
      const dest =
        status === "MV"
          ? "Music Video chart"
          : status === "CHART"
            ? "Music chart"
            : status === "BATTLE_POOL"
              ? "Battle pool"
              : "NEX";
      await this.createNotification({
        recipientUserId,
        type: "track_approved",
        title: "Track approved!",
        body: `"${title}" is live on NEX (${dest}).`,
        trackId,
        href: `/track/${trackId}`,
      });
      const email = await this.emailCreator(recipientUserId, (to) =>
        sendTrackApprovedEmail({ to, trackTitle: title, trackId, destination: dest }),
      );
      return { notified: true, email };
    }

    return empty;
  }

  async notifyBattleWin(
    winnerTrackId: number,
    battleId: number,
  ): Promise<{ sent: boolean; skipReason?: string; detail?: string }> {
    const track = await this.getTrack(winnerTrackId);
    const recipientUserId = track?.creator?.userId;
    if (!recipientUserId) {
      console.warn("[notify] battle win — missing creator userId", { battleId, winnerTrackId });
      return { sent: false, skipReason: "no_creator_user" };
    }

    const title = track.title ?? "Your track";
    const email = await this.emailCreator(recipientUserId, (to) =>
      sendBattleWinEmail({ to, trackTitle: title, trackId: winnerTrackId }),
    );
    if (!email.sent) {
      console.warn("[notify] battle win email not sent", {
        battleId,
        winnerTrackId,
        recipientUserId,
        skipReason: email.skipReason,
        detail: email.detail,
      });
    } else {
      console.info("[notify] battle win email sent", { battleId, winnerTrackId, recipientUserId });
    }
    return email;
  }

  async notifyTrackLiked(trackId: number, likerUserId: string): Promise<void> {
    const track = await this.getTrack(trackId);
    const recipientUserId = track?.creator?.userId;
    if (!recipientUserId || recipientUserId === likerUserId) return;

    const todayStartUtc = new Date();
    todayStartUtc.setUTCHours(0, 0, 0, 0);

    try {
      const [existing] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientUserId, recipientUserId),
            eq(notifications.type, "track_liked"),
            eq(notifications.trackId, trackId),
            gte(notifications.createdAt, todayStartUtc),
          ),
        )
        .limit(1);
      if (existing) return;
    } catch (err) {
      if (isMissingRelationError(err)) return;
      throw err;
    }

    const title = track.title ?? "Your track";
    await this.createNotification({
      recipientUserId,
      type: "track_liked",
      title: "New cheer on your track",
      body: `Someone cheered "${title}" today on NEX.`,
      trackId,
      href: `/track/${trackId}`,
    });
    void this.emailCreator(recipientUserId, (to) =>
      sendTrackLikedEmail({ to, trackTitle: title, trackId }),
    );
  }

  async captureDailySnapshots(snapshotDate = utcMidnight()): Promise<{
    snapshotDate: string;
    trackRows: number;
    platformCaptured: boolean;
  }> {
    const day = utcMidnight(snapshotDate);
    const dayIso = day.toISOString().slice(0, 10);

    try {
      await db.select({ id: dataDailyTrackSnapshots.id }).from(dataDailyTrackSnapshots).limit(1);
    } catch (err: any) {
      if (getPostgresSqlState(err) === "42P01") {
        console.warn("[snapshots] tables missing — run npm run db:migrate-b2b");
        return { snapshotDate: dayIso, trackRows: 0, platformCaptured: false };
      }
      throw err;
    }

    const insights = await this.getAdminInsightsSnapshot();

    const allTracks = await db
      .select({
        track: tracks,
        metrics: trackMetrics,
      })
      .from(tracks)
      .leftJoin(trackMetrics, eq(trackMetrics.trackId, tracks.id));

    const audioChart = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(and(eq(tracks.isDeleted, false), eq(tracks.status, "CHART"), eq(tracks.trackType, "audio")))
      .orderBy(desc(tracks.rankingScore));
    const audioChartRank = new Map(audioChart.map((t, i) => [t.id, i + 1]));

    const mvChart = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(and(eq(tracks.isDeleted, false), eq(tracks.status, "MV"), eq(tracks.trackType, "video")))
      .orderBy(desc(tracks.rankingScore), desc(tracks.playCount));
    const mvChartRank = new Map(mvChart.map((t, i) => [t.id, i + 1]));

    let trackRows = 0;
    for (const row of allTracks) {
      const t = row.track;
      const m = row.metrics;
      const chartRank =
        t.status === "CHART" && t.trackType === "audio"
          ? (audioChartRank.get(t.id) ?? null)
          : t.status === "MV" && t.trackType === "video"
            ? (mvChartRank.get(t.id) ?? null)
            : null;

      await db
        .insert(dataDailyTrackSnapshots)
        .values({
          snapshotDate: day,
          trackId: t.id,
          title: t.title,
          genre: t.genre,
          aiTool: t.aiTool,
          trackType: t.trackType,
          status: t.status,
          provenanceStatus: t.provenanceStatus ?? "verified",
          isDeleted: t.isDeleted,
          playsCount: m?.playsCount ?? t.playCount ?? 0,
          likesCount: m?.likesCount ?? 0,
          completedPlaysCount: m?.completedPlaysCount ?? 0,
          uniqueListenersCount: m?.uniqueListenersCount ?? 0,
          battleWinsCount: m?.battleWinsCount ?? 0,
          battleTotalCount: m?.battleTotalCount ?? 0,
          chartRank,
          rankingScore: t.rankingScore ?? 0,
          listenerVotes: t.listenerVotes ?? 0,
        })
        .onConflictDoUpdate({
          target: [dataDailyTrackSnapshots.snapshotDate, dataDailyTrackSnapshots.trackId],
          set: {
            title: t.title,
            genre: t.genre,
            aiTool: t.aiTool,
            trackType: t.trackType,
            status: t.status,
            provenanceStatus: t.provenanceStatus ?? "verified",
            isDeleted: t.isDeleted,
            playsCount: m?.playsCount ?? t.playCount ?? 0,
            likesCount: m?.likesCount ?? 0,
            completedPlaysCount: m?.completedPlaysCount ?? 0,
            uniqueListenersCount: m?.uniqueListenersCount ?? 0,
            battleWinsCount: m?.battleWinsCount ?? 0,
            battleTotalCount: m?.battleTotalCount ?? 0,
            chartRank,
            rankingScore: t.rankingScore ?? 0,
            listenerVotes: t.listenerVotes ?? 0,
          },
        });
      trackRows += 1;
    }

    await db
      .insert(dataDailyPlatformSnapshots)
      .values({
        snapshotDate: day,
        creators: insights.totals.creators,
        userSignups: insights.totals.userSignups,
        tracks: insights.totals.tracks,
        tracksApproved: insights.totals.tracksApproved,
        tracksPending: insights.totals.tracksPending,
        tracksChart: insights.totals.tracksChart,
        plays: insights.totals.plays,
        likes: insights.totals.likes,
        listenerVotes: insights.totals.listenerVotes,
        battles: insights.totals.battles,
        battleWins: insights.totals.battleWins,
        activeBoosts: insights.totals.activeBoosts,
        trackPlaysToday: insights.today.plays,
        votesToday: insights.today.votes,
        battlesToday: insights.today.battles,
        newTracksToday: insights.today.newTracks,
        newUserSignupsToday: insights.today.newUserSignups,
      })
      .onConflictDoUpdate({
        target: dataDailyPlatformSnapshots.snapshotDate,
        set: {
          creators: insights.totals.creators,
          userSignups: insights.totals.userSignups,
          tracks: insights.totals.tracks,
          tracksApproved: insights.totals.tracksApproved,
          tracksPending: insights.totals.tracksPending,
          tracksChart: insights.totals.tracksChart,
          plays: insights.totals.plays,
          likes: insights.totals.likes,
          listenerVotes: insights.totals.listenerVotes,
          battles: insights.totals.battles,
          battleWins: insights.totals.battleWins,
          activeBoosts: insights.totals.activeBoosts,
          trackPlaysToday: insights.today.plays,
          votesToday: insights.today.votes,
          battlesToday: insights.today.battles,
          newTracksToday: insights.today.newTracks,
          newUserSignupsToday: insights.today.newUserSignups,
        },
      });

    return { snapshotDate: dayIso, trackRows, platformCaptured: true };
  }

  async getSnapshotStatus(): Promise<{
    lastTrackSnapshotDate: string | null;
    lastPlatformSnapshotDate: string | null;
    trackSnapshotDays: number;
  }> {
    const [lastTrack] = await db
      .select({ d: dataDailyTrackSnapshots.snapshotDate })
      .from(dataDailyTrackSnapshots)
      .orderBy(desc(dataDailyTrackSnapshots.snapshotDate))
      .limit(1);
    const [lastPlatform] = await db
      .select({ d: dataDailyPlatformSnapshots.snapshotDate })
      .from(dataDailyPlatformSnapshots)
      .orderBy(desc(dataDailyPlatformSnapshots.snapshotDate))
      .limit(1);
    const [daysRow] = await db
      .select({ c: sql<number>`count(distinct ${dataDailyTrackSnapshots.snapshotDate})` })
      .from(dataDailyTrackSnapshots);

    return {
      lastTrackSnapshotDate: lastTrack?.d ? new Date(lastTrack.d).toISOString().slice(0, 10) : null,
      lastPlatformSnapshotDate: lastPlatform?.d ? new Date(lastPlatform.d).toISOString().slice(0, 10) : null,
      trackSnapshotDays: Number(daysRow?.c ?? 0),
    };
  }

  async getB2bPlayExportRows(opts?: { since?: Date; limit?: number }): Promise<B2bPlayExportRow[]> {
    const limit = Math.min(Math.max(opts?.limit ?? 500_000, 1), 500_000);
    const conditions = opts?.since ? [gte(trackPlays.playedAt, opts.since)] : [];
    const rows = await db
      .select()
      .from(trackPlays)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(trackPlays.playedAt))
      .limit(limit);

    return rows.map((r) => {
      const { listenerType, listenerId } = exportListenerId(r.userId, r.sessionKey);
      return {
        playId: r.id,
        trackId: r.trackId,
        listenerType,
        listenerId,
        listenerCountry: String(r.listenerCountry ?? "").trim(),
        deviceClass: String(r.deviceClass ?? "").trim() || "unknown",
        referrerHost: String(r.referrerHost ?? "").trim(),
        completed: r.completed,
        playedAt: new Date(r.playedAt).toISOString(),
      };
    });
  }

  async getB2bBattleExportRows(): Promise<B2bBattleExportRow[]> {
    const rows = await db.select().from(battles).orderBy(desc(battles.id));
    return rows.map((b) => ({
      battleId: b.id,
      genre: b.genre,
      trackAId: b.trackAId,
      trackBId: b.trackBId,
      trackAVotes: b.trackAVotes,
      trackBVotes: b.trackBVotes,
      winnerId: b.winnerId,
      isArchived: !!(b as { isArchived?: boolean }).isArchived,
      createdAt: new Date(b.createdAt).toISOString(),
    }));
  }

  async getB2bBattleVoteExportRows(opts?: { since?: Date; limit?: number }): Promise<B2bBattleVoteExportRow[]> {
    const limit = Math.min(Math.max(opts?.limit ?? 500_000, 1), 500_000);
    const conditions = opts?.since ? [gte(battleVotes.votedAt, opts.since)] : [];
    const rows = await db
      .select()
      .from(battleVotes)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(battleVotes.votedAt))
      .limit(limit);

    return rows.map((v) => ({
      voteId: v.id,
      battleId: v.battleId,
      trackId: v.trackId,
      listenerId: exportListenerId(v.userId, null).listenerId,
      votedAt: new Date(v.votedAt).toISOString(),
    }));
  }

  async getB2bDailyTrackSnapshotExportRows(opts?: { since?: Date }): Promise<B2bDailyTrackSnapshotRow[]> {
    const conditions = opts?.since ? [gte(dataDailyTrackSnapshots.snapshotDate, opts.since)] : [];
    const rows = await db
      .select()
      .from(dataDailyTrackSnapshots)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(dataDailyTrackSnapshots.snapshotDate), desc(dataDailyTrackSnapshots.trackId));

    return rows.map((r) => ({
      snapshotDate: new Date(r.snapshotDate).toISOString().slice(0, 10),
      trackId: r.trackId,
      title: r.title,
      genre: r.genre,
      aiTool: r.aiTool,
      trackType: r.trackType,
      status: r.status,
      provenanceStatus: r.provenanceStatus,
      isDeleted: r.isDeleted,
      playsCount: r.playsCount,
      likesCount: r.likesCount,
      completedPlaysCount: r.completedPlaysCount,
      uniqueListenersCount: r.uniqueListenersCount,
      battleWinsCount: r.battleWinsCount,
      battleTotalCount: r.battleTotalCount,
      chartRank: r.chartRank,
      rankingScore: r.rankingScore,
      listenerVotes: r.listenerVotes,
    }));
  }

  async getB2bDailyPlatformSnapshotExportRows(opts?: { since?: Date }): Promise<B2bDailyPlatformSnapshotRow[]> {
    const conditions = opts?.since ? [gte(dataDailyPlatformSnapshots.snapshotDate, opts.since)] : [];
    const rows = await db
      .select()
      .from(dataDailyPlatformSnapshots)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(dataDailyPlatformSnapshots.snapshotDate));

    return rows.map((r) => ({
      snapshotDate: new Date(r.snapshotDate).toISOString().slice(0, 10),
      creators: r.creators,
      userSignups: r.userSignups,
      tracks: r.tracks,
      tracksApproved: r.tracksApproved,
      tracksPending: r.tracksPending,
      tracksChart: r.tracksChart,
      plays: r.plays,
      likes: r.likes,
      listenerVotes: r.listenerVotes,
      battles: r.battles,
      battleWins: r.battleWins,
      activeBoosts: r.activeBoosts,
      trackPlaysToday: r.trackPlaysToday,
      votesToday: r.votesToday,
      battlesToday: r.battlesToday,
      newTracksToday: r.newTracksToday,
      newUserSignupsToday: r.newUserSignupsToday,
    }));
  }

  async getB2bCatalogExportRows(): Promise<B2bCatalogExportRow[]> {
    const rows = await db
      .select({ track: tracks, metrics: trackMetrics })
      .from(tracks)
      .leftJoin(trackMetrics, eq(trackMetrics.trackId, tracks.id))
      .orderBy(desc(tracks.rankingScore));

    const trackIds = rows.map((r) => r.track.id);
    const battleStats = trackIds.length > 0 ? await this.getBattleStatsForTracks(trackIds) : {};

    const audioChart = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(and(eq(tracks.isDeleted, false), eq(tracks.status, "CHART"), eq(tracks.trackType, "audio")))
      .orderBy(desc(tracks.rankingScore));
    const audioChartRank = new Map(audioChart.map((t, i) => [t.id, i + 1]));

    return rows.map((r) => {
      const t = r.track;
      const m = r.metrics;
      const bs = battleStats[t.id];
      const plays = resolvePublicPlayCount({ playCount: t.playCount, playsCount: m?.playsCount });
      const chartRank =
        t.status === "CHART" && t.trackType === "audio" ? (audioChartRank.get(t.id) ?? null) : null;

      return {
        trackId: t.id,
        title: t.title,
        artistName: String(t.artistName ?? "").trim(),
        genre: t.genre,
        aiTool: t.aiTool,
        trackType: t.trackType,
        status: t.status,
        provenanceStatus: t.provenanceStatus ?? "verified",
        claimable: !!t.claimableByCreators,
        isDeleted: t.isDeleted,
        plays,
        likes: m?.likesCount ?? 0,
        battleWins: bs?.wins ?? m?.battleWinsCount ?? 0,
        battleTotal: bs?.totalBattles ?? m?.battleTotalCount ?? 0,
        uniqueListeners: m?.uniqueListenersCount ?? 0,
        chartRank,
        rankingScore: t.rankingScore ?? 0,
        createdAt: new Date(t.createdAt).toISOString(),
        aiPromptCharCount: String(t.aiPrompt ?? "").trim().length,
      };
    });
  }

  async getB2bAiInsightExportRows(): Promise<B2bAiInsightRow[]> {
    const rows = await db
      .select({
        genre: tracks.genre,
        aiTool: tracks.aiTool,
        plays: trackMetrics.playsCount,
        likes: trackMetrics.likesCount,
        completed: trackMetrics.completedPlaysCount,
        battleWins: trackMetrics.battleWinsCount,
        battleTotal: trackMetrics.battleTotalCount,
      })
      .from(tracks)
      .leftJoin(trackMetrics, eq(trackMetrics.trackId, tracks.id))
      .where(eq(tracks.isDeleted, false));

    const byKey = new Map<
      string,
      {
        genre: string;
        aiTool: string;
        trackCount: number;
        totalPlays: number;
        totalLikes: number;
        totalBattleWins: number;
        totalBattles: number;
        completionNumerator: number;
        completionDenominator: number;
        winNumerator: number;
        winDenominator: number;
      }
    >();

    for (const r of rows) {
      const key = `${r.genre}\0${r.aiTool}`;
      const cur = byKey.get(key) ?? {
        genre: r.genre,
        aiTool: r.aiTool,
        trackCount: 0,
        totalPlays: 0,
        totalLikes: 0,
        totalBattleWins: 0,
        totalBattles: 0,
        completionNumerator: 0,
        completionDenominator: 0,
        winNumerator: 0,
        winDenominator: 0,
      };
      const plays = Number(r.plays ?? 0);
      const completed = Number(r.completed ?? 0);
      const battleWins = Number(r.battleWins ?? 0);
      const battleTotal = Number(r.battleTotal ?? 0);
      cur.trackCount += 1;
      cur.totalPlays += plays;
      cur.totalLikes += Number(r.likes ?? 0);
      cur.totalBattleWins += battleWins;
      cur.totalBattles += battleTotal;
      cur.completionNumerator += completed;
      cur.completionDenominator += plays;
      cur.winNumerator += battleWins;
      cur.winDenominator += battleTotal;
      byKey.set(key, cur);
    }

    return [...byKey.values()]
      .map((g) => ({
        genre: g.genre,
        aiTool: g.aiTool,
        trackCount: g.trackCount,
        totalPlays: g.totalPlays,
        totalLikes: g.totalLikes,
        totalBattleWins: g.totalBattleWins,
        totalBattles: g.totalBattles,
        avgWinRate: g.winDenominator > 0 ? g.winNumerator / g.winDenominator : 0,
        avgCompletionRate: g.completionDenominator > 0 ? g.completionNumerator / g.completionDenominator : 0,
      }))
      .sort((a, b) => b.totalPlays - a.totalPlays);
  }

}

export const storage = new DatabaseStorage();
