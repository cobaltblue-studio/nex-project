import { pgTable, text, varchar, timestamp, integer, boolean, serial, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
import { users } from "./models/auth";

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  username: text("username").notNull().unique(),
  bio: text("bio"),
  role: text("role").default("listener").notNull(), // "listener", "nex", "founder"
  nexNumber: integer("nex_number"),
  totalScore: doublePrecision("total_score").default(0).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").references(() => profiles.id).notNull(),
  title: text("title").notNull(),
  audioUrl: text("audio_url").notNull(),
  mvUrl: text("mv_url"), // YouTube link
  lyrics: text("lyrics"),
  aiTool: text("ai_tool").notNull(), // Suno, Udio, Stable Audio
  genre: text("genre").notNull(),
  status: text("status").default("SUBMITTED").notNull(), // SUBMITTED, PUBLISHED, REJECTED
  
  // Scores
  aiCraftScore: doublePrecision("ai_craft_score").default(0).notNull(),
  listenerVotes: integer("listener_votes").default(0).notNull(),
  neoScore: doublePrecision("neo_score").default(0).notNull(),
  
  isFeatured: boolean("is_featured").default(false).notNull(),
  releaseDate: timestamp("release_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trackId: integer("track_id").references(() => tracks.id).notNull(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trackId: integer("track_id").references(() => tracks.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  tracks: many(tracks),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  creator: one(profiles, { fields: [tracks.creatorId], references: [profiles.id] }),
  likes: many(likes),
  votes: many(votes),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, userId: true, totalScore: true, createdAt: true });
export const insertTrackSchema = createInsertSchema(tracks).omit({ id: true, creatorId: true, status: true, aiCraftScore: true, listenerVotes: true, neoScore: true, isFeatured: true, releaseDate: true, createdAt: true });

export type Profile = typeof profiles.$inferSelect;
export type Track = typeof tracks.$inferSelect;
