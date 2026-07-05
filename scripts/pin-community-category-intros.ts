import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { COMMUNITY_SYSTEM_SEED_POSTS } from "../shared/community";

/** Pin category intro posts (system:nex-community) at the top of each section. */
async function main() {
  const ids = COMMUNITY_SYSTEM_SEED_POSTS.filter((p) => p.pinned).map((p) => p.postId);
  const result = await db.execute(sql`
    UPDATE community_posts
    SET pinned_at = COALESCE(pinned_at, NOW()),
        updated_at = NOW()
    WHERE id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
       OR (author_user_id = 'system:nex-community' AND attached_track_id IS NULL AND hidden_at IS NULL)
    RETURNING id, category, title, pinned_at
  `);

  const rows = (result.rows ?? []) as { id: number; category: string; title: string; pinned_at: string }[];
  console.log(`Pinned ${rows.length} category intro post(s).`);
  for (const row of rows) {
    console.log(`  #${row.id} [${row.category}] ${row.title.slice(0, 40)}…`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
