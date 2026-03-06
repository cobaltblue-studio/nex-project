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
      creatorName: t.creator.username,
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
      creatorName: t.creator.username,
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

  app.post(api.admin.review.path, isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(req.user.claims.sub);
    if (!p || p.role !== "founder")
      return res.status(403).json({ message: "Admin access required" });
    await storage.updateTrackStatus(
      Number(req.params.id),
      req.body.status,
      req.body.aiCraftScore,
    );
    res.json({ message: "Review completed" });
  });

  return httpServer;
}
