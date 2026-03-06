import { profiles, tracks, likes, votes, follows, trackPlays, type Profile, type Track, type Follow } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, gt } from "drizzle-orm";

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
    if (status) filters.push(eq(tracks.status, status));
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
