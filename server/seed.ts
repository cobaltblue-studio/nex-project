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
      { title: "Electric City", creator: "PulseAI", tool: "Suno", votes: 421, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { title: "Neon Sky", creator: "BeatForge", tool: "Suno", votes: 389, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { title: "Future Love", creator: "SynthLab", tool: "Suno", votes: 355, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { title: "Midnight Drive", creator: "PulseAI", tool: "Suno", votes: 330, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { title: "Digital Dreams", creator: "AIVoice", tool: "Suno", votes: 310, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { title: "Cosmic Waves", creator: "BeatForge", tool: "Suno", votes: 290, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { title: "Night Runner", creator: "SynthLab", tool: "Suno", votes: 270, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { title: "AI Romance", creator: "PulseAI", tool: "Suno", votes: 250, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { title: "Neon Highway", creator: "BeatForge", tool: "Suno", votes: 230, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { title: "Electric Heart", creator: "SynthLab", tool: "Suno", votes: 210, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
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
        audioUrl: t.audioUrl,
        mvUrl: t.mvUrl,
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
