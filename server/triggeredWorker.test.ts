import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTriggeredWorker } from "./triggeredWorker";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createTriggeredWorker", () => {
  it("start() invokes one boot run immediately", async () => {
    const runs: string[] = [];
    const done = deferred();
    const worker = createTriggeredWorker({
      safetyIntervalMs: 6 * 60 * 60 * 1000,
      registerInterval: () => undefined,
      run: async () => {
        runs.push("boot");
        done.resolve();
      },
    });
    worker.start();
    await done.promise;
    assert.deepEqual(runs, ["boot"]);
  });

  it("start() registers exactly one interval at six hours", () => {
    const intervals: number[] = [];
    createTriggeredWorker({
      safetyIntervalMs: 6 * 60 * 60 * 1000,
      registerInterval: (_cb, delayMs) => {
        intervals.push(delayMs);
        return undefined;
      },
      run: async () => {},
    }).start();
    assert.deepEqual(intervals, [6 * 60 * 60 * 1000]);
  });

  it("trigger(queue) starts without waiting for the interval", async () => {
    const runs: string[] = [];
    let resolveRun!: () => void;
    const runGate = new Promise<void>((r) => {
      resolveRun = r;
    });
    const worker = createTriggeredWorker({
      safetyIntervalMs: 6 * 60 * 60 * 1000,
      registerInterval: () => undefined,
      run: async () => {
        runs.push("run");
        resolveRun();
      },
    });
    // Do not call start(); only queue trigger.
    worker.trigger("queue");
    await runGate;
    assert.equal(runs.length, 1);
  });

  it("two triggers during one unresolved run never execute concurrently", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const first = deferred();
    let resolveFirst!: () => void;
    const firstGate = new Promise<void>((r) => {
      resolveFirst = r;
    });
    let runCount = 0;

    const worker = createTriggeredWorker({
      safetyIntervalMs: 6 * 60 * 60 * 1000,
      registerInterval: () => undefined,
      run: async () => {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        runCount += 1;
        if (runCount === 1) {
          first.resolve();
          await firstGate;
        }
        concurrent -= 1;
      },
    });

    worker.trigger("a");
    await first.promise;
    worker.trigger("b");
    worker.trigger("c");
    resolveFirst();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(maxConcurrent, 1);
  });

  it("a trigger during an unresolved run causes exactly one follow-up run", async () => {
    const runs: number[] = [];
    let resolveFirst!: () => void;
    const firstGate = new Promise<void>((r) => {
      resolveFirst = r;
    });
    const firstStarted = deferred();
    const allDone = deferred();

    const worker = createTriggeredWorker({
      safetyIntervalMs: 6 * 60 * 60 * 1000,
      registerInterval: () => undefined,
      run: async () => {
        runs.push(runs.length + 1);
        if (runs.length === 1) {
          firstStarted.resolve();
          await firstGate;
        }
        if (runs.length === 2) allDone.resolve();
      },
    });

    worker.trigger("first");
    await firstStarted.promise;
    worker.trigger("during");
    resolveFirst();
    await allDone.promise;
    assert.deepEqual(runs, [1, 2]);
  });

  it("multiple overlapping triggers coalesce into one follow-up run", async () => {
    const runs: number[] = [];
    let resolveFirst!: () => void;
    const firstGate = new Promise<void>((r) => {
      resolveFirst = r;
    });
    const firstStarted = deferred();
    const settled = deferred();

    const worker = createTriggeredWorker({
      safetyIntervalMs: 6 * 60 * 60 * 1000,
      registerInterval: () => undefined,
      run: async () => {
        runs.push(Date.now());
        if (runs.length === 1) {
          firstStarted.resolve();
          await firstGate;
        }
      },
    });

    worker.trigger("1");
    await firstStarted.promise;
    worker.trigger("2");
    worker.trigger("3");
    worker.trigger("4");
    resolveFirst();
    await new Promise((r) => setTimeout(r, 30));
    settled.resolve();
    await settled.promise;
    assert.equal(runs.length, 2);
  });

  it("a rejected run is reported and does not permanently lock the coordinator", async () => {
    const errors: string[] = [];
    let attempt = 0;
    const secondDone = deferred();

    const worker = createTriggeredWorker({
      safetyIntervalMs: 6 * 60 * 60 * 1000,
      registerInterval: () => undefined,
      onError: (_error, reason) => {
        errors.push(reason);
      },
      run: async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("boom");
        secondDone.resolve();
      },
    });

    worker.trigger("fail");
    await new Promise((r) => setTimeout(r, 20));
    worker.trigger("recover");
    await secondDone.promise;
    assert.deepEqual(errors, ["fail"]);
    assert.equal(attempt, 2);
  });
});
