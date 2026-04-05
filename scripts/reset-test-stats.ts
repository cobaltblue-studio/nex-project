/**
 * Clears battle history, chart battle-derived boosts, and listener vote tallies so the Music chart
 * reflects only organic scores (until new battles / votes). Demotes CHART → APPROVED.
 * Run: npx tsx scripts/reset-test-stats.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { battleVotes, battles, trackMetrics, trackPlays, tracks, votes } from "@shared/schema";
import { db } from "../server/db";
import { computeRankingScore } from "../server/storage";

async function main() {
  await db.delete(battleVotes);
  await db.delete(battles);
  await db.delete(trackPlays);
  await db.delete(trackMetrics);
  await db.delete(votes);

  const demoted = await db
    .update(tracks)
    .set({ status: "APPROVED" })
    .where(eq(tracks.status, "CHART"))
    .returning({ id: tracks.id });

  const all = await db.select().from(tracks);
  for (const t of all) {
    const rs = computeRankingScore({
      battleWins: 0,
      battleTotal: 0,
      likesCount: 0,
      playCount: 0,
      followerCount: 0,
      completionRate: 0,
      saveRelistenRate: 0,
      uniqueListeners: 0,
      createdAt: t.createdAt,
    });
    const neo = Number(t.aiCraftScore) * 0.7;
    await db
      .update(tracks)
      .set({
        playCount: 0,
        listenerVotes: 0,
        winStreak: 0,
        neoScore: neo,
        rankingScore: rs,
        lastPlayedAt: null,
      })
      .where(eq(tracks.id, t.id));
  }

  console.log(
    `Reset: ${all.length} tracks (ranking/play/votes/win streak), CHART→APPROVED: ${demoted.length}, battles & listener votes cleared.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
