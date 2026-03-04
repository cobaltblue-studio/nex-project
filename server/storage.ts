import { profiles, works, type Profile, type InsertProfile, type Work, type InsertWork } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Profiles
  getProfileByUserId(userId: string): Promise<Profile | undefined>;
  getProfile(id: number): Promise<Profile | undefined>;
  getProfiles(league?: string): Promise<Profile[]>;
  createProfile(profile: InsertProfile & { userId: string }): Promise<Profile>;
  
  // Works
  getWorks(type?: string, creatorId?: number, limit?: number): Promise<(Work & { creator: Profile })[]>;
  getWork(id: number): Promise<(Work & { creator: Profile }) | undefined>;
  createWork(work: InsertWork): Promise<Work>;
}

export class DatabaseStorage implements IStorage {
  async getProfileByUserId(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async getProfile(id: number): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async getProfiles(league?: string): Promise<Profile[]> {
    let query = db.select().from(profiles).$dynamic();
    
    if (league) {
      query = query.where(eq(profiles.league, league));
    }
    
    return await query.orderBy(desc(profiles.aiCraftScore));
  }

  async createProfile(profile: InsertProfile & { userId: string }): Promise<Profile> {
    const [newProfile] = await db.insert(profiles).values(profile).returning();
    return newProfile;
  }

  async getWorks(type?: string, creatorId?: number, limit?: number): Promise<(Work & { creator: Profile })[]> {
    // We do a manual join or two queries. Drizzle makes it easy with relational queries if configured, 
    // but here we can just use a join or fetch profiles separately.
    let query = db.select({
      work: works,
      creator: profiles,
    })
    .from(works)
    .innerJoin(profiles, eq(works.creatorId, profiles.id))
    .orderBy(desc(works.totalAiCraftScore))
    .$dynamic();

    if (type) {
      query = query.where(eq(works.workType, type));
    }

    if (creatorId) {
      query = query.where(eq(works.creatorId, creatorId));
    }

    if (limit) {
      query = query.limit(limit);
    }

    const rows = await query;
    return rows.map(row => ({
      ...row.work,
      creator: row.creator
    }));
  }

  async getWork(id: number): Promise<(Work & { creator: Profile }) | undefined> {
    const rows = await db.select({
      work: works,
      creator: profiles,
    })
    .from(works)
    .innerJoin(profiles, eq(works.creatorId, profiles.id))
    .where(eq(works.id, id));

    if (rows.length === 0) return undefined;
    
    return {
      ...rows[0].work,
      creator: rows[0].creator
    };
  }

  async createWork(work: InsertWork): Promise<Work> {
    const [newWork] = await db.insert(works).values(work).returning();
    return newWork;
  }
}

export const storage = new DatabaseStorage();
