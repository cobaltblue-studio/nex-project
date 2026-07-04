/**
 * Local / CI check: DB tables + optional Resend probe.
 * Usage: DATABASE_URL=... [RESEND_API_KEY=...] npm run check:email
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { emailFromPreview, isEmailEnabled, isSandboxEmailFrom, probeResendApiKey, sendTestEmail } from "../server/email";

const tables = [
  "notifications",
  "battle_win_emails",
  "creator_engagement_emails",
  "announcement_email_deliveries",
  "announcement_email_campaign_runs",
] as const;

async function main() {
  console.log("NEX email readiness\n");

  for (const t of tables) {
    const r = await db.execute(sql.raw(`SELECT to_regclass('public.${t}') AS exists`));
    const ok = Boolean((r.rows[0] as { exists?: string | null })?.exists);
    console.log(`${ok ? "OK" : "MISSING"}  table ${t}`);
  }

  console.log(`\nRESEND_API_KEY: ${isEmailEnabled() ? "set" : "NOT SET"}`);
  console.log(`NEX_EMAIL_FROM: ${process.env.NEX_EMAIL_FROM?.trim() || "(default onboarding@resend.dev)"}`);
  console.log(`from preview: ${emailFromPreview()}`);
  console.log(`sender mode: ${isSandboxEmailFrom() ? "SANDBOX (external recipients blocked)" : "custom/verified sender"}`);

  if (!isEmailEnabled()) {
    console.log("\nSet RESEND_API_KEY on Railway, then redeploy.");
    process.exit(1);
  }

  const probe = await probeResendApiKey();
  console.log(`\nResend API probe: ${probe.ok ? `OK (${probe.domains} domain(s))` : probe.reason}`);
  if (!probe.ok && probe.detail) console.log(`  detail: ${probe.detail}`);

  const testTo = process.env.EMAIL_TEST_TO?.trim();
  if (testTo) {
    const result = await sendTestEmail(testTo);
    console.log(`\nTest send to ${testTo}: ${result.sent ? "sent" : result.reason}`);
    if (!result.sent && result.detail) console.log(`  detail: ${result.detail}`);
    process.exit(result.sent ? 0 : 1);
  }

  process.exit(probe.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
