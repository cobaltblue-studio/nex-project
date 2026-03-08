import { profiles, tracks, likes, votes, follows, trackPlays, battles, battleVotes, type Profile, type Track, type Follow, type Battle } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, gt, ne } from "drizzle-orm";

// Compute rankingScore = (votes * 3) + (playCount * 1) + recentBoost
export function computeRankingScore(votesCount: number, playCount: number, createdAt: Date): number {
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  let recentBoost = 0;
  if (hoursOld < 24) recentBoost = 30;
  else if (hoursOld < 48) recentBoost = 20;
  else if (hoursOld < 72) recentBoost = 10;
  return (votesCount * 3) + (playCount * 1) + recentBoost;
}

export interface IStorage {
  getProfileByUserId(userId: string): Promise<Profile | undefined>;
  getProfileByUsername(username: string): Promise<Profile | undefined>;
  getProfile(id: number): Promise<(Profile & { tracks: Track[]; followerCount: number }) | undefined>;
  createProfile(p: any): Promise<Profile>;
  updateProfile(id: number, data: Partial<Profile>): Promise<Profile>;
  getTracks(filter: { status?: string; featured?: boolean; limit?: number }): Promise<any[]>;
  getTracksByCreator(creatorId: number): Promise<any[]>;
  getTrack(id: number): Promise<any | undefined>;
  createTrack(track: any): Promise<Track>;
  submitTrack(data: { title: string; artistName: string; genre: string; trackLink: string; creatorId: number }): Promise<Track>;
  checkAndPromoteToChart(trackId: number): Promise<void>;
  hasVoted(userId: string, trackId: number): Promise<boolean>;
  voteTrack(userId: string, trackId: number): Promise<void>;
  likeTrack(userId: string, trackId: number): Promise<void>;
  recordPlay(userId: string, trackId: number): Promise<{ counted: boolean }>;
  updateTrackStatus(id: number, status: string, aiCraftScore?: number): Promise<void>;
  recalculateAllRankingScores(): Promise<void>;
  followCreator(followerId: string, creatorProfileId: number): Promise<void>;
  unfollowCreator(followerId: string, creatorProfileId: number): Promise<void>;
  isFollowing(followerId: string, creatorProfileId: number): Promise<boolean>;
  getFollowerCount(creatorProfileId: number): Promise<number>;
  getAvailableBattleGenres(): Promise<string[]>;
  createBattle(genre: string): Promise<any | null>;
  getBattle(id: number): Promise<any | null>;
  hasBattleVoted(battleId: number, userId: string): Promise<boolean>;
  recordBattleVote(battleId: number, userId: string, trackId: number): Promise<{ trackAVotes: number; trackBVotes: number; winnerId: number }>;
  getRisingTracks(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getProfileByUserId(userId: string): Promise<Profile | undefined> {
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return p;
  }

  async getProfileByUsername(username: string): Promise<Profile | undefined> {
    const [p] = await db.select().from(profiles).where(eq(profiles.username, username));
    return p;
  }

  async getProfile(id: number): Promise<(Profile & { tracks: Track[]; followerCount: number }) | undefined> {
    const [p] = await db.select().from(profiles).where(eq(profiles.id, id));
    if (!p) return undefined;
    const t = await db.select().from(tracks).where(eq(tracks.creatorId, id));
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

  async getTracks({ status, featured, limit }: { status?: string; featured?: boolean; limit?: number }): Promise<any[]> {
    let q = db.select({ track: tracks, creator: profiles })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .$dynamic();
    const filters = [];
    if (status) {
      filters.push(eq(tracks.status, status));
    } else {
      // Default: show chart-eligible tracks (PUBLISHED legacy + CHART earned)
      filters.push(sql`${tracks.status} IN ('PUBLISHED', 'CHART')`);
    }
    if (featured) filters.push(eq(tracks.isFeatured, true));
    if (filters.length) q = q.where(and(...filters));
    // Sort by rankingScore descending
    q = q.orderBy(desc(tracks.rankingScore));
    if (limit) q = q.limit(limit);
    const results = await q;
    return results.map(r => ({ ...r.track, creator: r.creator }));
  }

  async getTrack(id: number): Promise<any | undefined> {
    const [r] = await db
      .select({ track: tracks, creator: profiles })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .where(eq(tracks.id, id));
    return r ? { ...r.track, creator: r.creator } : undefined;
  }

  async getTracksByCreator(creatorId: number): Promise<any[]> {
    const results = await db
      .select({ track: tracks, creator: profiles })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .where(eq(tracks.creatorId, creatorId))
      .orderBy(desc(tracks.rankingScore));
    return results.map(r => ({ ...r.track, creator: r.creator }));
  }

  async createTrack(t: any): Promise<Track> {
    const now = new Date();
    const rs = computeRankingScore(0, 0, now);
    const [nt] = await db.insert(tracks).values({ ...t, rankingScore: rs }).returning();
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

    // Fetch track to compute new rankingScore
    const [t] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    if (!t) return;
    const newVotes = t.listenerVotes + 1;
    const rs = computeRankingScore(newVotes, t.playCount, t.createdAt);

    await db.update(tracks).set({
      listenerVotes: sql`${tracks.listenerVotes} + 1`,
      neoScore: sql`(${tracks.aiCraftScore} * 0.7) + ((${tracks.listenerVotes} + 1) * 0.3)`,
      rankingScore: rs,
    }).where(eq(tracks.id, trackId));
  }

  async likeTrack(userId: string, trackId: number): Promise<void> {
    await db.insert(likes).values({ userId, trackId }).onConflictDoNothing();
  }

  async recordPlay(userId: string, trackId: number): Promise<{ counted: boolean }> {
    // Spam prevention: same user can only increment once per 10 minutes per track
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const [recent] = await db.select().from(trackPlays)
      .where(and(
        eq(trackPlays.userId, userId),
        eq(trackPlays.trackId, trackId),
        gt(trackPlays.playedAt, tenMinutesAgo)
      ));

    if (recent) return { counted: false };

    // Record the play
    await db.insert(trackPlays).values({ userId, trackId });

    // Fetch track and update playCount + rankingScore
    const [t] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    if (!t) return { counted: false };

    const newPlayCount = t.playCount + 1;
    const rs = computeRankingScore(t.listenerVotes, newPlayCount, t.createdAt);

    await db.update(tracks).set({
      playCount: sql`${tracks.playCount} + 1`,
      rankingScore: rs,
      lastPlayedAt: new Date(),
    }).where(eq(tracks.id, trackId));

    return { counted: true };
  }

  async updateTrackStatus(id: number, status: string, aiCraftScore?: number): Promise<void> {
    const set: any = { status };
    if (aiCraftScore !== undefined) {
      const [t] = await db.select().from(tracks).where(eq(tracks.id, id));
      if (t) {
        set.aiCraftScore = aiCraftScore;
        set.neoScore = sql`(${aiCraftScore} * 0.7) + (${tracks.listenerVotes} * 0.3)`;
        set.rankingScore = computeRankingScore(t.listenerVotes, t.playCount, t.createdAt);
      }
    }
    await db.update(tracks).set(set).where(eq(tracks.id, id));
  }

  // Recalculate rankingScore for ALL tracks — run on startup
  async recalculateAllRankingScores(): Promise<void> {
    const allTracks = await db.select().from(tracks);
    for (const t of allTracks) {
      const rs = computeRankingScore(t.listenerVotes, t.playCount, t.createdAt);
      await db.update(tracks).set({ rankingScore: rs }).where(eq(tracks.id, t.id));
    }
  }

  async getAvailableBattleGenres(): Promise<string[]> {
    // Return genres that have at least 2 battle-eligible tracks (PUBLISHED legacy + BATTLE_POOL)
    const results = await db
      .select({ genre: tracks.genre, cnt: count() })
      .from(tracks)
      .where(sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL')`)
      .groupBy(tracks.genre)
      .having(sql`count(*) >= 2`);
    return results.map(r => r.genre);
  }

  async createBattle(genre: string): Promise<any | null> {
    // Fetch all battle-eligible tracks in this genre, sorted by rankingScore desc (rank 0 = best)
    const available = await db.select().from(tracks)
      .where(and(sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL')`, eq(tracks.genre, genre)))
      .orderBy(desc(tracks.rankingScore));
    if (available.length < 2) return null;

    const n = available.length;
    let idxA: number;
    let idxB: number;

    // 20% chance of an "upset" match (far-apart ranks), 80% similar-rank match
    const isUpset = Math.random() < 0.20;

    if (n === 2) {
      // Only two tracks — always pair them
      idxA = 0; idxB = 1;
    } else if (isUpset) {
      // Upset: pick a top-half track vs a bottom-half track (rank gap >= n/3)
      const minGap = Math.max(3, Math.floor(n / 3));
      idxA = Math.floor(Math.random() * Math.floor(n / 2)); // from top half
      // Find idxB at least minGap lower
      const candidates = Array.from({ length: n }, (_, i) => i)
        .filter(i => i !== idxA && Math.abs(i - idxA) >= minGap);
      idxB = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : (idxA === 0 ? 1 : 0);
    } else {
      // Similar rank: pick a random track, then pick another within ±3 positions
      idxA = Math.floor(Math.random() * n);
      const window = 3;
      const candidates = Array.from({ length: n }, (_, i) => i)
        .filter(i => i !== idxA && Math.abs(i - idxA) <= window);
      if (candidates.length > 0) {
        idxB = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        // Fallback: pick nearest track
        idxB = idxA === 0 ? 1 : idxA - 1;
      }
    }

    // Randomly assign A/B so neither is always "the better" track
    const [trackA, trackB] = Math.random() < 0.5
      ? [available[idxA], available[idxB]]
      : [available[idxB], available[idxA]];

    const [battle] = await db.insert(battles).values({
      genre,
      trackAId: trackA.id,
      trackBId: trackB.id,
    }).returning();

    return this.getBattle(battle.id);
  }

  async getRisingTracks(): Promise<any[]> {
    // Get all completed battles (with a winner)
    const allBattles = await db.select().from(battles).where(sql`${battles.winnerId} IS NOT NULL`);

    // Tally battles and wins per track
    const stats: Record<number, { battles: number; wins: number }> = {};
    for (const b of allBattles) {
      const ids = [b.trackAId, b.trackBId];
      for (const id of ids) {
        if (!stats[id]) stats[id] = { battles: 0, wins: 0 };
        stats[id].battles += 1;
      }
      if (b.winnerId) {
        if (!stats[b.winnerId]) stats[b.winnerId] = { battles: 0, wins: 0 };
        stats[b.winnerId].wins += 1;
      }
    }

    // Get top 100 track IDs by rankingScore (to exclude from RISING) — includes PUBLISHED + CHART
    const top100 = await db.select({ id: tracks.id })
      .from(tracks)
      .where(sql`${tracks.status} IN ('PUBLISHED', 'CHART')`)
      .orderBy(desc(tracks.rankingScore))
      .limit(100);
    const top100Ids = new Set(top100.map(t => t.id));

    // Filter to qualifying tracks
    const qualifyingIds = Object.entries(stats)
      .filter(([id, s]) => {
        const numId = Number(id);
        const winRate = s.battles > 0 ? s.wins / s.battles : 0;
        return s.battles >= 5 && winRate >= 0.6 && !top100Ids.has(numId);
      })
      .map(([id]) => Number(id));

    if (qualifyingIds.length === 0) return [];

    // Fetch track + creator data for qualifying tracks
    const results: any[] = [];
    for (const id of qualifyingIds) {
      const [r] = await db
        .select({ track: tracks, creator: profiles })
        .from(tracks)
        .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
        .where(eq(tracks.id, id));
      if (r) {
        const s = stats[id];
        results.push({
          ...r.track,
          creatorName: r.creator.username,
          totalBattles: s.battles,
          wins: s.wins,
          winRate: Math.round((s.wins / s.battles) * 100),
        });
      }
    }

    // Sort by win rate desc, then total battles desc
    return results.sort((a, b) => b.winRate - a.winRate || b.totalBattles - a.totalBattles);
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
      trackA: trackA ? { ...trackA.track, creatorName: trackA.creator.username } : null,
      trackB: trackB ? { ...trackB.track, creatorName: trackB.creator.username } : null,
    };
  }

  async hasBattleVoted(battleId: number, userId: string): Promise<boolean> {
    const [r] = await db.select().from(battleVotes)
      .where(and(eq(battleVotes.battleId, battleId), eq(battleVotes.userId, userId)));
    return !!r;
  }

  async recordBattleVote(battleId: number, userId: string, trackId: number): Promise<{ trackAVotes: number; trackBVotes: number; winnerId: number }> {
    const already = await this.hasBattleVoted(battleId, userId);
    if (already) throw new Error("ALREADY_VOTED");

    const [battle] = await db.select().from(battles).where(eq(battles.id, battleId));
    if (!battle) throw new Error("BATTLE_NOT_FOUND");

    // Record vote
    await db.insert(battleVotes).values({ battleId, userId, trackId });

    // Increment vote count for the chosen track
    const isA = trackId === battle.trackAId;
    const newAVotes = battle.trackAVotes + (isA ? 1 : 0);
    const newBVotes = battle.trackBVotes + (!isA ? 1 : 0);

    // Determine winner (track with more votes; current battle tally after this vote)
    const winnerId = newAVotes >= newBVotes ? battle.trackAId : battle.trackBId;

    await db.update(battles).set({
      trackAVotes: newAVotes,
      trackBVotes: newBVotes,
      winnerId,
    }).where(eq(battles.id, battleId));

    // Award +2 to the voted-for track's rankingScore
    const [t] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    if (t) {
      const newRs = computeRankingScore(t.listenerVotes, t.playCount, t.createdAt) + 2;
      await db.update(tracks).set({ rankingScore: newRs }).where(eq(tracks.id, trackId));
    }

    // Check if either battle track should be promoted to CHART
    await this.checkAndPromoteToChart(battle.trackAId);
    await this.checkAndPromoteToChart(battle.trackBId);

    return { trackAVotes: newAVotes, trackBVotes: newBVotes, winnerId };
  }

  async checkAndPromoteToChart(trackId: number): Promise<void> {
    const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId));
    // Only BATTLE_POOL tracks can earn their way to CHART
    if (!track || track.status !== "BATTLE_POOL") return;

    const allBattles = await db.select().from(battles)
      .where(sql`${battles.winnerId} IS NOT NULL AND (${battles.trackAId} = ${trackId} OR ${battles.trackBId} = ${trackId})`);

    const totalBattles = allBattles.length;
    const wins = allBattles.filter(b => b.winnerId === trackId).length;
    const winRate = totalBattles > 0 ? wins / totalBattles : 0;

    if (totalBattles >= 10 && winRate >= 0.55) {
      await db.update(tracks).set({ status: "CHART" }).where(eq(tracks.id, trackId));
    }
  }

  async submitTrack(data: { title: string; artistName: string; genre: string; trackLink: string; creatorId: number }): Promise<Track> {
    const [t] = await db.insert(tracks).values({
      title: data.title,
      artistName: data.artistName,
      genre: data.genre,
      audioUrl: data.trackLink,
      creatorId: data.creatorId,
      status: "PENDING",
      aiTool: "submitted",
      aiCraftScore: 0,
      listenerVotes: 0,
      neoScore: 0,
      rankingScore: 0,
    }).returning();
    return t;
  }

  async followCreator(followerId: string, creatorProfileId: number): Promise<void> {
    const already = await this.isFollowing(followerId, creatorProfileId);
    if (!already) {
      await db.insert(follows).values({ followerId, creatorProfileId });
    }
  }

  async unfollowCreator(followerId: string, creatorProfileId: number): Promise<void> {
    await db.delete(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.creatorProfileId, creatorProfileId))
    );
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
}

export const storage = new DatabaseStorage();
