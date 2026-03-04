import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";

async function seed() {
  console.log("Seeding NEO database...");
  
  try {
    // 1. Create Mock Users first to satisfy foreign key constraints
    const mockUsers = [
      { id: "founder_id", username: "neo_founder", email: "founder@neo.ai" },
      { id: "user_nex_1", username: "nex_1", email: "nex1@neo.ai" },
      { id: "user_nex_2", username: "nex_2", email: "nex2@neo.ai" },
      { id: "user_nex_3", username: "nex_3", email: "nex3@neo.ai" },
      { id: "user_nex_4", username: "nex_4", email: "nex4@neo.ai" },
      { id: "user_nex_5", username: "nex_5", email: "nex5@neo.ai" },
    ];

    for (const u of mockUsers) {
      await db.insert(users).values({
        id: u.id,
        email: u.email,
        username: u.username,
      }).onConflictDoNothing();
    }

    // 2. Create Founder Profile
    const founder = await storage.createProfile({
      userId: "founder_id",
      username: "NEO_FOUNDER",
      bio: "Architect of the NEO Sound. Deciding the future of AI music.",
      role: "founder",
      isVerified: true
    });

    // 3. Create 5 NEX Creators
    const creators = [];
    const genres = ["Cyberpunk Pop", "Glitch Hop", "Neo-Classical", "Synthwave", "Ambient AI"];
    
    for (let i = 1; i <= 5; i++) {
      const creator = await storage.createProfile({
        userId: `user_nex_${i}`,
        username: `NEX_UNIT_${i}`,
        bio: `Experimental AI entity specializing in ${genres[i-1]}.`,
        role: "nex",
        nexNumber: i,
        isVerified: true
      });
      creators.push(creator);
    }

    // 4. Create Tracks for each NEX
    const tracksData = [
      { title: "Silicon Soul", genre: "Cyberpunk Pop", aiTool: "Suno v3.5", lyrics: "Neon lights, digital dreams... searching for a soul in the machine." },
      { title: "Ghost Circuit", genre: "Glitch Hop", aiTool: "Udio", lyrics: "[Instrumental Breakdown] Binary echoes in the void." },
      { title: "Neural Symphony", genre: "Neo-Classical", aiTool: "Stable Audio", lyrics: "Harmonies computed in real-time." },
      { title: "Void Walker", genre: "Synthwave", aiTool: "Suno v3.5", lyrics: "Riding the grid, faster than light." },
      { title: "Static Grace", genre: "Ambient AI", aiTool: "Udio", lyrics: "Peaceful algorithms." }
    ];

    for (let i = 0; i < creators.length; i++) {
      const track = await storage.createTrack({
        creatorId: creators[i].id,
        title: tracksData[i].title,
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        mvUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        aiTool: tracksData[i].aiTool,
        genre: tracksData[i].genre,
        lyrics: tracksData[i].lyrics
      });

      // Auto-approve and score for seed
      await storage.updateTrackStatus(track.id, "PUBLISHED", 85 + Math.random() * 10);
    }

    console.log("Seeding complete.");
  } catch (err) {
    console.error("Seeding failed:", err);
  }
}

seed().catch(console.error);
