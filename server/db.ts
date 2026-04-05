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

export const pool = new Pool({ connectionString: normalizedDatabaseUrl });
export const db = drizzle(pool, { schema });

let initialized = false;

export async function ensureDbConnected(): Promise<void> {
  if (initialized) return;

  try {
    await pool.query("select 1");
    initialized = true;
  } catch (error: any) {
    const code = error?.code ? ` (code: ${error.code})` : "";
    const message = error?.message || "Unknown database connection error";
    throw new Error(
      `Failed to connect to database${code}: ${message}. Verify DATABASE_URL credentials and host.`,
    );
  }
}
