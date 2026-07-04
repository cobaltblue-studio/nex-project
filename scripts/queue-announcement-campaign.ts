import "dotenv/config";
import { enqueueAnnouncementCampaign } from "../server/announcementCampaigns";

function readArg(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

async function main() {
  const campaign = readArg("campaign") || "community-launch";
  const dryRun = process.argv.includes("--dry-run");
  const limitRaw = readArg("limit");
  const requestedBy = readArg("requested-by");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const job = await enqueueAnnouncementCampaign(campaign, {
    dryRun,
    limit: Number.isFinite(limit) && (limit as number) > 0 ? Math.floor(limit as number) : undefined,
    requestedBy,
  });

  console.log(JSON.stringify(job, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
