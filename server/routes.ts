import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { seedDatabase } from "./seed";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed the database
  seedDatabase().catch(console.error);

  // Setup authentication first
  await setupAuth(app);
  registerAuthRoutes(app);

  // Profiles
  app.get(api.profiles.me.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.status(200).json(profile);
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.profiles.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existingProfile = await storage.getProfileByUserId(userId);
      if (existingProfile) {
        return res.status(400).json({ message: "Profile already exists" });
      }

      const input = api.profiles.create.input.parse(req.body);
      const profile = await storage.createProfile({ ...input, userId });
      res.status(201).json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.profiles.list.path, async (req, res) => {
    try {
      const league = req.query.league as string | undefined;
      const profiles = await storage.getProfiles(league);
      res.status(200).json(profiles);
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.profiles.get.path, async (req, res) => {
    try {
      const profile = await storage.getProfile(Number(req.params.id));
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.status(200).json(profile);
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Works
  app.get(api.works.list.path, async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const creatorId = req.query.creatorId ? Number(req.query.creatorId) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const works = await storage.getWorks(type, creatorId, limit);
      res.status(200).json(works);
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.works.get.path, async (req, res) => {
    try {
      const work = await storage.getWork(Number(req.params.id));
      if (!work) {
        return res.status(404).json({ message: "Work not found" });
      }
      res.status(200).json(work);
    } catch (err) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.works.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ message: "Creator profile not found. Please create a profile first." });
      }

      const input = api.works.create.input.parse(req.body);
      
      // Calculate scores pseudo-randomly for MVP or based on simple heuristics if you wanted
      const engagementScore = Math.floor(Math.random() * 50) + 50;
      const technicalQualityScore = Math.floor(Math.random() * 50) + 50;
      const promptDepthScore = Math.floor(Math.random() * 50) + 50;
      const trendVelocityScore = Math.floor(Math.random() * 50) + 50;
      
      const totalAiCraftScore = Math.floor(
        (engagementScore * 0.3) + 
        (technicalQualityScore * 0.3) + 
        (promptDepthScore * 0.2) + 
        (trendVelocityScore * 0.2)
      );

      const work = await storage.createWork({
        ...input,
        creatorId: profile.id,
        engagementScore,
        technicalQualityScore,
        promptDepthScore,
        trendVelocityScore,
        totalAiCraftScore,
      });

      res.status(201).json(work);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  return httpServer;
}
