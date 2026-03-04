import { storage } from "./storage";
import { db } from "./db";
import { profiles, works, users } from "@shared/schema";

export async function seedDatabase() {
  const existingProfiles = await storage.getProfiles();
  if (existingProfiles.length > 0) return;

  console.log("Seeding database with demo data...");

  const demoUsers = [
    { id: "user_1", username: "AetherVox", email: "aether@neo.ai" },
    { id: "user_2", username: "NeuralNexus", email: "nexus@neo.ai" },
    { id: "user_3", username: "SynthWave_AI", email: "synth@neo.ai" },
    { id: "user_4", username: "PromptMaster", email: "master@neo.ai" },
    { id: "user_5", username: "Visionary_01", email: "vision@neo.ai" },
    { id: "user_6", username: "DeepFlow", email: "flow@neo.ai" },
    { id: "user_7", username: "CyborgDream", email: "dream@neo.ai" },
    { id: "user_8", username: "LogicGate", email: "logic@neo.ai" },
    { id: "user_9", username: "GlitchArt", email: "glitch@neo.ai" },
    { id: "user_10", username: "ZenithAI", email: "zenith@neo.ai" },
  ];

  for (const u of demoUsers) {
    await db.insert(users).values({
      id: u.id,
      email: u.email,
      firstName: u.username,
    }).onConflictDoNothing();

    const score = Math.floor(Math.random() * 30) + 65; // 65-95
    let league = "Spark";
    if (score >= 85) league = "Ascendant";
    else if (score >= 75) league = "Core";

    await storage.createProfile({
      userId: u.id,
      username: u.username,
      bio: `Leading NEX creator specializing in ${league} level AI craft.`,
      aiCraftScore: score,
      league: league,
      isVerified: Math.random() > 0.5,
    });
  }

  const createdProfiles = await storage.getProfiles();
  const tools = ["Midjourney", "Suno AI", "Runway Gen-2", "Claude 3.5", "Stable Diffusion"];
  const categories = ["image", "music", "music_video", "vertical_video"];

  for (let i = 1; i <= 30; i++) {
    const creator = createdProfiles[Math.floor(Math.random() * createdProfiles.length)];
    const type = categories[Math.floor(Math.random() * categories.length)];
    const tool = tools[Math.floor(Math.random() * tools.length)];
    
    const eng = Math.floor(Math.random() * 40) + 60;
    const tech = Math.floor(Math.random() * 40) + 60;
    const depth = Math.floor(Math.random() * 40) + 60;
    const vel = Math.floor(Math.random() * 40) + 60;
    
    const total = Math.floor((eng * 0.3) + (tech * 0.3) + (depth * 0.2) + (vel * 0.2));

    await storage.createWork({
      creatorId: creator.id,
      title: `Project ${String.fromCharCode(64 + (i % 26))}${i}`,
      prompt: `Experimental ${type} generation using ${tool}. High fidelity, cinematic lighting, intricate details.`,
      aiTool: tool,
      modelVersion: "v4.0",
      workType: type,
      engagementScore: eng,
      technicalQualityScore: tech,
      promptDepthScore: depth,
      trendVelocityScore: vel,
      totalAiCraftScore: total,
    });
  }

  console.log("Database seeded successfully.");
}
