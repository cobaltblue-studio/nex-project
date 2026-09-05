export type TriggeredWorkerOptions = {
  run: () => Promise<void>;
  safetyIntervalMs: number;
  registerInterval?: (callback: () => void, delayMs: number) => unknown;
  onError?: (error: unknown, reason: string) => void;
};

export type TriggeredWorker = {
  start: () => void;
  trigger: (reason: string) => void;
};

/**
 * Same-process coordinator: boot + safety interval + coalesced immediate triggers.
 * Cross-replica ownership must still be enforced in `run` (e.g. atomic DB claim).
 */
export function createTriggeredWorker(options: TriggeredWorkerOptions): TriggeredWorker {
  const registerInterval = options.registerInterval ?? setInterval;
  let running = false;
  let rerunRequested = false;
  let started = false;

  const execute = (reason: string): void => {
    if (running) {
      rerunRequested = true;
      return;
    }
    running = true;
    void (async () => {
      try {
        do {
          rerunRequested = false;
          try {
            await options.run();
          } catch (error) {
            options.onError?.(error, reason);
          }
        } while (rerunRequested);
      } finally {
        running = false;
      }
    })();
  };

  return {
    start: () => {
      if (started) return;
      started = true;
      execute("boot");
      registerInterval(() => execute("safety"), options.safetyIntervalMs);
    },
    trigger: (reason: string) => {
      execute(reason || "queue");
    },
  };
}
