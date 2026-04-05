/**
 * Full-track data audit: metadata completeness + URL reachability.
 * Run: npm run audit:tracks
 * Requires DATABASE_URL and network for HTTP checks.
 */
import "dotenv/config";
import { asc, eq } from "drizzle-orm";
import { db } from "../server/db";
import { tracks } from "../shared/schema";

const FETCH_TIMEOUT_MS = 8_000;
const URL_CHECK_CONCURRENCY = 12;

type Issue = { trackId: number; title: string; kind: string; detail: string };

async function checkHttpUrl(url: string): Promise<{ ok: boolean; status?: number; note?: string }> {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, note: "not http(s)" };
    }
  } catch {
    return { ok: false, note: "invalid URL" };
  }

  const run = async (method: "HEAD" | "GET"): Promise<number> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const init: RequestInit = {
        method,
        signal: ctrl.signal,
        redirect: "follow",
        headers: method === "GET" ? { Range: "bytes=0-0" } : undefined,
      };
      const res = await fetch(url, init);
      return res.status;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let status = await run("HEAD");
    if (status === 405 || status === 403 || status === 501) {
      status = await run("GET");
    }
    if (status >= 400 && status !== 403) {
      return { ok: false, status, note: `HTTP ${status}` };
    }
    if (status === 403) {
      return { ok: true, status, note: "reachable (403 — verify manually)" };
    }
    return { ok: true, status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, note: msg.includes("abort") ? "timeout" : msg };
  }
}

async function runPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function main() {
  const rows = await db
    .select()
    .from(tracks)
    .where(eq(tracks.isDeleted, false))
    .orderBy(asc(tracks.id));

  const metaIssues: Issue[] = [];

  type UrlJob = { trackId: number; title: string; kind: string; url: string };
  const urlJobs: UrlJob[] = [];

  for (const t of rows) {
    const title = (t.title ?? "").trim() || "(no title)";
    if (!t.title?.trim()) {
      metaIssues.push({ trackId: t.id, title, kind: "metadata", detail: "missing title" });
    }
    if (!t.artistName?.trim()) {
      metaIssues.push({ trackId: t.id, title, kind: "metadata", detail: "missing artistName" });
    }
    if (!t.genre?.trim()) {
      metaIssues.push({ trackId: t.id, title, kind: "metadata", detail: "missing genre" });
    }
    if (!t.audioUrl?.trim()) {
      metaIssues.push({ trackId: t.id, title, kind: "metadata", detail: "missing audioUrl (primary link)" });
    }
    if (!t.aiTool?.trim()) {
      metaIssues.push({ trackId: t.id, title, kind: "metadata", detail: "missing aiTool" });
    }

    if (t.audioUrl?.trim()) {
      urlJobs.push({ trackId: t.id, title, kind: "audioUrl", url: t.audioUrl.trim() });
    }
    if (t.coverImageUrl?.trim()) {
      urlJobs.push({ trackId: t.id, title, kind: "coverImageUrl", url: t.coverImageUrl.trim() });
    }
    if (t.mvUrl?.trim() && t.trackType === "video") {
      urlJobs.push({ trackId: t.id, title, kind: "mvUrl", url: t.mvUrl.trim() });
    }
  }

  const urlResults = await runPool(urlJobs, URL_CHECK_CONCURRENCY, async (job) => {
    const r = await checkHttpUrl(job.url);
    return { job, r };
  });

  const urlIssues: Issue[] = [];
  for (const { job, r } of urlResults) {
    if (!r.ok) {
      urlIssues.push({
        trackId: job.trackId,
        title: job.title,
        kind: job.kind,
        detail: r.note || `HTTP ${r.status}`,
      });
    }
  }

  console.log("=== NEX track data audit ===");
  console.log(`Active (non-deleted) tracks: ${rows.length}`);
  console.log(`Metadata issues: ${metaIssues.length}`);
  console.log(`URL issues (non-2xx/3xx or network): ${urlIssues.length}`);

  const all = [...metaIssues, ...urlIssues];
  if (all.length === 0) {
    console.log("\n데이터 무결성 확인 완료 / Data integrity check passed: no issues reported by this audit.");
    return;
  }

  console.log("\n--- Issues ---");
  for (const i of all) {
    console.log(`#${i.trackId} | ${i.title} | ${i.kind}: ${i.detail}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
