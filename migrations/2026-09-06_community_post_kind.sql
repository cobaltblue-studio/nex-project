ALTER TABLE "community_posts"
  ADD COLUMN IF NOT EXISTS "post_kind" text NOT NULL DEFAULT 'talk';

UPDATE "community_posts"
SET "post_kind" = 'track'
WHERE "attached_track_id" IS NOT NULL
  AND COALESCE("post_kind", 'talk') = 'talk';
