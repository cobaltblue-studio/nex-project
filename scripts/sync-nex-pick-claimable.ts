/**
 * Sync claimable_by_creators with provenance_status (nex_pick → true, verified → false).
 * Run: npx tsx scripts/sync-nex-pick-claimable.ts [--apply]
 */
import "dotenv/config";
import { db } from "../server/db";
import { tracks } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";
import { TRACK_PROVENANCE_NEX_PICK, TRACK_PROVENANCE_VERIFIED } from "@shared/constants";

async function main() {
  const apply = process.argv.includes("--apply");
  const counts = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE is_deleted=false AND provenance_status='nex_pick')::int AS nex_pick,
      COUNT(*) FILTER (WHERE is_deleted=false AND provenance_status='verified')::int AS verified,
      COUNT(*) FILTER (WHERE is_deleted=false AND claimable_by_creators=true)::int AS claimable
    FROM tracks
  `);
  console.log("Before:", counts.rows[0]);
  if (!apply) {
    console.log("Dry-run. Re-run with --apply to update.");
    process.exit(0);
  }
  await db
    .update(tracks)
    .set({ claimableByCreators: true })
    .where(and(eq(tracks.isDeleted, false), eq(tracks.provenanceStatus, TRACK_PROVENANCE_NEX_PICK)));
  await db
    .update(tracks)
    .set({ claimableByCreators: false })
    .where(and(eq(tracks.isDeleted, false), eq(tracks.provenanceStatus, TRACK_PROVENANCE_VERIFIED)));
  const after = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE is_deleted=false AND provenance_status='nex_pick' AND claimable_by_creators=true)::int AS nex_pick_claimable,
      COUNT(*) FILTER (WHERE is_deleted=false AND provenance_status='verified' AND claimable_by_creators=false)::int AS verified_not_claimable,
      COUNT(*) FILTER (WHERE is_deleted=false AND claimable_by_creators=true)::int AS claimable_total
    FROM tracks
  `);
  console.log("After:", after.rows[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
