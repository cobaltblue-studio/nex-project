import "dotenv/config";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "../server/db";
import { battles, profiles, tracks } from "../shared/schema";

async function main() {
  const [trackTotal] = await db.select({ n: count() }).from(tracks).where(eq(tracks.isDeleted, false));
  const [profileTotal] = await db.select({ n: count() }).from(profiles);
  const [battleTotal] = await db.select({ n: count() }).from(battles);

  const orphanTracks = await db.execute(
    sql`select count(*)::int as n
        from tracks t
        left join profiles p on p.id = t.creator_id
        where t.is_deleted = false and p.id is null`,
  );
  const orphanBattles = await db.execute(
    sql`select count(*)::int as n
        from battles b
        left join tracks ta on ta.id = b.track_a_id
        left join tracks tb on tb.id = b.track_b_id
        where ta.id is null or tb.id is null`,
  );

  const [audioChartEligible] = await db
    .select({ n: count() })
    .from(tracks)
    .where(
      and(
        sql`${tracks.status} IN ('PUBLISHED', 'BATTLE_POOL', 'APPROVED', 'CHART')`,
        eq(tracks.trackType, "audio"),
        eq(tracks.isDeleted, false),
      ),
    );

  console.log(
    JSON.stringify({
      tracks: Number(trackTotal.n),
      profiles: Number(profileTotal.n),
      battles: Number(battleTotal.n),
      audioChartEligible: Number(audioChartEligible.n),
      orphanTracks: Number(orphanTracks.rows[0]?.n ?? 0),
      orphanBattles: Number(orphanBattles.rows[0]?.n ?? 0),
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
