import type { IStorage } from "./storage";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC midnight for `date` (default: today UTC). */
export function utcMidnight(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

let schedulerStarted = false;

export type DailySnapshotSchedulerOptions = {
  registerInterval?: (callback: () => void, delayMs: number) => unknown;
};

/**
 * Captures yesterday+today missing snapshots on boot, then checks daily for a new UTC day.
 * Safe to call multiple times — storage layer upserts by snapshot_date.
 */
export function startDailySnapshotScheduler(
  storage: IStorage,
  options?: DailySnapshotSchedulerOptions,
): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const registerInterval = options?.registerInterval ?? setInterval;

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
  registerInterval(() => void run("daily"), DAY_MS);
}

/** Test-only: reset module idempotency flag between cases. */
export function __resetDailySnapshotSchedulerForTests(): void {
  schedulerStarted = false;
}
