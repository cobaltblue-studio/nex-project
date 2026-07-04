CREATE TABLE IF NOT EXISTS "announcement_email_campaign_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "campaign_slug" text NOT NULL,
  "dry_run" boolean DEFAULT false NOT NULL,
  "limit" integer,
  "requested_by" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "summary" jsonb,
  "error" text,
  "requested_at" timestamp DEFAULT now() NOT NULL,
  "started_at" timestamp,
  "completed_at" timestamp
);
