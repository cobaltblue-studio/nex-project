import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { sql } from "drizzle-orm";
import { db } from "./db";
import {
  formatCommunitySeedBody,
  formatCommunitySeedTitle,
  getCommunitySystemSeed,
  matchCommunitySystemSeedByTitle,
  pickLocalizedBilingualText,
  type CommunityCategorySlug,
} from "@shared/community";

type Lang = "ko" | "en";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_CACHE = 5_000;
const cache = new Map<string, { value: string; at: number }>();

export function containsHangul(text: string): boolean {
  return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(text);
}

function cacheGet(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key: string, value: string) {
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { value, at: Date.now() });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitForTranslate(text: string, max = 420): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= max) return [trimmed];
  const chunks: string[] = [];
  const paragraphs = trimmed.split(/\n{2,}/);
  let buf = "";
  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim());
    buf = "";
  };
  for (const para of paragraphs) {
    if ((buf + "\n\n" + para).trim().length <= max) {
      buf = buf ? `${buf}\n\n${para}` : para;
      continue;
    }
    flush();
    if (para.length <= max) {
      buf = para;
      continue;
    }
    const lines = para.split(/\n/);
    for (const line of lines) {
      if ((buf + "\n" + line).trim().length <= max) {
        buf = buf ? `${buf}\n${line}` : line;
      } else {
        flush();
        if (line.length <= max) {
          buf = line;
        } else {
          for (let i = 0; i < line.length; i += max) {
            chunks.push(line.slice(i, i + max));
          }
          buf = "";
        }
      }
    }
  }
  flush();
  return chunks.length ? chunks : [trimmed];
}

async function translateChunkGoogle(text: string): Promise<string> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ko");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "NEX-Community/1.0" },
  });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error("google bad payload");
  return (data[0] as Array<[string, ...unknown[]]>)
    .map((chunk) => chunk[0])
    .join("")
    .trim();
}

async function translateChunkMyMemory(text: string): Promise<string> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 480));
  url.searchParams.set("langpair", "ko|en");
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "NEX-Community/1.0" },
  });
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = (await res.json()) as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  if (Number(data.responseStatus) !== 200) throw new Error("mymemory status");
  const out = data.responseData?.translatedText?.trim();
  if (!out) throw new Error("mymemory empty");
  return out;
}

async function translateChunkOpenAi(text: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATE_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "Translate Korean community posts on the NEX music platform into clear natural English. Keep brand name NEX. Preserve line breaks. Return only the translation text.",
          },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const out = data.choices?.[0]?.message?.content?.trim();
    return out || null;
  } catch {
    return null;
  }
}

/** Reliable KO→EN. Retries Google, chunks long text, falls back to OpenAI. */
export async function translateTextKoToEnReliable(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (!containsHangul(trimmed)) return trimmed;

  const cached = cacheGet(`t:${trimmed}`);
  if (cached != null) return cached;

  const parts = splitForTranslate(trimmed);
  const outParts: string[] = [];
  for (const part of parts) {
    if (!containsHangul(part)) {
      outParts.push(part);
      continue;
    }
    let translated: string | null = null;
    // Prefer MyMemory first — Google free endpoint is frequently 429 from cloud IPs.
    for (let attempt = 0; attempt < 3 && !translated; attempt += 1) {
      try {
        translated = await translateChunkMyMemory(part);
        if (translated && containsHangul(translated)) translated = null;
      } catch {
        translated = null;
      }
      if (!translated) await sleep(300 * (attempt + 1));
    }
    if (!translated) {
      try {
        translated = await translateChunkGoogle(part);
        if (translated && containsHangul(translated)) translated = null;
      } catch {
        translated = null;
      }
    }
    if (!translated) {
      translated = await translateChunkOpenAi(part);
    }
    outParts.push(translated?.trim() || part);
  }

  const out = outParts.join("\n\n").trim() || trimmed;
  cacheSet(`t:${trimmed}`, out);
  return out;
}

export function parseCommunityLang(raw: unknown): Lang {
  if (typeof raw !== "string") return "ko";
  const v = raw.trim().toLowerCase();
  if (v.startsWith("en")) return "en";
  return "ko";
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

type PostLike = {
  id?: number;
  title: string;
  body: string;
  titleEn?: string | null;
  bodyEn?: string | null;
  authorUserId?: string | null;
  category?: string | null;
};

type PersistPostEn = (postId: number, titleEn: string, bodyEn: string) => Promise<void>;
type PersistCommentEn = (commentId: number, contentEn: string) => Promise<void>;

let persistPostEn: PersistPostEn | null = null;
let persistCommentEn: PersistCommentEn | null = null;

export function setCommunityEnPersisters(opts: {
  savePostEn: PersistPostEn;
  saveCommentEn: PersistCommentEn;
}) {
  persistPostEn = opts.savePostEn;
  persistCommentEn = opts.saveCommentEn;
}

export async function localizeCommunityPostFields<T extends PostLike>(post: T, lang: Lang): Promise<T> {
  if (lang === "ko") return post;

  const category = (post.category ?? "") as CommunityCategorySlug;
  const seed =
    getCommunitySystemSeed(category, post.authorUserId) ?? matchCommunitySystemSeedByTitle(post.title);

  if (seed) {
    const title = formatCommunitySeedTitle(seed, false);
    const body = formatCommunitySeedBody(seed, false);
    if (post.id && persistPostEn) {
      void persistPostEn(post.id, title, body).catch(() => undefined);
    }
    return { ...post, title, body };
  }

  const storedTitle = post.titleEn?.trim();
  const storedBody = post.bodyEn?.trim();
  const titleBase =
    storedTitle && !containsHangul(storedTitle)
      ? storedTitle
      : pickLocalizedBilingualText(post.title, false);
  const bodyBase =
    storedBody && !containsHangul(storedBody)
      ? storedBody
      : pickLocalizedBilingualText(post.body, false);
  const needTitle = containsHangul(titleBase);
  const needBody = containsHangul(bodyBase);
  if (!needTitle && !needBody) {
    if (post.id && persistPostEn && (titleBase !== storedTitle || bodyBase !== storedBody)) {
      void persistPostEn(post.id, titleBase, bodyBase).catch(() => undefined);
    }
    return { ...post, title: titleBase, body: bodyBase };
  }

  try {
    const [title, body] = await Promise.all([
      needTitle ? translateTextKoToEnReliable(titleBase) : Promise.resolve(titleBase),
      needBody ? translateTextKoToEnReliable(bodyBase) : Promise.resolve(bodyBase),
    ]);
    if (post.id && persistPostEn && !containsHangul(title) && !containsHangul(body)) {
      void persistPostEn(post.id, title, body).catch(() => undefined);
    } else if (post.id && persistPostEn) {
      // Persist partial clean sides so the next pass only retries the failed side.
      const nextTitle = !containsHangul(title) ? title : storedTitle && !containsHangul(storedTitle) ? storedTitle : null;
      const nextBody = !containsHangul(body) ? body : storedBody && !containsHangul(storedBody) ? storedBody : null;
      if (nextTitle && nextBody) {
        void persistPostEn(post.id, nextTitle, nextBody).catch(() => undefined);
      }
    }
    return { ...post, title, body };
  } catch (err) {
    console.warn("[communityLocalize] post translate failed", post.id, err);
    return { ...post, title: titleBase, body: bodyBase };
  }
}

export async function localizeCommunityCommentFields<
  T extends { id?: number; content: string; contentEn?: string | null },
>(comment: T, lang: Lang): Promise<T> {
  if (lang === "ko") return comment;
  const stored = comment.contentEn?.trim();
  if (stored && !containsHangul(stored)) return { ...comment, content: stored };
  if (!containsHangul(comment.content)) return comment;
  try {
    const content = await translateTextKoToEnReliable(comment.content);
    if (comment.id && persistCommentEn && !containsHangul(content)) {
      void persistCommentEn(comment.id, content).catch(() => undefined);
    }
    return { ...comment, content };
  } catch (err) {
    console.warn("[communityLocalize] comment translate failed", comment.id, err);
    return comment;
  }
}

export async function localizeCommunityPosts<T extends PostLike>(posts: T[], lang: Lang): Promise<T[]> {
  if (lang === "ko" || posts.length === 0) return posts;
  const out: T[] = [];
  for (const post of posts) {
    const storedReady =
      Boolean(post.titleEn?.trim()) &&
      Boolean(post.bodyEn?.trim()) &&
      !containsHangul(post.titleEn || "") &&
      !containsHangul(post.bodyEn || "");
    if (storedReady) {
      out.push({ ...post, title: post.titleEn!.trim(), body: post.bodyEn!.trim() });
      continue;
    }
    const category = (post.category ?? "") as CommunityCategorySlug;
    const seed =
      getCommunitySystemSeed(category, post.authorUserId) ?? matchCommunitySystemSeedByTitle(post.title);
    if (seed) {
      const title = formatCommunitySeedTitle(seed, false);
      const body = formatCommunitySeedBody(seed, false);
      if (post.id && persistPostEn) {
        void persistPostEn(post.id, title, body).catch(() => undefined);
      }
      out.push({ ...post, title, body });
      continue;
    }
    // Do not live-translate the whole feed (rate-limits cause partial Korean).
    // Boot backfill + create warm fill title_en/body_en; client refetches until clean.
    if (post.id) {
      warmCommunityPostTranslation(post.title, post.body, post.id);
    }
    out.push(post);
  }
  return out;
}

export async function localizeCommunityComments<T extends { id?: number; content: string; contentEn?: string | null }>(
  comments: T[],
  lang: Lang,
): Promise<T[]> {
  if (lang === "ko" || comments.length === 0) return comments;
  return mapPool(comments, 2, (c) => localizeCommunityCommentFields(c, lang));
}

export function warmCommunityPostTranslation(title: string, body: string, postId?: number): void {
  void (async () => {
    const titleEn = containsHangul(title) ? await translateTextKoToEnReliable(title) : title;
    const bodyEn = containsHangul(body) ? await translateTextKoToEnReliable(body) : body;
    if (postId && persistPostEn && !containsHangul(titleEn) && !containsHangul(bodyEn)) {
      await persistPostEn(postId, titleEn, bodyEn);
    }
  })().catch(() => undefined);
}

export function warmCommunityCommentTranslation(content: string, commentId?: number): void {
  if (!containsHangul(content)) return;
  void (async () => {
    const contentEn = await translateTextKoToEnReliable(content);
    if (commentId && persistCommentEn && !containsHangul(contentEn)) {
      await persistCommentEn(commentId, contentEn);
    }
  })().catch(() => undefined);
}

export async function ensureCommunityEnColumns(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const migPath = join(here, "..", "migrations", "2026-09-19_community_en_columns.sql");
  const mig = readFileSync(migPath, "utf8");
  await db.execute(sql.raw(mig));
  // Clear polluted Hangul values from earlier failed persists.
  await db.execute(sql`
    UPDATE community_posts
    SET title_en = NULL
    WHERE title_en IS NOT NULL AND title_en ~ '[가-힣]'
  `);
  await db.execute(sql`
    UPDATE community_posts
    SET body_en = NULL
    WHERE body_en IS NOT NULL AND body_en ~ '[가-힣]'
  `);
  await db.execute(sql`
    UPDATE community_comments
    SET content_en = NULL
    WHERE content_en IS NOT NULL AND content_en ~ '[가-힣]'
  `);
}

export async function backfillCommunityEnglishTranslations(opts?: {
  limit?: number;
}): Promise<{ posts: number; comments: number; remainingPosts: number }> {
  const limit = Math.max(1, Math.min(500, opts?.limit ?? 200));
  const postsResult = await db.execute(sql`
    SELECT id, title, body, title_en AS "titleEn", body_en AS "bodyEn", author_user_id AS "authorUserId", category
    FROM community_posts
    WHERE hidden_at IS NULL
      AND (
        title_en IS NULL OR body_en IS NULL
        OR title_en ~ '[가-힣]' OR body_en ~ '[가-힣]'
      )
    ORDER BY id ASC
    LIMIT ${limit}
  `);
  const posts = (postsResult.rows ?? []) as PostLike[];
  let postDone = 0;
  for (const post of posts) {
    const localized = await localizeCommunityPostFields(post, "en");
    if (post.id && persistPostEn && !containsHangul(localized.title) && !containsHangul(localized.body)) {
      await persistPostEn(post.id, localized.title, localized.body);
      postDone += 1;
    }
    await sleep(350);
  }

  const commentsResult = await db.execute(sql`
    SELECT id, content, content_en AS "contentEn"
    FROM community_comments
    WHERE hidden_at IS NULL
      AND (content_en IS NULL OR content_en ~ '[가-힣]')
    ORDER BY id ASC
    LIMIT ${limit}
  `);
  const comments = (commentsResult.rows ?? []) as Array<{ id: number; content: string; contentEn?: string | null }>;
  let commentDone = 0;
  for (const comment of comments) {
    const localized = await localizeCommunityCommentFields(comment, "en");
    if (persistCommentEn && !containsHangul(localized.content)) {
      await persistCommentEn(comment.id, localized.content);
      commentDone += 1;
    }
    await sleep(250);
  }

  const remaining = await db.execute(sql`
    SELECT COUNT(*)::int AS c
    FROM community_posts
    WHERE hidden_at IS NULL
      AND (
        title_en IS NULL OR body_en IS NULL
        OR title_en ~ '[가-힣]' OR body_en ~ '[가-힣]'
      )
  `);
  const remainingPosts = Number((remaining.rows?.[0] as { c?: number } | undefined)?.c ?? 0);

  return { posts: postDone, comments: commentDone, remainingPosts };
}
