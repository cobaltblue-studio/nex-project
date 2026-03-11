import { storage } from "./storage";
import { db } from "./db";
import { users, profiles, tracks } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

export async function seed() {
  console.log("Checking NEO database for existing data...");

  try {
    const trackCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tracks);
    // if (Number(trackCount[0].count) > 0) {
    //   console.log("Database already has tracks, skipping seed.");
    //   return;
    // }

    console.log("Seeding NEO database with sample tracks...");

    const sampleData = [];

    const creators = Array.from(new Set(sampleData.map((d) => d.creator)));
    const creatorMap: Record<string, number> = {};

    for (let i = 0; i < creators.length; i++) {
      const name = creators[i];
      const userId = `seed_user_${name.toLowerCase().replace(/\s+/g, "_")}`;
      await db
        .insert(users)
        .values({ id: userId, email: `${userId}@neo.ai`, username: name })
        .onConflictDoNothing();
      let [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId));
      if (!profile) {
        [profile] = await db
          .insert(profiles)
          .values({
            userId,
            username: name,
            bio: `Professional AI creator ${name}.`,
            role: "nex",
            nexNumber: i + 1,
            isVerified: true,
          })
          .returning();
      }
      creatorMap[name] = profile.id;
    }

    for (const t of sampleData) {
      const aiCraft = 80 + Math.random() * 15;
      const track = await storage.createTrack({
        creatorId: creatorMap[t.creator],
        title: t.title,
        audioUrl: t.audioUrl,
        mvUrl: t.mvUrl,
        aiTool: t.tool,
        genre: "Electronic",
        status: "PUBLISHED",
      });
      await db
        .update(tracks)
        .set({
          listenerVotes: t.votes,
          neoScore: sql`(${aiCraft} * 0.7) + (${t.votes} * 0.3)`,
          aiCraftScore: aiCraft,
        })
        .where(eq(tracks.id, track.id));
    }
    console.log("Seeding complete!");
  } catch (err) {
    console.error("Seeding failed:", err);
  }
}
