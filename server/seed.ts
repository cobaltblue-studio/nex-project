import { storage } from "./storage";
import { db } from "./db";
import { users, profiles, tracks } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seed() {
  console.log("Checking NEO database for existing data...");
  
  try {
    const profileCount = await db.select({ count: sql<number>`count(*)` }).from(profiles);
    if (Number(profileCount[0].count) > 0) {
      console.log("Database already has data, skipping seed.");
      return;
    }

    console.log("Seeding NEO database...");

    // 1. Create Mock Users first to satisfy foreign key constraints
    const mockUsers = [
      { id: "founder_id", username: "neo_founder", email: "founder@neo.ai" },
      { id: "user_nex_1", username: "Aether", email: "aether@neo.ai" },
      { id: "user_nex_2", username: "Nova", email: "nova@neo.ai" },
      { id: "user_nex_3", username: "Flux", email: "flux@neo.ai" },
      { id: "user_nex_4", username: "Echo", email: "echo@neo.ai" },
      { id: "user_nex_5", username: "Vertex", email: "vertex@neo.ai" },
    ];

    for (const u of mockUsers) {
      await db.insert(users).values({
        id: u.id,
        email: u.email,
        username: u.username,
      }).onConflictDoNothing();
    }

    // 2. Create Founder Profile
    await storage.createProfile({
      userId: "founder_id",
      username: "NEO_FOUNDER",
      bio: "Architect of the NEO Sound. Deciding the future of AI music.",
      role: "founder",
      isVerified: true
    });

    // 3. Create 5 NEX Creators
    const creators = [
      { id: "user_nex_1", name: "Aether", country: "Japan", tool: "Suno", bio: "Exploring the boundary between organic and synthetic sound." },
      { id: "user_nex_2", name: "Nova", country: "USA", tool: "Udio", bio: "Cybernetic pop for the next generation." },
      { id: "user_nex_3", name: "Flux", country: "Germany", tool: "Stable Audio", bio: "Minimalist structures built by maximalist algorithms." },
      { id: "user_nex_4", name: "Echo", country: "UK", tool: "Suno", bio: "Reverb-heavy soundscapes from the digital void." },
      { id: "user_nex_5", name: "Vertex", country: "South Korea", tool: "Udio", bio: "The precision of math meets the soul of music." },
    ];
    
    const seededCreators = [];
    for (let i = 0; i < creators.length; i++) {
      const c = creators[i];
      const creator = await storage.createProfile({
        userId: c.id,
        username: c.name,
        bio: c.bio,
        country: c.country,
        aiToolUsed: c.tool,
        role: "nex",
        nexNumber: i + 1,
        isVerified: true
      });
      seededCreators.push(creator);
    }

    // 4. Create 10 Tracks
    const tracksData = [
      { title: "Neon Pulse", creatorIdx: 0, tool: "Suno", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", genre: "Synthwave" },
      { title: "Digital Rain", creatorIdx: 1, tool: "Udio", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", mvUrl: null, genre: "Lofi" },
      { title: "Silicon Soul", creatorIdx: 2, tool: "Stable Audio", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", genre: "Ambient" },
      { title: "Binary Sunset", creatorIdx: 3, tool: "Suno", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", mvUrl: null, genre: "Chill" },
      { title: "The Grid", creatorIdx: 4, tool: "Udio", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", genre: "Techno" },
      { title: "Neural Link", creatorIdx: 0, tool: "Suno", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", mvUrl: null, genre: "Electronic" },
      { title: "Circuit Break", creatorIdx: 1, tool: "Udio", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", genre: "Glitch" },
      { title: "Data Stream", creatorIdx: 2, tool: "Stable Audio", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", mvUrl: null, genre: "Drone" },
      { title: "Virtual Horizon", creatorIdx: 3, tool: "Suno", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3", mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", genre: "Vaporwave" },
      { title: "Cyber Dreams", creatorIdx: 4, tool: "Udio", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3", mvUrl: null, genre: "Dream Pop" },
    ];

    for (const t of tracksData) {
      const votes = Math.floor(Math.random() * 1000);
      const aiCraft = 70 + Math.random() * 25;
      
      const track = await storage.createTrack({
        creatorId: seededCreators[t.creatorIdx].id,
        title: t.title,
        audioUrl: t.audioUrl,
        mvUrl: t.mvUrl,
        aiTool: t.tool,
        genre: t.genre,
        status: "PUBLISHED",
      });

      // Update with seed scores
      await storage.updateTrackStatus(track.id, "PUBLISHED", aiCraft);
      // Manually set votes for seed
      await db.update(tracks).set({ 
        listenerVotes: votes,
        neoScore: sql`(${aiCraft} * 0.7) + (${votes} * 0.3)`
      }).where(eq(tracks.id, track.id));
    }

    console.log("Seeding complete.");
  } catch (err) {
    console.error("Seeding failed:", err);
  }
}
