/**
 * Normalize track ownership so each track points to its real creator profile.
 * Strategy: map by artistName -> profile.username (case-insensitive, sanitized).
 * If no profile exists, create a dedicated creator user/profile for that artist.
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { profiles, tracks, users } from "@shared/schema";
import { db } from "../server/db";

function sanitizeUsername(raw: string): string {
  const s = raw.toLowerCase().trim().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return s.slice(0, 30) || "creator";
}

async function ensureUniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let i = 1;
  for (;;) {
    const [exists] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.username, candidate)).limit(1);
    if (!exists) return candidate;
    i += 1;
    candidate = `${base}_${i}`;
  }
}

async function main() {
  const allProfiles = await db
    .select({ id: profiles.id, username: profiles.username, role: profiles.role, userId: profiles.userId })
    .from(profiles);
  const usernameToProfile = new Map(allProfiles.map((p) => [p.username.toLowerCase(), p]));

  const allTracks = await db
    .select({ id: tracks.id, creatorId: tracks.creatorId, artistName: tracks.artistName })
    .from(tracks)
    .where(eq(tracks.isDeleted, false));

  const distinctArtistNames = Array.from(
    new Set(
      allTracks
        .map((t) => t.artistName?.trim())
        .filter((x): x is string => !!x && x.length > 0),
    ),
  );

  let createdProfiles = 0;
  const artistToProfileId = new Map<string, number>();

  for (const artistName of distinctArtistNames) {
    const base = sanitizeUsername(artistName);
    const direct = usernameToProfile.get(base);
    if (direct) {
      artistToProfileId.set(artistName, direct.id);
      continue;
    }

    const uniqueUsername = await ensureUniqueUsername(base);
    const userId = `artist_${uniqueUsername}`;
    await db
      .insert(users)
      .values({
        id: userId,
        email: `${uniqueUsername}@artist.local`,
        firstName: artistName,
      })
      .onConflictDoNothing();

    const [created] = await db
      .insert(profiles)
      .values({
        userId,
        username: uniqueUsername,
        role: "creator",
        bio: `Auto-created from artistName: ${artistName}`,
      })
      .onConflictDoNothing()
      .returning();

    const profileRow =
      created ??
      (await db.select().from(profiles).where(eq(profiles.username, uniqueUsername)).limit(1))[0];
    if (!profileRow) continue;
    usernameToProfile.set(uniqueUsername, profileRow);
    artistToProfileId.set(artistName, profileRow.id);
    createdProfiles += 1;
  }

  let updated = 0;
  for (const t of allTracks) {
    const artistName = t.artistName?.trim();
    if (!artistName) continue;
    const nextCreatorId = artistToProfileId.get(artistName);
    if (!nextCreatorId || nextCreatorId === t.creatorId) continue;
    await db.update(tracks).set({ creatorId: nextCreatorId }).where(eq(tracks.id, t.id));
    updated += 1;
  }

  const distribution = await db
    .select({ creatorId: tracks.creatorId, n: sql<number>`count(*)` })
    .from(tracks)
    .where(eq(tracks.isDeleted, false))
    .groupBy(tracks.creatorId)
    .orderBy(sql`count(*) desc`);

  console.log(`Created profiles: ${createdProfiles}`);
  console.log(`Updated tracks: ${updated}`);
  console.log("New creatorId distribution:");
  for (const row of distribution) {
    console.log(`  creatorId=${row.creatorId} tracks=${row.n}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
