import type { IStorage } from "./storage";

const HOUR_MS = 60 * 60 * 1000;

/** UTC midnight for `date` (default: today UTC). */
export function utcMidnight(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

let schedulerStarted = false;

/**
 * Captures yesterday+today missing snapshots on boot, then checks hourly for a new UTC day.
 * Safe to call multiple times — storage layer upserts by snapshot_date.
 */
export function startDailySnapshotScheduler(storage: IStorage): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const run = async (label: string) => {
    try {
      const out = await storage.captureDailySnapshots();
      if (out.trackRows > 0 || out.platformCaptured) {
        console.log(
          `[snapshots] ${label}: trackRows=${out.trackRows} platform=${out.platformCaptured} date=${out.snapshotDate}`,
        );
      }
    } catch (err) {
      console.error(`[snapshots] ${label} failed:`, err);
    }
  };

  void run("boot");
  setInterval(() => void run("hourly"), HOUR_MS);
}
