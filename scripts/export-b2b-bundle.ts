/**
 * Export all B2B CSVs + data dictionary to ./exports/b2b-{date}/ and optionally POST to webhook.
 *
 * Usage:
 *   DATABASE_URL=... tsx scripts/export-b2b-bundle.ts
 *   B2B_EXPORT_WEBHOOK_URL=https://... tsx scripts/export-b2b-bundle.ts
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { storage } from "../server/storage";
import {
  b2bAiInsightsCsv,
  b2bBattleVotesCsv,
  b2bBattlesCsv,
  b2bCatalogCsv,
  b2bDailyPlatformSnapshotsCsv,
  b2bDailyTrackSnapshotsCsv,
  b2bPlaysCsv,
} from "../server/b2bExport";
import { NEX_DATA_DICTIONARY } from "../server/dataDictionary";

const stamp = new Date().toISOString().slice(0, 10);
const outDir = join(process.cwd(), "exports", `b2b-${stamp}`);
mkdirSync(outDir, { recursive: true });

await storage.captureDailySnapshots();

const [plays, battles, battleVotes, catalog, aiInsights, dailyTracks, dailyPlatform] = await Promise.all([
  storage.getB2bPlayExportRows(),
  storage.getB2bBattleExportRows(),
  storage.getB2bBattleVoteExportRows(),
  storage.getB2bCatalogExportRows(),
  storage.getB2bAiInsightExportRows(),
  storage.getB2bDailyTrackSnapshotExportRows(),
  storage.getB2bDailyPlatformSnapshotExportRows(),
]);

const files: Record<string, string> = {
  "plays.csv": b2bPlaysCsv(plays),
  "battles.csv": b2bBattlesCsv(battles),
  "battle-votes.csv": b2bBattleVotesCsv(battleVotes),
  "catalog.csv": b2bCatalogCsv(catalog),
  "ai-insights.csv": b2bAiInsightsCsv(aiInsights),
  "daily-track-snapshots.csv": b2bDailyTrackSnapshotsCsv(dailyTracks),
  "daily-platform-snapshots.csv": b2bDailyPlatformSnapshotsCsv(dailyPlatform),
  "data-dictionary.json": JSON.stringify({ ...NEX_DATA_DICTIONARY, generatedAt: new Date().toISOString() }, null, 2),
};

for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(outDir, name), content, "utf8");
}

console.log(`Wrote ${Object.keys(files).length} files to ${outDir}`);

const webhook = process.env.B2B_EXPORT_WEBHOOK_URL?.trim();
if (webhook) {
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "nex-b2b-bundle",
      date: stamp,
      directory: outDir,
      counts: {
        plays: plays.length,
        battles: battles.length,
        battleVotes: battleVotes.length,
        catalog: catalog.length,
        aiInsights: aiInsights.length,
        dailyTracks: dailyTracks.length,
        dailyPlatform: dailyPlatform.length,
      },
      files: Object.keys(files),
    }),
  });
  console.log(`Webhook ${webhook}: ${res.status}`);
}
