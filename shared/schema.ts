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
  country: text("country"),
  aiToolUsed: text("ai_tool_used"),
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
  mvUrl: text("mv_url"),
  coverImage: text("cover_image"),
  description: text("description"),
  lyrics: text("lyrics"),
  aiTool: text("ai_tool").notNull(),
  genre: text("genre").notNull(),
  status: text("status").default("SUBMITTED").notNull(),
  aiCraftScore: doublePrecision("ai_craft_score").default(0).notNull(),
  listenerVotes: integer("listener_votes").default(0).notNull(),
  neoScore: doublePrecision("neo_score").default(0).notNull(),
  playCount: integer("play_count").default(0).notNull(),
  rankingScore: doublePrecision("ranking_score").default(0).notNull(),
  lastPlayedAt: timestamp("last_played_at"),
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

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: varchar("follower_id").references(() => users.id).notNull(),
  creatorProfileId: integer("creator_profile_id").references(() => profiles.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tracks play history for spam prevention (once per 10 min per user per track)
export const trackPlays = pgTable("track_plays", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trackId: integer("track_id").references(() => tracks.id).notNull(),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

// AI Music Battle: two tracks from the same genre face off
export const battles = pgTable("battles", {
  id: serial("id").primaryKey(),
  genre: text("genre").notNull(),
  trackAId: integer("track_a_id").references(() => tracks.id).notNull(),
  trackBId: integer("track_b_id").references(() => tracks.id).notNull(),
  trackAVotes: integer("track_a_votes").default(0).notNull(),
  trackBVotes: integer("track_b_votes").default(0).notNull(),
  winnerId: integer("winner_id").references(() => tracks.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Each user can vote once per battle
export const battleVotes = pgTable("battle_votes", {
  id: serial("id").primaryKey(),
  battleId: integer("battle_id").references(() => battles.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trackId: integer("track_id").references(() => tracks.id).notNull(),
  votedAt: timestamp("voted_at").defaultNow().notNull(),
});

export const battlesRelations = relations(battles, ({ one, many }) => ({
  trackA: one(tracks, { fields: [battles.trackAId], references: [tracks.id] }),
  trackB: one(tracks, { fields: [battles.trackBId], references: [tracks.id] }),
  winner: one(tracks, { fields: [battles.winnerId], references: [tracks.id] }),
  votes: many(battleVotes),
}));

export const battleVotesRelations = relations(battleVotes, ({ one }) => ({
  battle: one(battles, { fields: [battleVotes.battleId], references: [battles.id] }),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  tracks: many(tracks),
  followers: many(follows),
}));

export const tracksRelations = relations(tracks, ({ one, many }) => ({
  creator: one(profiles, { fields: [tracks.creatorId], references: [profiles.id] }),
  likes: many(likes),
  votes: many(votes),
  plays: many(trackPlays),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  creator: one(profiles, { fields: [follows.creatorProfileId], references: [profiles.id] }),
}));

export const trackPlaysRelations = relations(trackPlays, ({ one }) => ({
  track: one(tracks, { fields: [trackPlays.trackId], references: [tracks.id] }),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, userId: true, totalScore: true, createdAt: true });
export const insertTrackSchema = createInsertSchema(tracks).omit({ id: true, creatorId: true, status: true, aiCraftScore: true, listenerVotes: true, neoScore: true, playCount: true, rankingScore: true, lastPlayedAt: true, isFeatured: true, releaseDate: true, createdAt: true });

export type Profile = typeof profiles.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type TrackPlay = typeof trackPlays.$inferSelect;
export type Battle = typeof battles.$inferSelect;
export type BattleVote = typeof battleVotes.$inferSelect;
