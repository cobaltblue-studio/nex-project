import { profiles, tracks, likes, votes, follows, type Profile, type Track, type Follow } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";

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
  voteTrack(userId: string, trackId: number): Promise<void>;
  likeTrack(userId: string, trackId: number): Promise<void>;
  updateTrackStatus(id: number, status: string, aiCraftScore?: number): Promise<void>;
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
    let q = db.select({ track: tracks, creator: profiles }).from(tracks).innerJoin(profiles, eq(tracks.creatorId, profiles.id)).$dynamic();
    let filters = [];
    if (status) filters.push(eq(tracks.status, status));
    if (featured) filters.push(eq(tracks.isFeatured, true));
    if (filters.length) q = q.where(and(...filters));
    q = q.orderBy(desc(tracks.listenerVotes));
    if (limit) q = q.limit(limit);
    const results = await q;
    return results.map(r => ({ ...r.track, creator: r.creator }));
  }

  async getTrack(id: number): Promise<any | undefined> {
    const [r] = await db.select({ track: tracks, creator: profiles }).from(tracks).innerJoin(profiles, eq(tracks.creatorId, profiles.id)).where(eq(tracks.id, id));
    return r ? { ...r.track, creator: r.creator } : undefined;
  }

  async getTracksByCreator(creatorId: number): Promise<any[]> {
    const results = await db
      .select({ track: tracks, creator: profiles })
      .from(tracks)
      .innerJoin(profiles, eq(tracks.creatorId, profiles.id))
      .where(eq(tracks.creatorId, creatorId))
      .orderBy(desc(tracks.createdAt));
    return results.map(r => ({ ...r.track, creator: r.creator }));
  }

  async createTrack(t: any): Promise<Track> {
    const [nt] = await db.insert(tracks).values(t).returning();
    return nt;
  }

  async voteTrack(userId: string, trackId: number): Promise<void> {
    await db.insert(votes).values({ userId, trackId });
    await db.update(tracks).set({ 
      listenerVotes: sql`${tracks.listenerVotes} + 1`,
      neoScore: sql`(${tracks.aiCraftScore} * 0.7) + ((${tracks.listenerVotes} + 1) * 0.3)`
    }).where(eq(tracks.id, trackId));
  }

  async likeTrack(userId: string, trackId: number): Promise<void> {
    await db.insert(likes).values({ userId, trackId }).onConflictDoNothing();
  }

  async updateTrackStatus(id: number, status: string, aiCraftScore?: number): Promise<void> {
    const set: any = { status };
    if (aiCraftScore !== undefined) {
      set.aiCraftScore = aiCraftScore;
      set.neoScore = sql`(${aiCraftScore} * 0.7) + (${tracks.listenerVotes} * 0.3)`;
    }
    await db.update(tracks).set(set).where(eq(tracks.id, id));
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
