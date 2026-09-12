/**
 * Same-id URL upgrade: rewrite suno.com/s/{code} → https://suno.com/song/{uuid}.
 * Does not delete/recreate tracks. Dry-run by default; pass --apply to write.
 *
 * Run: npx tsx scripts/normalize-suno-short-links.ts
 *      npx tsx scripts/normalize-suno-short-links.ts --apply
 */
import "dotenv/config";
import { and, eq, like, or } from "drizzle-orm";
import { db } from "../server/db";
import { tracks } from "../shared/schema";
import { resolveSunoShareToSongUuid } from "../server/suno-resolve";

const APPLY = process.argv.includes("--apply");

function isShortSuno(url: string): boolean {
  return /suno\.(com|ai)\/s\//i.test(url);
}

async function main() {
  const rows = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      audioUrl: tracks.audioUrl,
      mvUrl: tracks.mvUrl,
    })
    .from(tracks)
    .where(
      and(
        eq(tracks.isDeleted, false),
        or(like(tracks.audioUrl, "%suno.com/s/%"), like(tracks.audioUrl, "%suno.ai/s/%")),
      ),
    );

  console.log(`Found ${rows.length} non-deleted tracks with Suno /s/ audioUrl`);
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const raw = (row.audioUrl || "").trim();
    if (!isShortSuno(raw)) continue;
    const uuid = await resolveSunoShareToSongUuid(raw);
    if (!uuid) {
      failed += 1;
      console.log(`FAIL id=${row.id} could not resolve: ${raw}`);
      continue;
    }
    const next = `https://suno.com/song/${uuid}`;
    if (next === raw) continue;
    console.log(`${APPLY ? "UPDATE" : "DRY"} id=${row.id} ${(row.title || "").slice(0, 40)}`);
    console.log(`  ${raw}`);
    console.log(`  → ${next}`);
    if (APPLY) {
      await db.update(tracks).set({ audioUrl: next }).where(eq(tracks.id, row.id));
      updated += 1;
    }
  }

  console.log(APPLY ? `Updated ${updated}, failed ${failed}` : `Dry-run done (failed resolves: ${failed}). Re-run with --apply to write.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
