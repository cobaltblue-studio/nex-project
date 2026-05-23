/**
 * Promote battle-qualified tracks to CHART (official TOP 100 pool).
 * Run once against production:
 *   DATABASE_URL="postgresql://..." npm run db:reconcile-chart
 */
import "dotenv/config";
import { storage } from "../server/storage";

async function main() {
  const n = await storage.reconcileChartPromotions();
  console.log(`Promoted ${n} track(s) to CHART status.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
