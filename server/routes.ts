import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seed } from "./seed";
import { api } from "@shared/routes";
import {
  setupAuth,
  registerAuthRoutes,
  isAuthenticated,
} from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // Get current user's profile
  app.get(api.profiles.me.path, isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(req.user.claims.sub);
    if (!p) return res.status(404).json({ message: "Profile not found" });
    const followerCount = await storage.getFollowerCount(p.id);
    res.json({ ...p, followerCount });
  });

  // Create profile (called after OAuth login for new users)
  app.post(api.profiles.create.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const existing = await storage.getProfileByUserId(userId);
    if (existing) return res.status(409).json({ message: "Profile already exists" });

    const { username, role, country, aiToolUsed, bio } = req.body;
    if (!username) return res.status(400).json({ message: "Username is required" });

    const usernameCheck = await storage.getProfileByUsername(username);
    if (usernameCheck) return res.status(409).json({ message: "Username already taken" });

    const p = await storage.createProfile({ userId, username, role: role || "listener", country, aiToolUsed, bio });
    res.status(201).json(p);
  });

  // Get profile by ID
  app.get(api.profiles.get.path, async (req, res) => {
    const p = await storage.getProfile(Number(req.params.id));
    if (!p) return res.status(404).json({ message: "Profile not found" });
    res.json(p);
  });

  // Get profile by username (for creator pages)
  app.get("/api/profiles/by-username/:username", async (req, res) => {
    const p = await storage.getProfileByUsername(req.params.username);
    if (!p) return res.status(404).json({ message: "Profile not found" });
    const full = await storage.getProfile(p.id);
    res.json(full);
  });

  // Follow a creator
  app.post("/api/profiles/:id/follow", isAuthenticated, async (req: any, res) => {
    const creatorProfileId = Number(req.params.id);
    await storage.followCreator(req.user.claims.sub, creatorProfileId);
    res.json({ message: "Following" });
  });

  // Unfollow a creator
  app.delete("/api/profiles/:id/follow", isAuthenticated, async (req: any, res) => {
    const creatorProfileId = Number(req.params.id);
    await storage.unfollowCreator(req.user.claims.sub, creatorProfileId);
    res.json({ message: "Unfollowed" });
  });

  // Check if following
  app.get("/api/profiles/:id/follow", isAuthenticated, async (req: any, res) => {
    const creatorProfileId = Number(req.params.id);
    const isFollowing = await storage.isFollowing(req.user.claims.sub, creatorProfileId);
    res.json({ isFollowing });
  });

  app.get(api.tracks.list.path, async (req, res) => {
    let ts = await storage.getTracks({
      status: (req.query.status as string) || undefined,
      featured: req.query.featured === "true",
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });

    if (ts.length === 0) {
      console.log("No tracks found in production, triggering auto-seed...");
      await seed();
      ts = await storage.getTracks({
        status: (req.query.status as string) || undefined,
        featured: req.query.featured === "true",
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
    }

    const formatted = ts.map((t) => ({
      id: t.id,
      title: t.title,
      creatorName: t.artistName || t.creator.username,
      creatorId: t.creatorId,
      aiTool: t.aiTool,
      genre: t.genre,
      lyrics: t.lyrics,
      votes: t.listenerVotes,
      audioUrl: t.audioUrl,
      musicVideoUrl: t.mvUrl,
      coverImage: t.coverImage,
      description: t.description,
      aiCraftScore: t.aiCraftScore,
      neoScore: t.neoScore,
      playCount: t.playCount,
      rankingScore: t.rankingScore,
      status: t.status,
      createdAt: t.createdAt,
    }));
    res.json(formatted);
  });

  app.post(api.tracks.seed.path, async (req, res) => {
    const token = req.body.token;
    const expected = process.env.ADMIN_SEED_TOKEN;
    if (!expected || token !== expected) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await seed();
    res.json({ message: "Seeding triggered" });
  });

  app.get(api.tracks.get.path, async (req, res) => {
    const t = await storage.getTrack(Number(req.params.id));
    if (!t) return res.status(404).json({ message: "Track not found" });
    res.json(t);
  });

  // Get current creator's own tracks
  app.get("/api/tracks/my", isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(req.user.claims.sub);
    if (!p) return res.status(404).json({ message: "Profile not found" });
    const ts = await storage.getTracksByCreator(p.id);
    const formatted = ts.map((t) => ({
      id: t.id,
      title: t.title,
      creatorName: t.artistName || t.creator.username,
      creatorId: t.creatorId,
      aiTool: t.aiTool,
      genre: t.genre,
      lyrics: t.lyrics,
      votes: t.listenerVotes,
      audioUrl: t.audioUrl,
      musicVideoUrl: t.mvUrl,
      coverImage: t.coverImage,
      description: t.description,
      aiCraftScore: t.aiCraftScore,
      neoScore: t.neoScore,
      playCount: t.playCount,
      rankingScore: t.rankingScore,
      status: t.status,
      createdAt: t.createdAt,
    }));
    res.json(formatted);
  });

  app.post(api.tracks.create.path, isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(req.user.claims.sub);
    if (!p || p.role !== "nex")
      return res.status(403).json({ message: "Only NEX creators can upload" });
    const { title, aiTool, genre, audioUrl, mvUrl, coverImage, description, lyrics } = req.body;
    if (!title || !aiTool || !genre || !audioUrl) {
      return res.status(400).json({ message: "title, aiTool, genre, and audioUrl are required" });
    }
    const t = await storage.createTrack({
      title, aiTool, genre, audioUrl,
      mvUrl: mvUrl || null,
      coverImage: coverImage || null,
      description: description || null,
      lyrics: lyrics || null,
      creatorId: p.id,
      status: "SUBMITTED",
      aiCraftScore: 0,
      listenerVotes: 0,
      neoScore: 0,
    });
    res.status(201).json(t);
  });

  app.post(api.tracks.vote.path, isAuthenticated, async (req: any, res) => {
    try {
      await storage.voteTrack(req.user.claims.sub, Number(req.params.id));
      res.json({ message: "Vote recorded" });
    } catch (err: any) {
      if (err?.message === "ALREADY_VOTED") {
        return res.status(409).json({ message: "Already voted for this track" });
      }
      throw err;
    }
  });

  // Record a play (requires 20s listen time enforced client-side; 10-min spam window enforced server-side)
  app.post("/api/tracks/:id/play", isAuthenticated, async (req: any, res) => {
    const trackId = Number(req.params.id);
    const result = await storage.recordPlay(req.user.claims.sub, trackId);
    res.json({ counted: result.counted, message: result.counted ? "Play recorded" : "Too soon — play not counted" });
  });

  app.post(api.tracks.like.path, isAuthenticated, async (req: any, res) => {
    await storage.likeTrack(req.user.claims.sub, Number(req.params.id));
    res.json({ message: "Track liked" });
  });

  // Submit a track — any authenticated user can submit; saved with PENDING status
  app.post("/api/tracks/submit", isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(req.user.claims.sub);
    if (!p) return res.status(404).json({ message: "Profile not found" });

    const { title, artistName, genre, trackLink } = req.body;
    if (!title || !artistName || !genre || !trackLink) {
      return res.status(400).json({ message: "title, artistName, genre, and trackLink are required" });
    }

    const validGenres = ["Electronic", "Synth Pop", "Rock", "Hip Hop", "Ambient", "Other"];
    if (!validGenres.includes(genre)) {
      return res.status(400).json({ message: "Invalid genre" });
    }

    const t = await storage.submitTrack({ title, artistName, genre, trackLink, creatorId: p.id });
    res.status(201).json({ message: "Track submitted successfully", trackId: t.id });
  });

  // RISING tracks: ≥5 battles, ≥60% win rate, not in top 100
  app.get("/api/tracks/rising", async (_req, res) => {
    const rising = await storage.getRisingTracks();
    res.json(rising);
  });

  // --- BATTLE ROUTES ---

  // Get genres with enough published tracks for a battle
  app.get("/api/battles/genres", async (_req, res) => {
    const genres = await storage.getAvailableBattleGenres();
    res.json(genres);
  });

  // Create a new battle for a given genre
  app.post("/api/battles/new", async (req, res) => {
    const { genre } = req.body;
    if (!genre) return res.status(400).json({ message: "genre is required" });
    const battle = await storage.createBattle(genre);
    if (!battle) return res.status(409).json({ message: "Not enough tracks in this genre for a battle" });
    res.json(battle);
  });

  // Get a specific battle
  app.get("/api/battles/:id", async (req, res) => {
    const battle = await storage.getBattle(Number(req.params.id));
    if (!battle) return res.status(404).json({ message: "Battle not found" });
    res.json(battle);
  });

  // Vote in a battle
  app.post("/api/battles/:id/vote", isAuthenticated, async (req: any, res) => {
    const battleId = Number(req.params.id);
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ message: "trackId is required" });
    try {
      const result = await storage.recordBattleVote(battleId, req.user.claims.sub, Number(trackId));
      res.json(result);
    } catch (err: any) {
      if (err?.message === "ALREADY_VOTED") return res.status(409).json({ message: "Already voted in this battle" });
      if (err?.message === "BATTLE_NOT_FOUND") return res.status(404).json({ message: "Battle not found" });
      throw err;
    }
  });

  // Admin: get all submitted tracks across all pipeline statuses
  app.get("/api/admin/submissions", isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(req.user.claims.sub);
    if (!p || p.role !== "founder")
      return res.status(403).json({ message: "Admin access required" });

    const statuses = ["PENDING", "BATTLE_POOL", "REJECTED", "CHART"];
    const all: any[] = [];
    for (const status of statuses) {
      const ts = await storage.getTracks({ status });
      all.push(
        ...ts.map((t) => ({
          id: t.id,
          title: t.title,
          creatorName: t.artistName || t.creator.username,
          creatorId: t.creatorId,
          genre: t.genre,
          trackLink: t.audioUrl,
          status: t.status,
          createdAt: t.createdAt,
        }))
      );
    }
    // Sort by createdAt desc
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(all);
  });

  app.post(api.admin.review.path, isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(req.user.claims.sub);
    if (!p || p.role !== "founder")
      return res.status(403).json({ message: "Admin access required" });

    const { status } = req.body;
    const validStatuses = ["BATTLE_POOL", "REJECTED", "PUBLISHED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be BATTLE_POOL, REJECTED, or PUBLISHED" });
    }

    await storage.updateTrackStatus(
      Number(req.params.id),
      status,
      req.body.aiCraftScore,
    );
    res.json({ message: "Review completed" });
  });

  return httpServer;
}
