import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, beforeEach } from "node:test";
import { DAY_MS } from "./dailySnapshot";
import {
  SESSION_PRUNE_INTERVAL_MS,
  startSessionPruneScheduler,
  __resetSessionPruneSchedulerForTests,
} from "./sessionPrune";

const here = dirname(fileURLToPath(import.meta.url));

describe("neon idle cost P0+P1 cadence", () => {
  beforeEach(() => {
    __resetSessionPruneSchedulerForTests();
  });

  it("session prune interval is one day (not ~15 minutes)", () => {
    assert.equal(SESSION_PRUNE_INTERVAL_MS, DAY_MS);
    assert.equal(SESSION_PRUNE_INTERVAL_MS, 24 * 60 * 60 * 1000);
  });

  it("auth disables connect-pg-simple default prune timer", () => {
    const src = readFileSync(join(here, "auth.ts"), "utf8");
    assert.match(src, /pruneSessionInterval:\s*false/);
    assert.match(src, /startSessionPruneScheduler/);
  });

  it("session prune scheduler runs once at start then daily", async () => {
    const delays: number[] = [];
    let pruneCalls = 0;
    const store = {
      pruneSessions: (fn?: (err?: Error) => void) => {
        pruneCalls += 1;
        fn?.();
      },
    };
    startSessionPruneScheduler(store, {
      registerInterval: (cb, ms) => {
        delays.push(ms);
        return null;
      },
    });
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(pruneCalls, 1);
    assert.deepEqual(delays, [SESSION_PRUNE_INTERVAL_MS]);
  });

  it("announcement safety poll is one day (not six hours)", () => {
    const src = readFileSync(join(here, "announcementCampaigns.ts"), "utf8");
    assert.match(
      src,
      /ANNOUNCEMENT_SAFETY_POLL_MS\s*=\s*(?:DAY_MS|24\s*\*\s*60\s*\*\s*60\s*\*\s*1000)/,
    );
    assert.doesNotMatch(
      src,
      /ANNOUNCEMENT_SAFETY_POLL_MS\s*=\s*6\s*\*\s*60\s*\*\s*60\s*\*\s*1000/,
    );
  });

  it("playback audit interval is one day (not six hours)", () => {
    const src = readFileSync(join(here, "playbackAudit.ts"), "utf8");
    assert.match(
      src,
      /AUDIT_INTERVAL_MS\s*=\s*(?:DAY_MS|24\s*\*\s*60\s*\*\s*60\s*\*\s*1000)/,
    );
    assert.doesNotMatch(src, /AUDIT_INTERVAL_MS\s*=\s*6\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  });
});
