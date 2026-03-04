import { pgTable, text, varchar, timestamp, integer, boolean, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export the auth models so they are included in db migrations
export * from "./models/auth";
import { users } from "./models/auth";

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  username: text("username").notNull().unique(),
  bio: text("bio"),
  aiCraftScore: integer("ai_craft_score").default(0).notNull(),
  league: text("league").default("Spark").notNull(),
  rank: integer("rank"),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const works = pgTable("works", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").references(() => profiles.id).notNull(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  aiTool: text("ai_tool").notNull(), // e.g., Midjourney, Suno, Runway
  modelVersion: text("model_version").notNull(),
  
  // Score components
  engagementScore: integer("engagement_score").default(0).notNull(),
  technicalQualityScore: integer("technical_quality_score").default(0).notNull(),
  promptDepthScore: integer("prompt_depth_score").default(0).notNull(),
  trendVelocityScore: integer("trend_velocity_score").default(0).notNull(),
  
  // Total derived score
  totalAiCraftScore: integer("total_ai_craft_score").default(0).notNull(),
  
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // Derived / categorized types for charts
  workType: text("work_type").notNull().default("image"), // "image", "music", "music_video", "vertical_video"
});

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  works: many(works),
}));

export const worksRelations = relations(works, ({ one }) => ({
  creator: one(profiles, {
    fields: [works.creatorId],
    references: [profiles.id],
  }),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({ 
  id: true, 
  userId: true, // Will be set from the authenticated user
  aiCraftScore: true, 
  league: true, 
  rank: true, 
  isVerified: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertWorkSchema = createInsertSchema(works).omit({
  id: true,
  creatorId: true, // Set from the current user's profile
  engagementScore: true,
  technicalQualityScore: true,
  promptDepthScore: true,
  trendVelocityScore: true,
  totalAiCraftScore: true,
  isVerified: true,
  createdAt: true,
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

export type Work = typeof works.$inferSelect;
export type InsertWork = z.infer<typeof insertWorkSchema>;
