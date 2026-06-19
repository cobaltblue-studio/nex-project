import { analyticsEvents } from "@shared/schema";
import { db } from "./db";
import { eq, isNull, and } from "drizzle-orm";

const MAX_EVENT_NAME = 64;
const MAX_PAGE_PATH = 512;
const MAX_BATCH = 25;

export type AnalyticsEventInput = {
  eventName: string;
  pagePath?: string | null;
  properties?: Record<string, unknown> | null;
  occurredAt?: string | null;
};

function isMissingRelationError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "42P01" || code === "42703";
}

function sanitizeProperties(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.length > 64) continue;
    if (v == null) continue;
    if (typeof v === "string" && v.length > 500) {
      out[k] = v.slice(0, 500);
      continue;
    }
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") {
      out[k] = v;
    }
  }
  return out;
}

export async function mergeAnalyticsSessionToUser(sessionId: string, userId: string): Promise<void> {
  const sid = sessionId.trim();
  const uid = userId.trim();
  if (!sid || !uid) return;
  try {
    await db
      .update(analyticsEvents)
      .set({ userId: uid })
      .where(and(eq(analyticsEvents.sessionId, sid), isNull(analyticsEvents.userId)));
  } catch (err) {
    if (isMissingRelationError(err)) return;
    throw err;
  }
}

export async function recordAnalyticsEvents(
  sessionId: string,
  userId: string | null | undefined,
  events: AnalyticsEventInput[],
): Promise<{ recorded: number }> {
  const sid = sessionId.trim();
  if (!sid || events.length === 0) return { recorded: 0 };

  const batch = events.slice(0, MAX_BATCH);
  const uid = userId?.trim() || null;
  let recorded = 0;

  try {
    for (const e of batch) {
      const name = String(e.eventName ?? "").trim().slice(0, MAX_EVENT_NAME);
      if (!name) continue;
      await db.insert(analyticsEvents).values({
        eventName: name,
        sessionId: sid,
        userId: uid ?? undefined,
        pagePath: e.pagePath?.trim().slice(0, MAX_PAGE_PATH) || null,
        properties: sanitizeProperties(e.properties),
        occurredAt: e.occurredAt ? new Date(e.occurredAt) : new Date(),
      });
      recorded += 1;
    }
    if (uid) {
      await mergeAnalyticsSessionToUser(sid, uid);
    }
  } catch (err) {
    if (isMissingRelationError(err)) return { recorded: 0 };
    throw err;
  }

  return { recorded };
}

export async function recordServerAnalyticsEvent(
  opts: AnalyticsEventInput & { sessionId?: string | null; userId?: string | null },
): Promise<void> {
  const sid = opts.sessionId?.trim() || `server-${opts.userId || "anon"}`;
  await recordAnalyticsEvents(sid, opts.userId, [opts]);
}
