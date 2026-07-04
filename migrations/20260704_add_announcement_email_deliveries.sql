CREATE TABLE IF NOT EXISTS "announcement_email_deliveries" (
  "id" serial PRIMARY KEY NOT NULL,
  "campaign_slug" text NOT NULL,
  "recipient_user_id" varchar,
  "recipient_email" text NOT NULL,
  "recipient_kind" text NOT NULL,
  "sent_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'announcement_email_deliveries_recipient_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "announcement_email_deliveries"
      ADD CONSTRAINT "announcement_email_deliveries_recipient_user_id_users_id_fk"
      FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "announcement_email_campaign_recipient_unique"
  ON "announcement_email_deliveries" ("campaign_slug", "recipient_email");
