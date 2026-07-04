CREATE TABLE IF NOT EXISTS "community_posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "author_user_id" varchar NOT NULL REFERENCES "users"("id"),
  "category" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "attached_track_id" integer REFERENCES "tracks"("id"),
  "external_url" text,
  "pinned_at" timestamp,
  "hidden_at" timestamp,
  "hidden_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "community_post_likes" (
  "id" serial PRIMARY KEY NOT NULL,
  "post_id" integer NOT NULL REFERENCES "community_posts"("id"),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "community_comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "post_id" integer NOT NULL REFERENCES "community_posts"("id"),
  "author_user_id" varchar NOT NULL REFERENCES "users"("id"),
  "content" text NOT NULL,
  "hidden_at" timestamp,
  "hidden_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "community_post_likes_user_post_unique"
  ON "community_post_likes" ("user_id", "post_id");

CREATE INDEX IF NOT EXISTS "community_posts_created_at_idx"
  ON "community_posts" ("created_at");

CREATE INDEX IF NOT EXISTS "community_posts_category_idx"
  ON "community_posts" ("category");

CREATE INDEX IF NOT EXISTS "community_comments_post_id_idx"
  ON "community_comments" ("post_id");

