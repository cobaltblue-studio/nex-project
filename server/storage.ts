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
  trackClaimRequests,
  boostTickets,
  boostUsageLogs,
  boostImpressionEvents,
  boostStatus,
  type Profile,
  type Track,
  type Follow,
  type Battle,
} from "@shared/schema";
import type { User } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, and, or, sql, count, gt, gte, ne, inArray, notInArray } from "drizzle-orm";

const RANKING_WEIGHT_BATTLE = 0.5;
const RANKING_WEIGHT_LIKES = 0.2;
const RANKING_WEIGHT_PLAYS = 0.2;
const RANKING_WEIGHT_FOLLOWERS = 0.1;

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
  getTracks(filter: {
    status?: string;
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
  checkAndPromoteToChart(trackId: number): Promise<void>;
  hasVoted(userId: string, trackId: number): Promise<boolean>;
  voteTrack(userId: string, trackId: number): Promise<void>;
  likeTrack(userId: string, trackId: number): Promise<void>;
  recordPlay(userId: string, trackId: number, opts?: { completed?: boolean }): Promise<{ counted: boolean; completionUpdated: boolean }>;
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
  createBattle(genre: string): Promise<any | null>;
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
    this.pendingRankingRecomputeTrackIds.add(trackId);
    if (this.rankingRecomputeFlushTimer) return;

    this.rankingRecomputeFlushTimer = setTimeout(() => {
      void this.flushRankingRecomputeQueue();
    }, this.rankingRecomputeDebounceMs);
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
      .select({ count: sql<number>`count(distinct ${trackPlays.userId})` })
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

    const rs = computeRankingScore({
      battleWins: m.battleWinsCount,
      battleTotal: m.battleTotalCount,
      likesCount: m.likesCount,
      playCount: m.playsCount,
      followerCount: m.followerCount,
      completionRate,
      saveRelistenRate,
      uniqueListeners: m.uniqueListenersCount,
      createdAt: t.createdAt,
    });

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

  async getPendingCreatorApplications(): Promise<{ profile: Profile; email: string | null }[]> {
    const rows = await db
      .select({ profile: profiles, email: users.email })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(eq(profiles.creatorApplicationStatus, "pending"));
    return rows.map((r) => ({ profile: r.profile, email: r.email ?? null }));
  }

  async getTracks({
    status,
    featured,
    limit,
    genre,
    sortBy,
    trackType,
    creatorId,
    q: searchQuery,
  }: {
    status?: string;
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
    if (status) {
      filters.push(eq(tracks.status, status));
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
    }));
  }

  async getTrack(id: number): Promise<any | undefined> {
    const [r] = await db
      .select({ track: tracks, creator: profiles })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .where(and(eq(tracks.id, id), eq(tracks.isDeleted, false)));
    return r ? { ...r.track, creator: r.creator } : undefined;
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
      db.select({ c: count() }).from(users),
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
      db.select({ c: count() }).from(users).where(gte(users.createdAt, todayStartUtc)),
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

  async createTrack(t: any): Promise<Track> {
    const now = new Date();
    const rs = computeRankingScore({
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

  async likeTrack(userId: string, trackId: number): Promise<void> {
    const inserted = await db.insert(likes).values({ userId, trackId }).onConflictDoNothing().returning({ id: likes.id });
    if (inserted.length === 0) return;
    await this.ensureTrackMetricsRow(trackId);
    await db.update(trackMetrics).set({
      likesCount: sql`${trackMetrics.likesCount} + 1`,
      updatedAt: new Date(),
    }).where(eq(trackMetrics.trackId, trackId));
    this.scheduleRecomputeTrackRankingScore(trackId);
  }

  async recordPlay(userId: string, trackId: number, opts?: { completed?: boolean }): Promise<{ counted: boolean; completionUpdated: boolean }> {
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
        await this.ensureTrackMetricsRow(trackId);
        await db.update(trackMetrics).set({
          completedPlaysCount: sql`${trackMetrics.completedPlaysCount} + 1`,
          updatedAt: new Date(),
        }).where(eq(trackMetrics.trackId, trackId));
        this.scheduleRecomputeTrackRankingScore(trackId);
        return { counted: false, completionUpdated: true };
      }
      return { counted: false, completionUpdated: false };
    }

    // Record the play
    await db.insert(trackPlays).values({ userId, trackId, completed });
    await this.ensureTrackMetricsRow(trackId);
    await db.update(trackMetrics).set({
      playsCount: sql`${trackMetrics.playsCount} + 1`,
      completedPlaysCount: sql`${trackMetrics.completedPlaysCount} + ${completed ? 1 : 0}`,
      uniqueListenersCount: sql`${trackMetrics.uniqueListenersCount} + ${hadAny ? 0 : 1}`,
      relistenPlaysCount: sql`${trackMetrics.relistenPlaysCount} + ${hadAny ? 1 : 0}`,
      updatedAt: new Date(),
    }).where(eq(trackMetrics.trackId, trackId));

    // Fetch track and update playCount
    const [t] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    if (!t) return { counted: false, completionUpdated: false };

    await db.update(tracks).set({
      playCount: sql`${tracks.playCount} + 1`,
      lastPlayedAt: new Date(),
    }).where(eq(tracks.id, trackId));
    this.scheduleRecomputeTrackRankingScore(trackId);

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

    const affectedBattles = await db
      .select({ id: battles.id })
      .from(battles)
      .where(or(eq(battles.trackAId, trackId), eq(battles.trackBId, trackId), eq(battles.winnerId, trackId)));
    const battleIds = affectedBattles.map((b) => b.id);
    if (battleIds.length) {
      await db.delete(battleVotes).where(inArray(battleVotes.battleId, battleIds));
      await db.delete(battles).where(inArray(battles.id, battleIds));
    }

    await db.update(tracks).set({
      isDeleted: true,
      archivedAt: new Date(),
      status: "ARCHIVED",
    }).where(eq(tracks.id, trackId));
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
    // Battle-eligible statuses: PUBLISHED (legacy), BATTLE_POOL/APPROVED (approved), CHART (graduated)
    // Genres with >=2 eligible tracks can host same-genre battles
    const genreResults = await db
      .select({ genre: tracks.genre, cnt: count() })
      .from(tracks)
      .where(
        and(
          sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL', 'APPROVED', 'CHART')`,
          eq(tracks.isDeleted, false),
        ),
      )
      .groupBy(tracks.genre)
      .having(sql`count(*) >= 2`);

    const genres = genreResults.map(r => r.genre);

    // Always include "ALL" if there are >=2 eligible tracks total (enables cross-genre battles)
    const [{ total }] = await db
      .select({ total: count() })
      .from(tracks)
      .where(
        and(
          sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL', 'APPROVED', 'CHART')`,
          eq(tracks.isDeleted, false),
        ),
      );

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

  async createBattle(genre: string): Promise<any | null> {
    const eligibleSql = and(
      sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL', 'APPROVED', 'CHART')`,
      eq(tracks.isDeleted, false),
    );

    let pool = await db.select().from(tracks).where(
      genre && genre !== "ALL"
        ? and(eligibleSql, eq(tracks.genre, genre))
        : eligibleSql
    );

    if (pool.length < 2) {
      pool = await db.select().from(tracks).where(eligibleSql);
    }

    if (pool.length < 2) return null;

    const allBattles = await db.select().from(battles).where(sql`${battles.winnerId} IS NOT NULL`);
    const battleStats: Record<number, { battles: number; wins: number }> = {};
    for (const b of allBattles) {
      for (const id of [b.trackAId, b.trackBId]) {
        if (!battleStats[id]) battleStats[id] = { battles: 0, wins: 0 };
        battleStats[id].battles += 1;
      }
      if (b.winnerId) {
        if (!battleStats[b.winnerId]) battleStats[b.winnerId] = { battles: 0, wins: 0 };
        battleStats[b.winnerId].wins += 1;
      }
    }

    const top100 = await db.select({ id: tracks.id })
      .from(tracks)
      .where(
        and(sql`${tracks.status} IN ('PUBLISHED', 'CHART')`, eq(tracks.isDeleted, false)),
      )
      .orderBy(desc(tracks.rankingScore))
      .limit(100);
    const top100Ids = new Set(top100.map(t => t.id));

    const newPool: typeof pool = [];
    const risingPool: typeof pool = [];
    const chartPool: typeof pool = [];

    for (const track of pool) {
      if (track.status === "BATTLE_POOL" || track.status === "APPROVED") {
        newPool.push(track);
      } else {
        const s = battleStats[track.id];
        const winRate = s && s.battles > 0 ? s.wins / s.battles : 0;
        if (s && s.battles >= 5 && winRate >= 0.6 && !top100Ids.has(track.id)) {
          risingPool.push(track);
        } else {
          chartPool.push(track);
        }
      }
    }

    const boostMultiplierByTrackId = await this.getBoostMultiplierByTrackIds(pool.map((t) => t.id));
    const pools = [newPool, risingPool, chartPool];
    const startIdx = Math.floor(Math.random() * 3);

    let trackA: typeof pool[0] | null = null;
    let trackB: typeof pool[0] | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const currentPool = pools[(startIdx + attempt) % 3];
      if (currentPool.length >= 2) {
        [trackA, trackB] = weightedPickTwo(currentPool, { multiplierByTrackId: boostMultiplierByTrackId });
        break;
      }
    }

    if (!trackA || !trackB) {
      [trackA, trackB] = weightedPickTwo(pool, { multiplierByTrackId: boostMultiplierByTrackId });
    }

    const battleGenre = (genre && genre !== "ALL") ? genre : trackA.genre;

    const [battle] = await db.insert(battles).values({
      genre: battleGenre,
      trackAId: trackA.id,
      trackBId: trackB.id,
    }).returning();

    return this.getBattle(battle.id);
  }

  async getRisingTracks(q?: string): Promise<any[]> {
    const eligibleSql = sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL', 'APPROVED', 'CHART')`;

    const top100Rows = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(
        and(
          sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL', 'APPROVED', 'CHART')`,
          eq(tracks.trackType, "audio"),
        ),
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
      return {
        ...t,
        creatorName: t.artistName || r.creator.username,
        likesCount: r.metrics?.likesCount ?? 0,
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
    const [t] = await db.select({ id: tracks.id }).from(tracks).where(eq(tracks.id, trackId));
    if (!t) throw new Error("TRACK_NOT_FOUND");
    await db.insert(comments).values({ userId, trackId, content: body });
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

  async recordBattleVote(
    battleId: number,
    userId: string,
    trackId: number,
    opts?: { skipListenCheck?: boolean },
  ): Promise<{ trackAVotes: number; trackBVotes: number; winnerId: number; trackAWinStreak: number; trackBWinStreak: number }> {
    const [battle] = await db.select().from(battles).where(eq(battles.id, battleId));
    if (!battle) throw new Error("BATTLE_NOT_FOUND");

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

  async checkAndPromoteToChart(trackId: number): Promise<void> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    // Only approved/battle-pool tracks can earn their way to CHART
    if (!track || (track.status !== "BATTLE_POOL" && track.status !== "APPROVED")) return;

    const allBattles = await db.select().from(battles)
      .where(sql`${battles.winnerId} IS NOT NULL AND (${battles.trackAId} = ${trackId} OR ${battles.trackBId} = ${trackId})`);

    const totalBattles = allBattles.length;
    const wins = allBattles.filter(b => b.winnerId === trackId).length;
    const winRate = totalBattles > 0 ? wins / totalBattles : 0;

    if (totalBattles >= 10 && winRate >= 0.55) {
      await db.update(tracks).set({ status: "CHART" }).where(eq(tracks.id, trackId));
    }
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
    }).returning();
    return t;
  }

  async transferTrackOwnershipFromClaim(trackId: number, newCreatorProfileId: number): Promise<Track | null> {
    const [updated] = await db
      .update(tracks)
      .set({
        creatorId: newCreatorProfileId,
        claimableByCreators: false,
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
        .set({ creatorId: req.requesterProfileId, claimableByCreators: false })
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
        .set({ creatorId: requesterProfileId, claimableByCreators: false })
        .where(eq(tracks.id, trackId));
      await tx
        .update(trackClaimRequests)
        .set({ status: "rejected" })
        .where(eq(trackClaimRequests.trackId, trackId));
    });
    return { ok: true };
  }

  async setTrackClaimableByCreators(trackId: number, claimable: boolean): Promise<Track | null> {
    const [updated] = await db
      .update(tracks)
      .set({ claimableByCreators: claimable })
      .where(eq(tracks.id, trackId))
      .returning();
    return updated ?? null;
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
      .where(sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL', 'APPROVED', 'CHART')`);

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

  /** Every studio-role profile plus anyone who owns at least one track (full creator directory). */
  async getCreators(): Promise<Profile[]> {
    const directoryRoles = ["creator", "nex", "founder", "admin"] as const;
    const byRole = await db.select().from(profiles).where(inArray(profiles.role, [...directoryRoles]));
    const trackCreatorIds = await db
      .selectDistinct({ creatorId: tracks.creatorId })
      .from(tracks)
      .where(eq(tracks.isDeleted, false));
    const ids = Array.from(new Set(trackCreatorIds.map((r) => r.creatorId)));
    const fromTracks =
      ids.length > 0 ? await db.select().from(profiles).where(inArray(profiles.id, ids)) : [];
    const map = new Map<number, Profile>();
    for (const p of byRole) map.set(p.id, p);
    for (const p of fromTracks) map.set(p.id, p);
    return Array.from(map.values());
  }

}

export const storage = new DatabaseStorage();
