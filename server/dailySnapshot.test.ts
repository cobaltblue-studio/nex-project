import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  DAY_MS,
  startDailySnapshotScheduler,
  __resetDailySnapshotSchedulerForTests,
} from "./dailySnapshot";
import type { IStorage } from "./storage";

function fakeStorage(capture: () => Promise<{ snapshotDate: string; trackRows: number; platformCaptured: boolean }>): IStorage {
  return {
    captureDailySnapshots: capture,
  } as unknown as IStorage;
}

describe("startDailySnapshotScheduler", () => {
  beforeEach(() => {
    __resetDailySnapshotSchedulerForTests();
  });

  it("first start invokes captureDailySnapshots once for boot", async () => {
    const labels: string[] = [];
    let resolveBoot!: () => void;
    const bootDone = new Promise<void>((r) => {
      resolveBoot = r;
    });
    startDailySnapshotScheduler(
      fakeStorage(async () => {
        labels.push("boot");
        resolveBoot();
        return { snapshotDate: "2026-08-09", trackRows: 0, platformCaptured: false };
      }),
      { registerInterval: () => undefined },
    );
    await bootDone;
    assert.deepEqual(labels, ["boot"]);
  });

  it("registers exactly 24 hours", () => {
    const delays: number[] = [];
    startDailySnapshotScheduler(fakeStorage(async () => ({ snapshotDate: "x", trackRows: 0, platformCaptured: false })), {
      registerInterval: (_cb, delayMs) => {
        delays.push(delayMs);
        return undefined;
      },
    });
    assert.deepEqual(delays, [DAY_MS]);
    assert.equal(DAY_MS, 24 * 60 * 60 * 1000);
  });

  it("invoking the captured callback performs the daily run", async () => {
    const calls: string[] = [];
    let dailyCb: (() => void) | null = null;
    let resolveDaily!: () => void;
    const dailyDone = new Promise<void>((r) => {
      resolveDaily = r;
    });

    startDailySnapshotScheduler(
      fakeStorage(async () => {
        const label = calls.length === 0 ? "boot" : "daily";
        calls.push(label);
        if (label === "daily") resolveDaily();
        return { snapshotDate: "x", trackRows: 0, platformCaptured: false };
      }),
      {
        registerInterval: (cb) => {
          dailyCb = cb;
          return undefined;
        },
      },
    );

    await new Promise((r) => setTimeout(r, 10));
    assert.ok(dailyCb);
    dailyCb!();
    await dailyDone;
    assert.deepEqual(calls, ["boot", "daily"]);
  });

  it("calling the starter twice registers only one interval", () => {
    const delays: number[] = [];
    const storage = fakeStorage(async () => ({ snapshotDate: "x", trackRows: 0, platformCaptured: false }));
    const opts = {
      registerInterval: (_cb: () => void, delayMs: number) => {
        delays.push(delayMs);
        return undefined;
      },
    };
    startDailySnapshotScheduler(storage, opts);
    startDailySnapshotScheduler(storage, opts);
    assert.equal(delays.length, 1);
  });

  it("snapshot errors are caught rather than becoming unhandled rejections", async () => {
    let unhandled = 0;
    const onUnhandled = () => {
      unhandled += 1;
    };
    process.on("unhandledRejection", onUnhandled);
    try {
      startDailySnapshotScheduler(
        fakeStorage(async () => {
          throw new Error("snapshot boom");
        }),
        { registerInterval: () => undefined },
      );
      await new Promise((r) => setTimeout(r, 30));
      assert.equal(unhandled, 0);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
