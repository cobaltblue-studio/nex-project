import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { tracks } from "@shared/schema";
import type { IStorage } from "./storage";
import { describePlaybackIssue, inspectTrackPlaybackAvailability } from "./media-availability";

const PUBLIC_TRACK_STATUSES = ["MV", "BATTLE_POOL", "PUBLISHED", "APPROVED", "CHART"] as const;
const AUDIT_INTERVAL_MS = 24 * 60 * 60 * 1000;
let auditStarted = false;

async function runPlaybackAudit(storage: IStorage, label: string): Promise<void> {
  const rows = await db
    .select({
      id: tracks.id,
      title: tracks.title,
      trackType: tracks.trackType,
      audioUrl: tracks.audioUrl,
      mvUrl: tracks.mvUrl,
      status: tracks.status,
      createdAt: tracks.createdAt,
    })
    .from(tracks)
    .where(and(eq(tracks.isDeleted, false), inArray(tracks.status, [...PUBLIC_TRACK_STATUSES])))
    .orderBy(desc(tracks.createdAt))
    .limit(200);

  let blocked = 0;
  for (const row of rows) {
    const playbackUrl =
      row.trackType === "video"
        ? String(row.mvUrl || row.audioUrl || "").trim()
        : String(row.audioUrl || row.mvUrl || "").trim();
    if (!playbackUrl) continue;
    const check = await inspectTrackPlaybackAvailability(playbackUrl);
    if (check.status !== "blocked") continue;
    blocked += 1;
    const issue = describePlaybackIssue(check);
    await storage.notifyTrackPlaybackIssue(row.id, issue.en);
  }

  if (blocked > 0) {
    console.log(`[playback-audit] ${label}: notified ${blocked} blocked public track(s)`);
  }
}

export function startPublicTrackPlaybackAudit(storage: IStorage): void {
  if (auditStarted) return;
  auditStarted = true;
  void runPlaybackAudit(storage, "boot").catch((err) => {
    console.error("[playback-audit] boot failed:", err);
  });
  setInterval(() => {
    void runPlaybackAudit(storage, "interval").catch((err) => {
      console.error("[playback-audit] interval failed:", err);
    });
  }, AUDIT_INTERVAL_MS);
}
