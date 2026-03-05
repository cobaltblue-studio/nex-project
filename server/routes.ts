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

  app.get(api.profiles.me.path, isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(req.user.claims.sub);
    if (!p) return res.status(404).json({ message: "Profile not found" });
    res.json(p);
  });

  app.get(api.profiles.get.path, async (req, res) => {
    const p = await storage.getProfile(Number(req.params.id));
    if (!p) return res.status(404).json({ message: "Profile not found" });
    res.json(p);
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
      aiCraftScore: t.aiCraftScore,
      neoScore: t.neoScore
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

  app.post(api.tracks.create.path, isAuthenticated, async (req: any, res) => {
    const p = await storage.getProfileByUserId(req.user.claims.sub);
    if (!p || p.role !== "nex")
      return res.status(403).json({ message: "Only NEX creators can upload" });
    const t = await storage.createTrack({ ...req.body, creatorId: p.id });
    res.status(201).json(t);
  });

  app.post(api.tracks.vote.path, isAuthenticated, async (req: any, res) => {
    await storage.voteTrack(req.user.claims.sub, Number(req.params.id));
    res.json({ message: "Vote recorded" });
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
