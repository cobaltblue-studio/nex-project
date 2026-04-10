/**
 * Approve all PENDING / legacy SUBMITTED tracks for a profile (by username): set BATTLE_POOL,
 * promote listener → creator (same as admin Approve).
 *
 * Run (production DB URL in env):
 *   npx tsx scripts/approve-tracks-for-username.ts coracardot
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { profiles, tracks } from "@shared/schema";
import { db } from "../server/db";
import { storage } from "../server/storage";

async function main() {
  const username = process.argv[2]?.trim();
  if (!username) {
    console.error("Usage: npx tsx scripts/approve-tracks-for-username.ts <username>");
    process.exit(1);
  }

  const [p] = await db.select().from(profiles).where(eq(profiles.username, username));
  if (!p) {
    console.error(`No profile with username: ${username}`);
    process.exit(1);
  }

  const pending = await db
    .select()
    .from(tracks)
    .where(
      and(eq(tracks.creatorId, p.id), eq(tracks.isDeleted, false), inArray(tracks.status, ["PENDING", "SUBMITTED"])),
    );

  if (pending.length === 0) {
    console.log("No PENDING or SUBMITTED tracks for this profile.");
    process.exit(0);
  }

  for (const t of pending) {
    await storage.updateTrackStatus(t.id, "BATTLE_POOL");
    console.log(`→ BATTLE_POOL  #${t.id}  ${t.title}`);
  }

  const [pr] = await db.select().from(profiles).where(eq(profiles.id, p.id));
  if (pr?.role === "listener") {
    await storage.updateProfile(pr.id, { role: "creator", creatorApplicationStatus: "none" });
    console.log("→ Profile promoted: listener → creator, application cleared.");
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
