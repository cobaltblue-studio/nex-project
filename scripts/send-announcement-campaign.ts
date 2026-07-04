import "dotenv/config";
import { sendAnnouncementCampaign } from "../server/announcementCampaigns";

function readArg(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

async function main() {
  const campaign = readArg("campaign") || "community-launch";
  const dryRun = process.argv.includes("--dry-run");
  const limitRaw = readArg("limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const result = await sendAnnouncementCampaign(campaign, {
    dryRun,
    limit: Number.isFinite(limit) && (limit as number) > 0 ? Math.floor(limit as number) : undefined,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
