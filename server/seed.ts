import { storage } from "./storage";
import { db } from "./db";
import { users, profiles, tracks } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

export async function seed() {
  console.log("Checking NEO database for existing data...");
  
  try {
    const trackCount = await db.select({ count: sql<number>`count(*)` }).from(tracks);
    if (Number(trackCount[0].count) > 0) {
      console.log("Database already has tracks, skipping seed.");
      return;
    }

    console.log("Seeding NEO database with sample tracks...");

    // 1. Create/Ensure Mock Users and Profiles for the specific creators
    const sampleData = [
      { title: "Electric City", creator: "Neural Pulse", tool: "Suno", votes: 421 },
      { title: "Neon Sky", creator: "AI Dreamer", tool: "Suno", votes: 389 },
      { title: "Future Love", creator: "SynthBot", tool: "Suno", votes: 355 },
      { title: "Digital Heart", creator: "NovaBeat", tool: "Suno", votes: 330 },
      { title: "Midnight Drive", creator: "PulseAI", tool: "Suno", votes: 302 },
      { title: "Neon Pulse", creator: "Aether", tool: "Suno", votes: 280 },
      { title: "Digital Rain", creator: "Nova", tool: "Udio", votes: 260 },
      { title: "Silicon Soul", creator: "Flux", tool: "Stable Audio", votes: 240 },
      { title: "Binary Sunset", creator: "Echo", tool: "Suno", votes: 220 },
      { title: "The Grid", creator: "Vertex", tool: "Udio", votes: 200 },
    ];

    // Get unique creators
    const creators = Array.from(new Set(sampleData.map(d => d.creator)));
    const creatorMap: Record<string, number> = {};

    for (let i = 0; i < creators.length; i++) {
      const name = creators[i];
      const userId = `seed_user_${name.toLowerCase().replace(/\s+/g, '_')}`;
      
      // Ensure user exists
      await db.insert(users).values({
        id: userId,
        email: `${userId}@neo.ai`,
        username: name,
      }).onConflictDoNothing();

      // Ensure profile exists
      let [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      if (!profile) {
        [profile] = await db.insert(profiles).values({
          userId,
          username: name,
          bio: `Professional AI creator ${name}.`,
          role: "nex",
          nexNumber: i + 1,
          isVerified: true,
        }).returning();
      }
      creatorMap[name] = profile.id;
    }

    // 2. Insert Tracks
    for (const t of sampleData) {
      const aiCraft = 80 + Math.random() * 15;
      const neoScore = (aiCraft * 0.7) + (t.votes * 0.3);

      await db.insert(tracks).values({
        creatorId: creatorMap[t.creator],
        title: t.title,
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        aiTool: t.tool,
        genre: "Electronic",
        status: "PUBLISHED",
        listenerVotes: t.votes,
        aiCraftScore: aiCraft,
        neoScore: neoScore,
      });
    }

    console.log("Seeding complete!");
  } catch (err) {
    console.error("Seeding failed:", err);
  }
}
