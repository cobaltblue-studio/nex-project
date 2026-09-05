import { DAY_MS } from "./dailySnapshot";

/** Expired-session GC cadence — must stay ≥ STZ idle window (5m) by a wide margin. */
export const SESSION_PRUNE_INTERVAL_MS = DAY_MS;

export type SessionPruneStore = {
  pruneSessions: (fn?: (err?: Error) => void) => void;
};

export type SessionPruneSchedulerOptions = {
  registerInterval?: (callback: () => void, delayMs: number) => unknown;
  runOnStart?: boolean;
};

let schedulerStarted = false;

/**
 * Disables connect-pg-simple's ~15m timer; runs expired-session DELETE at most daily.
 * Safe to call once from auth setup when using PgSessionStore.
 */
export function startSessionPruneScheduler(
  store: SessionPruneStore,
  options?: SessionPruneSchedulerOptions,
): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const registerInterval = options?.registerInterval ?? setInterval;
  const runOnStart = options?.runOnStart !== false;

  const run = (label: string) => {
    try {
      store.pruneSessions((err) => {
        if (err) {
          console.error(`[session-prune] ${label} failed:`, err);
          return;
        }
        console.log(`[session-prune] ${label}: ok`);
      });
    } catch (err) {
      console.error(`[session-prune] ${label} failed:`, err);
    }
  };

  if (runOnStart) void run("boot");
  registerInterval(() => void run("daily"), SESSION_PRUNE_INTERVAL_MS);
}

/** Test-only: reset module idempotency flag between cases. */
export function __resetSessionPruneSchedulerForTests(): void {
  schedulerStarted = false;
}
