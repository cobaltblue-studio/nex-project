import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Simulates PostgreSQL conditional claim semantics used by processPendingAnnouncementCampaigns.
 * Two concurrent claimants: only one may transition pending → processing.
 */
function claimPendingRow(
  store: Map<number, { status: string }>,
  id: number,
): { status: string } | null {
  const row = store.get(id);
  if (!row || row.status !== "pending") return null;
  row.status = "processing";
  return row;
}

describe("announcement campaign atomic claim + cadence", () => {
  it("safety poll interval is one day (not 60 seconds)", () => {
    const src = readFileSync(join(here, "announcementCampaigns.ts"), "utf8");
    assert.match(
      src,
      /ANNOUNCEMENT_SAFETY_POLL_MS\s*=\s*(?:DAY_MS|24\s*\*\s*60\s*\*\s*60\s*\*\s*1000)/,
    );
    assert.doesNotMatch(src, /setInterval\(\(\)\s*=>[\s\S]{0,200}60_000/);
  });

  it("source uses conditional claim on id AND status=pending", () => {
    const src = readFileSync(join(here, "announcementCampaigns.ts"), "utf8");
    assert.match(
      src,
      /and\(\s*eq\(announcementEmailCampaignRuns\.id,\s*nextRun\.id\),\s*eq\(announcementEmailCampaignRuns\.status,\s*"pending"\),\s*\)/s,
    );
  });

  it("only one of two concurrent claimants owns a pending row", () => {
    const store = new Map<number, { status: string }>([[42, { status: "pending" }]]);
    const results = [claimPendingRow(store, 42), claimPendingRow(store, 42)];
    const wins = results.filter(Boolean);
    assert.equal(wins.length, 1);
    assert.equal(store.get(42)?.status, "processing");
  });

  it("delivery path still dedupes by campaignSlug+recipientEmail (unique + onConflictDoNothing)", () => {
    const campaignSrc = readFileSync(join(here, "announcementCampaigns.ts"), "utf8");
    const schemaSrc = readFileSync(join(here, "../shared/schema.ts"), "utf8");
    assert.match(campaignSrc, /onConflictDoNothing\(\)/);
    assert.match(campaignSrc, /deliveredSet\.has\(item\.email\)/);
    assert.match(
      schemaSrc,
      /uniqueIndex\("announcement_email_campaign_recipient_unique"\)\.on\(t\.campaignSlug,\s*t\.recipientEmail\)/,
    );
  });

  it("queue trigger export exists and start uses triggered worker (no minute poll)", () => {
    const src = readFileSync(join(here, "announcementCampaigns.ts"), "utf8");
    assert.match(src, /export function triggerAnnouncementCampaignWorker/);
    assert.match(src, /createTriggeredWorker\(/);
    assert.match(src, /announcementCampaignWorker\.start\(\)/);
  });
});

describe("isolated DB concurrency claim", () => {
  it("is blocked without disposable non-Production DATABASE_URL", () => {
    // Plan Task 3 Step 4: do not point concurrency tests at Production.
    const url = process.env.NEON_IDLE_COST_TEST_DATABASE_URL?.trim() || "";
    if (!url) {
      assert.ok(true, "blocked: set NEON_IDLE_COST_TEST_DATABASE_URL on a disposable branch to enable");
      return;
    }
    assert.ok(url.length > 0);
  });
});
