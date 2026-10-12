/**
 * Phase 2 SEO: dynamic per-track (and per-creator) prerendering.
 *
 * The build-time prerender (scripts/prerender-seo.ts) only covers the fixed
 * public routes. Individual tracks (/track/:id) and creators (/profile/:name)
 * are data-driven and change daily, so they're rendered here at request time:
 * fetch the record, inject a unique title/description/canonical/OG + JSON-LD
 * (MusicRecording / MusicGroup) into the SPA shell, and serve. If the record
 * is missing or anything fails, fall through to the normal SPA shell (next()).
 *
 * Registered before serveStatic so these routes win over the catch-all.
 *
 * ponytail: string-injection into the shell, no React SSR. Serves non-deleted
 * tracks regardless of moderation status — the /track/:id page is already
 * public at that URL, so SEO just mirrors it.
 */
import type { Express } from "express";
import fs from "fs";
import path from "path";

const CLIENT_DIST = path.resolve(import.meta.dirname, "..", "client", "dist");
const ORIGIN = "https://nexmusic.ai";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Trim to <= n chars on a word boundary, adding an ellipsis when cut. */
function clip(s: string, n: number): string {
  const t = String(s).replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

interface Seo {
  title: string;
  description: string;
  url: string;
  image: string;
  summary: string;
  jsonLd: object;
}

function readShell(): string | null {
  try {
    return fs.readFileSync(path.join(CLIENT_DIST, "index.html"), "utf8");
  } catch {
    return null;
  }
}

function inject(html: string, seo: Seo): string {
  const t = esc(seo.title);
  const d = esc(seo.description);
  const img = esc(seo.image);
  let out = html;
  const sub = (re: RegExp, rep: string) => {
    if (re.test(out)) out = out.replace(re, rep);
  };
  sub(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`);
  sub(/<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="description" content="${d}" />`);
  sub(/<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/i, `<link rel="canonical" href="${seo.url}" />`);
  sub(/<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:url" content="${seo.url}" />`);
  sub(/<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:title" content="${t}" />`);
  sub(/<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:description" content="${d}" />`);
  sub(/<meta\s+property="og:image"\s+content="[\s\S]*?"\s*\/?>/i, `<meta property="og:image" content="${img}" />`);
  sub(/<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:title" content="${t}" />`);
  sub(/<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:description" content="${d}" />`);
  sub(/<meta\s+name="twitter:image"\s+content="[\s\S]*?"\s*\/?>/i, `<meta name="twitter:image" content="${img}" />`);
  const ld = `<script type="application/ld+json">${JSON.stringify(seo.jsonLd)}</script>`;
  out = out.replace(/<\/head>/i, `    ${ld}\n  </head>`);
  const noscript = `<noscript><h1>${esc(seo.title)}</h1><p>${esc(seo.summary)}</p></noscript>`;
  out = out.replace(/<body>/i, `<body>\n    ${noscript}`);
  return out;
}

export function registerDynamicSeo(app: Express, storage: any): void {
  app.get("/track/:id", async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return next();
    let track: any;
    try {
      track = await storage.getTrack(id);
    } catch {
      return next();
    }
    const shell = readShell();
    if (!track || !shell) return next();

    const artist = track.artistName || track.creator?.username || "NEX Artist";
    const genre = track.genre ? `${track.genre} ` : "";
    const tool = track.aiTool ? ` made with ${track.aiTool}` : "";
    const title = clip(`${track.title} — ${artist} | NEX AI Music`, 70);
    const description = clip(
      track.description ||
        `${track.title} by ${artist}, an AI-generated ${genre}track${tool}, competing head-to-head on the NEX AI music chart.`,
      160,
    );
    const url = `${ORIGIN}/track/${id}`;
    const image = track.coverImageUrl || `${ORIGIN}/og-image.svg`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "MusicRecording",
      name: track.title,
      url,
      genre: track.genre || undefined,
      image: track.coverImageUrl || undefined,
      byArtist: { "@type": "MusicGroup", name: artist },
      isPartOf: { "@id": `${ORIGIN}/#website` },
    };
    const summary = `${track.title} is an AI-generated ${genre}track by ${artist}${tool}. Listen and vote on NEX, the ranking chart for AI music.`;
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.send(inject(shell, { title, description, url, image, summary, jsonLd }));
  });

  app.get("/profile/:name", async (req, res, next) => {
    const name = String(req.params.name || "");
    // Reserved app routes under /profile are handled by the SPA, not SEO.
    if (!name || name === "me") return next();
    let profile: any;
    try {
      profile = await storage.getProfileByUsername(name);
    } catch {
      return next();
    }
    const shell = readShell();
    if (!profile || !shell) return next();

    const uname = profile.username || name;
    const title = clip(`${uname} — AI Music Creator | NEX`, 70);
    const description = clip(
      profile.bio ||
        `${uname} is an AI music creator on NEX. See their tracks, battle record and chart history.`,
      160,
    );
    const url = `${ORIGIN}/profile/${encodeURIComponent(uname)}`;
    const image = profile.avatarUrl || `${ORIGIN}/og-image.svg`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type": "MusicGroup",
        name: uname,
        url,
        image: profile.avatarUrl || undefined,
        description: profile.bio || undefined,
      },
      isPartOf: { "@id": `${ORIGIN}/#website` },
    };
    const summary = `${uname} is an AI music creator on NEX, the ranking chart for AI-generated music. View their tracks, battle wins and chart positions.`;
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.send(inject(shell, { title, description, url, image, summary, jsonLd }));
  });
}
