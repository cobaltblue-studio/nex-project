import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Check that .env is present and loaded before importing server/db.ts.",
  );
}

function normalizeDatabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/^"(.*)"$/, "$1");

  try {
    const url = new URL(trimmed);
    if (!url.password) return trimmed;

    // Accept both raw and already-encoded password inputs safely.
    let encodedPassword: string;
    try {
      encodedPassword = encodeURIComponent(decodeURIComponent(url.password));
    } catch {
      encodedPassword = encodeURIComponent(url.password);
    }

    url.password = encodedPassword;
    return url.toString();
  } catch {
    return trimmed;
  }
}

const normalizedDatabaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

/** Fail fast on bad networks; default pg behavior can hang indefinitely on TCP connect. */
const connectionTimeoutMillis = parseInt(
  process.env.PG_CONNECTION_TIMEOUT_MS || "15000",
  10,
);

export const pool = new Pool({
  connectionString: normalizedDatabaseUrl,
  connectionTimeoutMillis: Number.isFinite(connectionTimeoutMillis)
    ? connectionTimeoutMillis
    : 15000,
  /** Helps some cloud ↔ Postgres paths; harmless otherwise. */
  keepAlive: true,
});
export const db = drizzle(pool, { schema });

let initialized = false;

/**
 * node-pg can still hang during SSL with some hosts; `connectionTimeoutMillis` is not always honored.
 * This race always settles so deploy logs show either success or a clear timeout (Neon wake can take 30–90s).
 */
export async function ensureDbConnected(): Promise<void> {
  if (initialized) return;

  const raceMs = parseInt(process.env.DB_CONNECT_TIMEOUT_MS || "90000", 10);
  const timeoutMs = Number.isFinite(raceMs) && raceMs > 0 ? raceMs : 90000;

  if (/neon\.tech/i.test(normalizedDatabaseUrl)) {
    console.log(
      `[boot] Neon URL detected — first connect after sleep can take up to ~1–2 min (timeout ${timeoutMs}ms).`,
    );
  }

  try {
    const queryPromise = pool.query("select 1");
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Timed out after ${timeoutMs}ms waiting for the database. ` +
              `Neon: open dashboard and wake the project, or use the pooled host (-pooler in hostname), ` +
              `or set DB_CONNECT_TIMEOUT_MS higher (e.g. 120000).`,
          ),
        );
      }, timeoutMs);
    });
    await Promise.race([queryPromise, timeoutPromise]);
    initialized = true;
  } catch (error: any) {
    const code = error?.code ? ` (code: ${error.code})` : "";
    const message = error?.message || "Unknown database connection error";
    throw new Error(
      `Failed to connect to database${code}: ${message}. Verify DATABASE_URL credentials and host.`,
    );
  }
}
