/**
 * Remove duplicate rows in `likes` (same user_id + track_id) before unique index migration.
 * Run against Railway production DB:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/dedupe-duplicate-likes.ts
 */
import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set. Paste Railway nex-project → Variables → DATABASE_URL.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });

const DEDUPE_SQL = `
DELETE FROM likes a
USING likes b
WHERE a.user_id = b.user_id
  AND a.track_id = b.track_id
  AND a.id < b.id;
`;

async function main() {
  const before = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM (
      SELECT user_id, track_id FROM likes GROUP BY user_id, track_id HAVING COUNT(*) > 1
    ) dup`,
  );
  const dupPairs = Number(before.rows[0]?.n ?? 0);
  console.log(`Duplicate user+track pairs before cleanup: ${dupPairs}`);

  const result = await pool.query(DEDUPE_SQL);
  console.log(`Deleted duplicate like rows: ${result.rowCount ?? 0}`);

  const after = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM (
      SELECT user_id, track_id FROM likes GROUP BY user_id, track_id HAVING COUNT(*) > 1
    ) dup`,
  );
  console.log(`Duplicate pairs after cleanup: ${after.rows[0]?.n ?? 0}`);
  console.log("\nNext: DATABASE_URL=\"...\" npm run db:push");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
