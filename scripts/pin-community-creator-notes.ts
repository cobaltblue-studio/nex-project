import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

/** Pin each track owner's earliest community post (retroactive creator notes). */
async function main() {
  const result = await db.execute(sql`
    WITH owner_first AS (
      SELECT DISTINCT ON (p.attached_track_id)
        p.id AS post_id,
        p.attached_track_id AS track_id
      FROM community_posts p
      INNER JOIN tracks t ON t.id = p.attached_track_id
      INNER JOIN profiles owner_pr ON owner_pr.id = t.creator_id
      WHERE p.attached_track_id IS NOT NULL
        AND p.hidden_at IS NULL
        AND p.author_user_id = owner_pr.user_id
      ORDER BY p.attached_track_id, p.created_at ASC, p.id ASC
    )
    UPDATE community_posts p
    SET pinned_at = COALESCE(p.pinned_at, NOW()),
        updated_at = NOW()
    FROM owner_first of
    WHERE p.id = of.post_id
      AND p.pinned_at IS NULL
    RETURNING p.id, p.attached_track_id AS "trackId"
  `);

  const rows = (result.rows ?? []) as { id: number; trackId: number }[];
  console.log(`Pinned ${rows.length} creator note(s).`);
  for (const row of rows) {
    console.log(`  post ${row.id} → track ${row.trackId}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
