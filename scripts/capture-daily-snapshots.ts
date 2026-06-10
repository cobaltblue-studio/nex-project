/**
 * Manual daily snapshot capture (same logic as server scheduler).
 * Usage: DATABASE_URL=... tsx scripts/capture-daily-snapshots.ts
 */
import "dotenv/config";
import { storage } from "../server/storage";

const out = await storage.captureDailySnapshots();
console.log(JSON.stringify(out, null, 2));
