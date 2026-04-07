import { pgTable, text, varchar, timestamp, integer, boolean, serial, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";
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
  /** Creator profile image — https URL or data URL (max 500KB enforced in API) */
  avatarUrl: text("avatar_url"),
  aiToolUsed: text("ai_tool_used"),
  role: text("role").default("listener").notNull(), // "listener", "creator", "nex" (legacy), "founder", "admin"
  /** `none` | `pending` | `rejected` — listeners who applied to become creators wait for admin approval */
  creatorApplicationStatus: text("creator_application_status").default("none").notNull(),
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
  coverImageUrl: text("cover_image"),
  description: text("description"),
  lyrics: text("lyrics"),
  artistName: text("artist_name"),
  aiTool: text("ai_tool").notNull(),
  genre: text("genre").notNull(),
  trackType: text("track_type").default("audio").notNull(),
  status: text("status").default("PENDING").notNull(),
  aiCraftScore: doublePrecision("ai_craft_score").default(0).notNull(),
  listenerVotes: integer("listener_votes").default(0).notNull(),
  neoScore: doublePrecision("neo_score").default(0).notNull(),
  playCount: integer("play_count").default(0).notNull(),
  rankingScore: doublePrecision("ranking_score").default(0).notNull(),
  lastPlayedAt: timestamp("last_played_at"),
  aiPrompt: text("ai_prompt"),
  /** Owner-driven `aiPrompt` changes after initial registration (capped server-side). */
  aiPromptEditCount: integer("ai_prompt_edit_count").default(0).notNull(),
  /** When the owner last changed `aiPrompt` (48h cooldown before another edit). */
  aiPromptLastEditedAt: timestamp("ai_prompt_last_edited_at"),
  winStreak: integer("win_streak").default(0).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  releaseDate: timestamp("release_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  archivedAt: timestamp("archived_at"),
  /** Soft-delete: excluded from all public listings when true */
  isDeleted: boolean("is_deleted").default(false).notNull(),
  /** Platform-seeded track; creators may request ownership (admin or secret code). */
  claimableByCreators: boolean("claimable_by_creators").default(false).notNull(),
});

/** Pending ownership transfers from creators → admin approval */
export const trackClaimRequests = pgTable("track_claim_requests", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id").references(() => tracks.id).notNull(),
  requesterProfileId: integer("requester_profile_id").references(() => profiles.id).notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const boostTickets = pgTable(
  "boost_tickets",
  {
    id: serial("id").primaryKey(),
    userProfileId: integer("user_profile_id").references(() => profiles.id).notNull(),
    amount: integer("amount").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("boost_tickets_user_profile_id_unique").on(table.userProfileId)],
);

export const boostUsageLogs = pgTable("boost_usage_logs", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id").references(() => tracks.id).notNull(),
  ownerProfileId: integer("owner_profile_id").references(() => profiles.id).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  targetImpressions: integer("target_impressions").default(1000).notNull(),
  currentImpressions: integer("current_impressions").default(0).notNull(),
  status: text("status").default("ACTIVE").notNull(), // ACTIVE | COMPLETED
});

export const boostImpressionEvents = pgTable(
  "boost_impression_events",
  {
    id: serial("id").primaryKey(),
    usageLogId: integer("usage_log_id").references(() => boostUsageLogs.id).notNull(),
    trackId: integer("track_id").references(() => tracks.id).notNull(),
    viewerUserId: varchar("viewer_user_id").references(() => users.id),
    sessionKey: text("session_key"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("boost_impression_events_usage_viewer_unique").on(table.usageLogId, table.viewerUserId),
    uniqueIndex("boost_impression_events_usage_session_unique").on(table.usageLogId, table.sessionKey),
  ],
);

/** One row per track: cooldown, active flag, cumulative boosted impressions */
export const boostStatus = pgTable(
  "boost_status",
  {
    id: serial("id").primaryKey(),
    trackId: integer("track_id").references(() => tracks.id).notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    lastUsedAt: timestamp("last_used_at"),
    cooldownUntil: timestamp("cooldown_until"),
    totalImpressions: integer("total_impressions").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("boost_status_track_id_unique").on(table.trackId)],
);

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
  completed: boolean("completed").default(false).notNull(),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

// Aggregated per-track counters used for fast ranking recomputation.
export const trackMetrics = pgTable("track_metrics", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id").references(() => tracks.id).notNull().unique(),
  likesCount: integer("likes_count").default(0).notNull(),
  playsCount: integer("plays_count").default(0).notNull(),
  completedPlaysCount: integer("completed_plays_count").default(0).notNull(),
  uniqueListenersCount: integer("unique_listeners_count").default(0).notNull(),
  relistenPlaysCount: integer("relisten_plays_count").default(0).notNull(),
  battleTotalCount: integer("battle_total_count").default(0).notNull(),
  battleWinsCount: integer("battle_wins_count").default(0).notNull(),
  followerCount: integer("follower_count").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trackId: integer("track_id").references(() => tracks.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  metrics: one(trackMetrics, { fields: [tracks.id], references: [trackMetrics.trackId] }),
  claimRequests: many(trackClaimRequests),
  boostUsageLogs: many(boostUsageLogs),
  boostStatus: one(boostStatus, { fields: [tracks.id], references: [boostStatus.trackId] }),
}));

export const boostTicketsRelations = relations(boostTickets, ({ one }) => ({
  profile: one(profiles, { fields: [boostTickets.userProfileId], references: [profiles.id] }),
}));

export const boostUsageLogsRelations = relations(boostUsageLogs, ({ one, many }) => ({
  track: one(tracks, { fields: [boostUsageLogs.trackId], references: [tracks.id] }),
  ownerProfile: one(profiles, { fields: [boostUsageLogs.ownerProfileId], references: [profiles.id] }),
  impressionEvents: many(boostImpressionEvents),
}));

export const boostImpressionEventsRelations = relations(boostImpressionEvents, ({ one }) => ({
  usageLog: one(boostUsageLogs, { fields: [boostImpressionEvents.usageLogId], references: [boostUsageLogs.id] }),
  track: one(tracks, { fields: [boostImpressionEvents.trackId], references: [tracks.id] }),
}));

export const boostStatusRelations = relations(boostStatus, ({ one }) => ({
  track: one(tracks, { fields: [boostStatus.trackId], references: [tracks.id] }),
}));

export const trackClaimRequestsRelations = relations(trackClaimRequests, ({ one }) => ({
  track: one(tracks, { fields: [trackClaimRequests.trackId], references: [tracks.id] }),
  requester: one(profiles, { fields: [trackClaimRequests.requesterProfileId], references: [profiles.id] }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  creator: one(profiles, { fields: [follows.creatorProfileId], references: [profiles.id] }),
}));

export const trackPlaysRelations = relations(trackPlays, ({ one }) => ({
  track: one(tracks, { fields: [trackPlays.trackId], references: [tracks.id] }),
}));

export const trackMetricsRelations = relations(trackMetrics, ({ one }) => ({
  track: one(tracks, { fields: [trackMetrics.trackId], references: [tracks.id] }),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, userId: true, totalScore: true, createdAt: true });
export const insertTrackSchema = createInsertSchema(tracks).omit({
  id: true,
  creatorId: true,
  status: true,
  aiCraftScore: true,
  listenerVotes: true,
  neoScore: true,
  playCount: true,
  rankingScore: true,
  lastPlayedAt: true,
  winStreak: true,
  isFeatured: true,
  releaseDate: true,
  createdAt: true,
  archivedAt: true,
  isDeleted: true,
  claimableByCreators: true,
  aiPromptEditCount: true,
  aiPromptLastEditedAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });

export type Profile = typeof profiles.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type TrackPlay = typeof trackPlays.$inferSelect;
export type Battle = typeof battles.$inferSelect;
export type BattleVote = typeof battleVotes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type BoostTicket = typeof boostTickets.$inferSelect;
export type BoostUsageLog = typeof boostUsageLogs.$inferSelect;
export type BoostStatusRow = typeof boostStatus.$inferSelect;
