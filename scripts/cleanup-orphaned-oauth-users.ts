import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../server/db";
import { users } from "../shared/models/auth";
import {
  analyticsEvents,
  announcementEmailDeliveries,
  battleListenCompletions,
  battleVotes,
  boostImpressionEvents,
  comments,
  communityComments,
  communityPostLikes,
  communityPosts,
  creatorEngagementEmails,
  follows,
  likes,
  notifications,
  trackPlays,
  userActivityStats,
  votes,
} from "../shared/schema";

/**
 * Deletes "ghost" accounts: Google OAuth completed (a `users` row exists) but
 * the profile-setup step never ran, so there's no `profiles` row. These show
 * up in the admin panel as blank username/role rows.
 *
 * Safety: a candidate is only deleted if it has ZERO rows in every table that
 * represents real user-generated engagement (likes, votes, follows, plays,
 * battle votes/completions, comments, community posts/likes/comments).
 * Harmless log/notification rows (analytics events, notifications, engagement
 * emails, announcement deliveries, boost impressions, activity stats) are
 * deleted as part of cleanup since they carry no standalone value once the
 * user is gone.
 *
 * Run with no flags for a dry run (report only). Pass --confirm to delete.
 */

const ENGAGEMENT_CHECKS: Array<{ label: string; table: any; column: any }> = [
  { label: "likes", table: likes, column: likes.userId },
  { label: "votes", table: votes, column: votes.userId },
  { label: "follows", table: follows, column: follows.followerId },
  { label: "trackPlays", table: trackPlays, column: trackPlays.userId },
  { label: "battleVotes", table: battleVotes, column: battleVotes.userId },
  { label: "battleListenCompletions", table: battleListenCompletions, column: battleListenCompletions.userId },
  { label: "comments", table: comments, column: comments.userId },
  { label: "communityPosts", table: communityPosts, column: communityPosts.authorUserId },
  { label: "communityPostLikes", table: communityPostLikes, column: communityPostLikes.userId },
  { label: "communityComments", table: communityComments, column: communityComments.authorUserId },
];

async function main() {
  const confirm = process.argv.includes("--confirm");

  const ghosts = await db.execute(
    sql`select u.id, u.email, u.created_at
        from users u
        left join profiles p on p.user_id = u.id
        where p.id is null
        order by u.created_at asc`,
  );

  const rows = ghosts.rows as Array<{ id: string; email: string | null; created_at: string }>;

  if (rows.length === 0) {
    console.log("No orphaned (profile-less) users found.");
    return;
  }

  console.log(`Found ${rows.length} user(s) with no profile row.\n`);

  const safeToDelete: typeof rows = [];
  const skipped: Array<{ row: (typeof rows)[number]; reason: string }> = [];

  for (const row of rows) {
    const engagement: string[] = [];
    for (const check of ENGAGEMENT_CHECKS) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(check.table)
        .where(eq(check.column, row.id));
      if (Number(n) > 0) engagement.push(`${check.label}=${n}`);
    }

    if (engagement.length > 0) {
      skipped.push({ row, reason: engagement.join(", ") });
    } else {
      safeToDelete.push(row);
    }
  }

  console.log(`Safe to delete (no real engagement): ${safeToDelete.length}`);
  for (const r of safeToDelete) {
    console.log(`  - ${r.id}  ${r.email ?? "(no email)"}  created ${r.created_at}`);
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped (has engagement — review manually): ${skipped.length}`);
    for (const s of skipped) {
      console.log(`  - ${s.row.id}  ${s.row.email ?? "(no email)"}  [${s.reason}]`);
    }
  }

  if (!confirm) {
    console.log("\nDry run only — nothing deleted. Re-run with --confirm to delete the safe list above.");
    return;
  }

  if (safeToDelete.length === 0) {
    console.log("\nNothing to delete.");
    return;
  }

  console.log(`\nDeleting ${safeToDelete.length} orphaned user(s)...`);
  for (const r of safeToDelete) {
    await db.transaction(async (tx) => {
      await tx.delete(userActivityStats).where(eq(userActivityStats.userId, r.id));
      await tx.delete(analyticsEvents).where(eq(analyticsEvents.userId, r.id));
      await tx.delete(notifications).where(eq(notifications.recipientUserId, r.id));
      await tx.delete(creatorEngagementEmails).where(eq(creatorEngagementEmails.recipientUserId, r.id));
      await tx.delete(announcementEmailDeliveries).where(eq(announcementEmailDeliveries.recipientUserId, r.id));
      await tx.delete(boostImpressionEvents).where(eq(boostImpressionEvents.viewerUserId, r.id));
      await tx.delete(users).where(eq(users.id, r.id));
    });
    console.log(`  deleted ${r.id}  ${r.email ?? "(no email)"}`);
  }
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
