import {
  formatCommunitySeedBody,
  formatCommunitySeedTitle,
  getCommunitySystemSeed,
  matchCommunitySystemSeedByTitle,
  pickLocalizedBilingualText,
  type CommunityCategorySlug,
} from "@shared/community";

type Lang = "ko" | "en";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const MAX_CACHE = 2_000;
const cache = new Map<string, { value: string; at: number }>();

function containsHangul(text: string): boolean {
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

async function translateTextKoToEn(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (!containsHangul(trimmed)) return trimmed;

  const cached = cacheGet(`t:${trimmed}`);
  if (cached != null) return cached;

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "ko");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", trimmed);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "NEX-Community/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Translation unavailable (${res.status})`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("Translation returned unexpected response");
  }
  const out = (data[0] as Array<[string, ...unknown[]]>)
    .map((chunk) => chunk[0])
    .join("")
    .trim();
  cacheSet(`t:${trimmed}`, out);
  return out || trimmed;
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
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function localizeCommunityPostFields<
  T extends {
    title: string;
    body: string;
    authorUserId?: string | null;
    category?: string | null;
  },
>(post: T, lang: Lang): Promise<T> {
  if (lang === "ko") return post;

  const category = (post.category ?? "") as CommunityCategorySlug;
  const seed =
    getCommunitySystemSeed(category, post.authorUserId) ?? matchCommunitySystemSeedByTitle(post.title);

  if (seed) {
    return {
      ...post,
      title: formatCommunitySeedTitle(seed, false),
      body: formatCommunitySeedBody(seed, false),
    };
  }

  const titleBase = pickLocalizedBilingualText(post.title, false);
  const bodyBase = pickLocalizedBilingualText(post.body, false);
  const needTitle = containsHangul(titleBase);
  const needBody = containsHangul(bodyBase);
  if (!needTitle && !needBody) {
    return { ...post, title: titleBase, body: bodyBase };
  }

  try {
    const [title, body] = await Promise.all([
      needTitle ? translateTextKoToEn(titleBase) : Promise.resolve(titleBase),
      needBody ? translateTextKoToEn(bodyBase) : Promise.resolve(bodyBase),
    ]);
    return { ...post, title, body };
  } catch (err) {
    console.warn("[communityLocalize] post translate failed", err);
    return { ...post, title: titleBase, body: bodyBase };
  }
}

export async function localizeCommunityCommentFields<T extends { content: string }>(
  comment: T,
  lang: Lang,
): Promise<T> {
  if (lang === "ko") return comment;
  if (!containsHangul(comment.content)) return comment;
  try {
    const content = await translateTextKoToEn(comment.content);
    return { ...comment, content };
  } catch (err) {
    console.warn("[communityLocalize] comment translate failed", err);
    return comment;
  }
}

export async function localizeCommunityPosts<T extends {
  title: string;
  body: string;
  authorUserId?: string | null;
  category?: string | null;
}>(posts: T[], lang: Lang): Promise<T[]> {
  if (lang === "ko" || posts.length === 0) return posts;
  return mapPool(posts, 4, (post) => localizeCommunityPostFields(post, lang));
}

export async function localizeCommunityComments<T extends { content: string }>(
  comments: T[],
  lang: Lang,
): Promise<T[]> {
  if (lang === "ko" || comments.length === 0) return comments;
  return mapPool(comments, 4, (c) => localizeCommunityCommentFields(c, lang));
}

/** Warm cache after create so the next EN feed read is fast. */
export function warmCommunityPostTranslation(title: string, body: string): void {
  void Promise.all([
    containsHangul(title) ? translateTextKoToEn(title) : Promise.resolve(null),
    containsHangul(body) ? translateTextKoToEn(body) : Promise.resolve(null),
  ]).catch(() => undefined);
}

export function warmCommunityCommentTranslation(content: string): void {
  if (!containsHangul(content)) return;
  void translateTextKoToEn(content).catch(() => undefined);
}
