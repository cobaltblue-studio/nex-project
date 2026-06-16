/**
 * Non-interactive B2B schema migration (safe to re-run).
 * Usage: DATABASE_URL=... tsx scripts/migrate-b2b-schema.ts
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

const statements = [
  `ALTER TABLE tracks ADD COLUMN IF NOT EXISTS provenance_status text NOT NULL DEFAULT 'verified'`,
  `ALTER TABLE track_plays ALTER COLUMN user_id DROP NOT NULL`,
  `ALTER TABLE track_plays ADD COLUMN IF NOT EXISTS session_key text`,
  `ALTER TABLE track_plays ADD COLUMN IF NOT EXISTS listener_country text`,
  `ALTER TABLE track_plays ADD COLUMN IF NOT EXISTS device_class text`,
  `ALTER TABLE track_plays ADD COLUMN IF NOT EXISTS referrer_host text`,
  `ALTER TABLE battles ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS data_daily_track_snapshots (
    id serial PRIMARY KEY,
    snapshot_date timestamp NOT NULL,
    track_id integer NOT NULL REFERENCES tracks(id),
    title text NOT NULL,
    genre text NOT NULL,
    ai_tool text NOT NULL,
    track_type text NOT NULL,
    status text NOT NULL,
    provenance_status text NOT NULL DEFAULT 'verified',
    is_deleted boolean NOT NULL DEFAULT false,
    plays_count integer NOT NULL DEFAULT 0,
    likes_count integer NOT NULL DEFAULT 0,
    completed_plays_count integer NOT NULL DEFAULT 0,
    unique_listeners_count integer NOT NULL DEFAULT 0,
    battle_wins_count integer NOT NULL DEFAULT 0,
    battle_total_count integer NOT NULL DEFAULT 0,
    chart_rank integer,
    ranking_score double precision NOT NULL DEFAULT 0,
    listener_votes integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS data_daily_track_snapshots_date_track_unique
    ON data_daily_track_snapshots (snapshot_date, track_id)`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id serial PRIMARY KEY,
    recipient_user_id varchar NOT NULL REFERENCES users(id),
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    track_id integer REFERENCES tracks(id),
    href text,
    read_at timestamp,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS data_daily_platform_snapshots (
    id serial PRIMARY KEY,
    snapshot_date timestamp NOT NULL UNIQUE,
    creators integer NOT NULL DEFAULT 0,
    user_signups integer NOT NULL DEFAULT 0,
    tracks integer NOT NULL DEFAULT 0,
    tracks_approved integer NOT NULL DEFAULT 0,
    tracks_pending integer NOT NULL DEFAULT 0,
    tracks_chart integer NOT NULL DEFAULT 0,
    plays integer NOT NULL DEFAULT 0,
    likes integer NOT NULL DEFAULT 0,
    listener_votes integer NOT NULL DEFAULT 0,
    battles integer NOT NULL DEFAULT 0,
    battle_wins integer NOT NULL DEFAULT 0,
    active_boosts integer NOT NULL DEFAULT 0,
    track_plays_today integer NOT NULL DEFAULT 0,
    votes_today integer NOT NULL DEFAULT 0,
    battles_today integer NOT NULL DEFAULT 0,
    new_tracks_today integer NOT NULL DEFAULT 0,
    new_user_signups_today integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS user_activity_stats (
    id serial PRIMARY KEY,
    user_id varchar NOT NULL UNIQUE REFERENCES users(id),
    last_login_at timestamp,
    last_visit_at timestamp,
    visit_count integer NOT NULL DEFAULT 0,
    tracks_played_count integer NOT NULL DEFAULT 0,
    battle_vote_count integer NOT NULL DEFAULT 0,
    updated_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS battle_win_emails (
    id serial PRIMARY KEY,
    battle_id integer NOT NULL REFERENCES battles(id),
    winner_track_id integer NOT NULL REFERENCES tracks(id),
    sent_at timestamp NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS battle_win_emails_battle_track_unique
    ON battle_win_emails (battle_id, winner_track_id)`,
];

for (const stmt of statements) {
  await db.execute(sql.raw(stmt));
  console.log("OK:", stmt.split("\n")[0].slice(0, 72));
}

console.log("B2B schema migration complete.");
