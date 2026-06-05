/**
 * Backfill tracks.provenance_status ('verified' | 'nex_pick') for active catalog.
 * Note: tracks.status is already used for approval pipeline (APPROVED, CHART, …).
 *
 * Dry-run (default): npx tsx scripts/backfill-track-provenance-status.ts
 * Apply:          npx tsx scripts/backfill-track-provenance-status.ts --apply
 */
import "dotenv/config";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../server/db";
import { tracks } from "@shared/schema";

const NEX_PICK_TITLES = [
  "THE RHYTHM FOUND YOU",
  "A CLOCKWORK HORROR",
  "Strange Machines",
  "Brass Afternoon",
  "Loose My Mind",
  "Dance on the Beach",
  "Day by Day",
  "A.I. FUNK",
  "Retro Funk Flash",
  "Psalm 31",
  "Semra",
  "Double Cup",
  "Shake It",
  "Breath Without Address",
  "Living Dolce in Capri",
  "The Fields Remember Your Name",
  "Kiss Me Through The Light",
  "No More Feeling",
  "We need leaders not clowns",
  "Funky groove",
  "Neon Glow",
  "No Sleep In The Club",
  "Dancing Through the Neon Night",
  "Just a Little Light",
  "Garden of Ashes",
  "Clone Army of Funk",
  "OH LA LA",
  "Alone Vibes",
  "We Drifted Apart",
  "Daylight Dance",
  "Tariff Talk",
  "Step In The Zone",
  "Our Song",
  "Funk in the Shadows",
  "Midnight Fever",
  "WO STREE HAI",
  "Dust on My Shoes",
  "Algorithm Blues",
  "Tere Diwane",
  "I Still Need You",
  "Frozen Epic",
  "BLACK N BROWN",
  "Grey Dwarf Took My Leg",
  "ROCK 'N ROLL HEATWAVE",
  "Diamonds in the Dark",
  "Viking Rock Anthem",
  "Ma R.I.P",
  "The One I Couldn't Save",
  "Game Is Over",
  "Losing Control",
  "One Beer For You",
  "Midnight Drizzle",
  "Robo Resurrection",
  "WE NEVER LEARNED TO LET GO",
  "Japanese Waka Club Mix Vol.1",
  "Turn the Heat Up",
  "AI Funk Is Here! Funky Night",
  "무대 위의 killer",
  "FAR OUT FUNK",
  "Pani Wala Dance",
  "More Compute",
  "Toxic Paradise",
  "Neural God",
  "Simbêlo",
  "Outcry",
  "DECAY",
  "OCEAN IN MY MIND",
  "Nothing Left Here",
  "Grateful For Today",
  "Sensacion",
  "My Number One",
  "Provider With Empty Hands",
  "Don't Make Us Do Outlaw Sh*t",
  "Sunset Groove",
  "Believe",
];

function normalizeTitle(raw: string): string {
  return raw
    .trim()
    .replace(/[\u2018\u2019\u201B\u2032`´]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function ensureColumn() {
  await db.execute(sql`
    ALTER TABLE tracks
    ADD COLUMN IF NOT EXISTS provenance_status text
  `);
}

async function main() {
  const apply = process.argv.includes("--apply");
  await ensureColumn();

  const activeRows = await db
    .select({ id: tracks.id, title: tracks.title })
    .from(tracks)
    .where(eq(tracks.isDeleted, false));

  const byNorm = new Map<string, Array<{ id: number; title: string }>>();
  for (const row of activeRows) {
    const key = normalizeTitle(row.title);
    const list = byNorm.get(key) ?? [];
    list.push(row);
    byNorm.set(key, list);
  }

  const unmatched: string[] = [];
  const ambiguous: { requested: string; matches: Array<{ id: number; title: string }> }[] = [];
  const nexPickIds: number[] = [];

  for (const requested of NEX_PICK_TITLES) {
    const key = normalizeTitle(requested);
    const hits = byNorm.get(key) ?? [];
    if (hits.length === 0) {
      unmatched.push(requested);
      continue;
    }
    if (hits.length > 1) {
      ambiguous.push({ requested, matches: hits });
      continue;
    }
    nexPickIds.push(hits[0].id);
  }

  if (unmatched.length > 0 || ambiguous.length > 0) {
    console.error("STOP: title matching failed. No database updates were applied.\n");
    if (unmatched.length > 0) {
      console.error("=== Unmatched titles (not found among active tracks) ===");
      for (const t of unmatched) console.error(`- ${t}`);
    }
    if (ambiguous.length > 0) {
      console.error("\n=== Ambiguous titles (multiple active tracks) ===");
      for (const a of ambiguous) {
        console.error(`- Requested: ${a.requested}`);
        for (const m of a.matches) console.error(`    id=${m.id} title=${JSON.stringify(m.title)}`);
      }
    }
    process.exit(1);
  }

  const nexPickIdSet = new Set(nexPickIds);
  const verifiedCount = activeRows.length - nexPickIdSet.size;

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    activeTotal: activeRows.length,
    nexPickRequested: NEX_PICK_TITLES.length,
    nexPickMatched: nexPickIds.length,
    verifiedWouldSet: verifiedCount,
    unmatched: 0,
  }, null, 2));

  if (!apply) {
    console.log("\nDry-run OK. Re-run with --apply to write provenance_status.");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    if (nexPickIds.length > 0) {
      await tx
        .update(tracks)
        .set({ provenanceStatus: "nex_pick" })
        .where(inArray(tracks.id, nexPickIds));
    }
    await tx
      .update(tracks)
      .set({ provenanceStatus: "verified" })
      .where(
        and(
          eq(tracks.isDeleted, false),
          notInArray(tracks.id, nexPickIds.length > 0 ? nexPickIds : [-1]),
        ),
      );
  });

  const counts = await db.execute(sql`
    SELECT provenance_status, COUNT(*)::int AS n
    FROM tracks
    WHERE is_deleted = false
    GROUP BY provenance_status
    ORDER BY provenance_status NULLS LAST
  `);

  console.log("\n=== Final counts (active tracks) ===");
  console.log(counts.rows);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
