-- Persist English community copy so EN UI never depends on live translate success.
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS body_en text;

ALTER TABLE community_comments
  ADD COLUMN IF NOT EXISTS content_en text;
