/**
 * Disposable-Neon-only concurrency test for announcement campaign atomic claim.
 *
 * REQUIRED (local file, gitignored):
 *   .env.neon-idle-cost-test.local
 *   NEON_IDLE_COST_TEST_DATABASE_URL=<disposable Neon branch connection string>
 *
 * SAFETY:
 *   Refuses to run if the URL host matches Production DATABASE_URL from .env
 *   Never sends email; uses dry_run rows and delivery unique-index only
 *   Does not modify Production DATABASE_URL
 *
 * Usage:
 *   npm run test:atomic-claim
 */
import dotenv from "dotenv";
import pg from "pg";

dotenv.config(); // Production .env — used only to compare hosts (do not change)
dotenv.config({ path: ".env.neon-idle-cost-test.local", override: true });

const { Client } = pg;

type ClaimResult = { id: number; status: string } | null;

function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

function assertDisposableUrl(testUrl: string, productionUrl: string | undefined): void {
  if (!testUrl.trim()) {
    throw new Error("NEON_IDLE_COST_TEST_DATABASE_URL is required (disposable Neon branch only).");
  }
  const testHost = hostOf(testUrl);
  if (!/neon\.tech$/i.test(testHost)) {
    throw new Error(`Refusing non-Neon host: ${testHost}`);
  }
  if (productionUrl?.trim()) {
    const prodHost = hostOf(productionUrl);
    if (testHost === prodHost) {
      throw new Error(
        `SAFETY ABORT: test URL host matches Production DATABASE_URL host (${prodHost}). Use a disposable Neon branch.`,
      );
    }
    // Also reject if same endpoint id prefix (ep-xxx) even if pooler vs direct differs
    const prodEp = prodHost.split(".")[0]?.replace(/-pooler$/i, "");
    const testEp = testHost.split(".")[0]?.replace(/-pooler$/i, "");
    if (prodEp && testEp && prodEp === testEp) {
      throw new Error(
        `SAFETY ABORT: test endpoint '${testEp}' matches Production endpoint. Create a separate Neon branch.`,
      );
    }
  }
  if (!/idle-cost|atomic-claim|test|dev|branch/i.test(testUrl) && !process.env.NEON_IDLE_COST_TEST_ALLOW_UNLABELED) {
    console.warn(
      "[warn] Test URL does not contain idle-cost/test/dev/branch in the string. Continuing because host ≠ production.",
    );
  }
}

async function claimOnce(client: pg.Client, runId: number): Promise<ClaimResult> {
  const res = await client.query<{ id: number; status: string }>(
    `UPDATE announcement_email_campaign_runs
     SET status = 'processing', started_at = NOW(), completed_at = NULL, error = NULL
     WHERE id = $1 AND status = 'pending'
     RETURNING id, status`,
    [runId],
  );
  return res.rows[0] ?? null;
}

async function main(): Promise<void> {
  const testUrl = process.env.NEON_IDLE_COST_TEST_DATABASE_URL || "";
  const productionUrl = process.env.DATABASE_URL;
  assertDisposableUrl(testUrl, productionUrl);

  const clientA = new Client({ connectionString: testUrl, connectionTimeoutMillis: 30_000 });
  const clientB = new Client({ connectionString: testUrl, connectionTimeoutMillis: 30_000 });
  const setup = new Client({ connectionString: testUrl, connectionTimeoutMillis: 30_000 });

  const slug = `atomic-claim-test-${Date.now()}`;
  let runId = 0;

  try {
    await setup.connect();
    await clientA.connect();
    await clientB.connect();

    // Ensure tables exist (branch should be forked from schema); create minimal if missing for isolated branch
    await setup.query(`
      CREATE TABLE IF NOT EXISTS announcement_email_campaign_runs (
        id serial PRIMARY KEY,
        campaign_slug text NOT NULL,
        dry_run boolean DEFAULT false NOT NULL,
        "limit" integer,
        requested_by text,
        status text DEFAULT 'pending' NOT NULL,
        summary jsonb,
        error text,
        requested_at timestamptz DEFAULT NOW() NOT NULL,
        started_at timestamptz,
        completed_at timestamptz
      );
    `);
    await setup.query(`
      CREATE TABLE IF NOT EXISTS announcement_email_deliveries (
        id serial PRIMARY KEY,
        campaign_slug text NOT NULL,
        recipient_user_id varchar,
        recipient_email text NOT NULL,
        recipient_kind text NOT NULL,
        sent_at timestamptz DEFAULT NOW() NOT NULL
      );
    `);
    await setup.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS announcement_email_campaign_recipient_unique
        ON announcement_email_deliveries (campaign_slug, recipient_email);
    `);

    const inserted = await setup.query<{ id: number }>(
      `INSERT INTO announcement_email_campaign_runs
        (campaign_slug, dry_run, status, requested_by, summary)
       VALUES ($1, true, 'pending', 'atomic-claim-test', $2::jsonb)
       RETURNING id`,
      [slug, JSON.stringify({ purpose: "concurrency-only", noEmail: true })],
    );
    runId = inserted.rows[0].id;

    // Barrier: both claims fire as concurrently as possible
    const [a, b] = await Promise.all([claimOnce(clientA, runId), claimOnce(clientB, runId)]);
    const winners = [a, b].filter(Boolean);
    const losers = [a, b].filter((r) => r == null);

    if (winners.length !== 1) {
      throw new Error(`FAIL atomic claim: expected 1 winner, got ${winners.length} (a=${JSON.stringify(a)} b=${JSON.stringify(b)})`);
    }
    if (losers.length !== 1) {
      throw new Error(`FAIL atomic claim: expected 1 loser (null), got ${losers.length}`);
    }

    const row = await setup.query<{ status: string; campaign_slug: string }>(
      `SELECT status, campaign_slug FROM announcement_email_campaign_runs WHERE id = $1`,
      [runId],
    );
    if (row.rows[0]?.status !== "processing") {
      throw new Error(`FAIL: row status is ${row.rows[0]?.status}, expected processing`);
    }

    // Duplicate delivery prevention (unique index + onConflictDoNothing semantics)
    const email = `atomic-claim-dup-${Date.now()}@example.invalid`;
    await setup.query(
      `INSERT INTO announcement_email_deliveries (campaign_slug, recipient_email, recipient_kind)
       VALUES ($1, $2, 'visitor')`,
      [slug, email],
    );
    let dupBlocked = false;
    try {
      await setup.query(
        `INSERT INTO announcement_email_deliveries (campaign_slug, recipient_email, recipient_kind)
         VALUES ($1, $2, 'visitor')`,
        [slug, email],
      );
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") dupBlocked = true;
      else throw err;
    }
    if (!dupBlocked) {
      throw new Error("FAIL: duplicate delivery insert was not rejected by unique index");
    }

    // onConflictDoNothing equivalent
    const conflict = await setup.query(
      `INSERT INTO announcement_email_deliveries (campaign_slug, recipient_email, recipient_kind)
       VALUES ($1, $2, 'visitor')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [slug, email],
    );
    if (conflict.rows.length !== 0) {
      throw new Error("FAIL: ON CONFLICT DO NOTHING returned a row for duplicate email");
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          runId,
          campaignSlug: slug,
          winners: winners.length,
          losers: losers.length,
          finalStatus: row.rows[0].status,
          duplicateDeliveryBlocked: true,
          onConflictDoNothing: true,
          testHost: hostOf(testUrl).replace(/^[^.]+\./, "*.") /* redact endpoint id partially */,
          note: "No email sent. Disposable branch only.",
        },
        null,
        2,
      ),
    );
  } finally {
    // Cleanup test rows on disposable branch only
    try {
      if (runId) {
        await setup.query(`DELETE FROM announcement_email_deliveries WHERE campaign_slug = $1`, [slug]);
        await setup.query(`DELETE FROM announcement_email_campaign_runs WHERE id = $1`, [runId]);
      }
    } catch {
      /* ignore cleanup errors */
    }
    await Promise.allSettled([setup.end(), clientA.end(), clientB.end()]);
  }
}

main().catch((err) => {
  console.error("[atomic-claim-test] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
