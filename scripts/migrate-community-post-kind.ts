import "dotenv/config";
import { readFileSync } from "fs";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

async function main() {
  const mig = readFileSync(new URL("../migrations/2026-09-06_community_post_kind.sql", import.meta.url), "utf8");
  await db.execute(sql.raw(mig));
  const cols = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'community_posts' AND column_name = 'post_kind'
  `);
  console.log(JSON.stringify({ ok: true, post_kind: cols.rows }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
