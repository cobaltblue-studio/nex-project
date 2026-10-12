/**
 * Post-build SEO prerender.
 *
 * Vercel serves the Vite app as static files and rewrites every route to the
 * same index.html — so crawlers (Google and, more importantly, JS-less AI
 * crawlers like GPTBot / PerplexityBot / ClaudeBot) receive one empty shell
 * with identical <title>/description on every URL and zero body text.
 *
 * This script runs after `vite build`. For each public route it writes a
 * dedicated HTML file into client/dist with a unique <title>, meta description,
 * canonical, Open Graph / Twitter tags, JSON-LD structured data, and a
 * crawler-readable <noscript> summary. The React app still hydrates the full
 * UI for real users; only the pre-hydration HTML differs per route.
 *
 * It also overwrites dist/sitemap.xml with the full public route list.
 *
 * Dynamic track/creator pages are not covered here (see the SEO plan Phase 2 —
 * a serverless renderer with DB-driven metadata); they fall back to the home
 * shell, which is no worse than today.
 *
 * ponytail: string-templated head injection, not full React SSR — enough for
 * crawlers without a framework migration. Upgrade to real SSR only if Google
 * Search Console shows rendered-content gaps the summary can't cover.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "client", "dist");
const ORIGIN = "https://nexmusic.ai";
const OG_IMAGE = `${ORIGIN}/og-image.svg`;
const TODAY = new Date().toISOString().slice(0, 10);

interface Route {
  /** URL path, e.g. "/music". Home is "/". */
  path: string;
  /** Output file written into dist. Home writes back to index.html. */
  file: string;
  title: string; // <= 60 chars ideally
  description: string; // <= 160 chars ideally
  /** Longer human-readable summary injected into <noscript> for crawlers. */
  summary: string;
  priority: number; // sitemap priority
}

const ROUTES: Route[] = [
  {
    path: "/",
    file: "index.html",
    title: "NEX — AI Music Chart & Ranking Platform",
    description:
      "The transparent chart for AI-generated music. Submit your track, battle head-to-head, and climb the NEX Top 100 — ranked by wins, plays and votes, not ad spend.",
    summary:
      "NEX is the ranking chart for AI music — a Billboard-style Top 100 for AI-generated songs. Creators submit tracks that compete in head-to-head battles, and rankings come from battle wins, community votes and play counts, with no pay-to-play. A brand-new creator can reach #1 on merit alone.",
    priority: 1.0,
  },
  {
    path: "/music",
    file: "music.html",
    title: "AI Music Top 100 Chart | NEX",
    description:
      "The NEX Top 100 — the live ranking of the best AI-generated music, updated daily from battle wins, plays and votes. Discover trending AI songs by real performance.",
    summary:
      "Browse the NEX Top 100, the live chart of the best AI-generated music. Rankings update continuously as tracks win battles and gather plays and votes. Every position is earned through performance, never marketing spend.",
    priority: 0.9,
  },
  {
    path: "/rising",
    file: "rising.html",
    title: "Rising AI Music — Fastest-Climbing Tracks | NEX",
    description:
      "See the AI tracks climbing fastest on NEX. The Rising board surfaces the steepest upward trends — new AI songs gaining momentum through battle wins and votes.",
    summary:
      "The NEX Rising board highlights AI tracks with the steepest upward trend — songs breaking out right now through battle wins and community votes. It is where new AI music gains momentum before reaching the Top 100.",
    priority: 0.8,
  },
  {
    path: "/battle",
    file: "battle.html",
    title: "AI Music Battles — Vote Head-to-Head | NEX",
    description:
      "Two AI tracks enter, one wins. Vote in live head-to-head AI music battles and decide which tracks rise up the NEX chart. Real-time, unmanipulable rankings.",
    summary:
      "NEX battles are head-to-head matchups between two AI-generated tracks. Listeners vote, and wins drive chart movement. The battle engine is the core mechanism behind every NEX ranking — real-time data that can't be gamed.",
    priority: 0.8,
  },
  {
    path: "/creators",
    file: "creators.html",
    title: "AI Music Creators & Artists | NEX",
    description:
      "Discover AI music creators on NEX. Browse artist profiles, battle records, chart history and verified track portfolios — a meritocratic stage for AI musicians.",
    summary:
      "Discover the creators behind the AI music on NEX. Each profile shows the artist's tracks, battle stats, chart history and follower count — a verifiable portfolio of AI music achievement, where talent outranks follower count.",
    priority: 0.8,
  },
  {
    path: "/radio",
    file: "radio.html",
    title: "NEX Radio — Non-Stop AI Music",
    description:
      "Press play and listen to continuous AI-generated music on NEX Radio — an always-on stream of chart-eligible AI tracks, powered by the community.",
    summary:
      "NEX Radio is a continuous stream of chart-eligible AI-generated music. Press play for non-stop AI songs and discover new creators while their tracks compete on the chart.",
    priority: 0.7,
  },
  {
    path: "/new",
    file: "new.html",
    title: "New AI Music — Latest Submissions | NEX",
    description:
      "The newest AI-generated tracks submitted to NEX. Hear fresh AI music entering the battle pool and help vote on what deserves a spot on the chart.",
    summary:
      "The latest AI-generated tracks submitted to NEX. These fresh entries join the battle pool and compete for plays and votes — the earliest look at tomorrow's chart contenders.",
    priority: 0.7,
  },
  {
    path: "/music-video",
    file: "music-video.html",
    title: "AI Music Videos | NEX",
    description:
      "Watch AI music videos on NEX — visual AI-generated music entries competing for plays, votes and a place on the chart.",
    summary:
      "AI music videos on NEX: visual, AI-generated entries that compete for plays and votes alongside audio tracks. Watch and vote on the videos climbing the NEX chart.",
    priority: 0.7,
  },
  {
    path: "/community",
    file: "community.html",
    title: "NEX Community — AI Music Creators Forum",
    description:
      "Join the NEX community of AI music creators and listeners. Share prompts, discuss tracks, trade feedback and follow the artists climbing the chart.",
    summary:
      "The NEX community is where AI music creators and listeners meet — sharing prompt recipes, discussing tracks, trading feedback and following the artists climbing the chart.",
    priority: 0.7,
  },
  {
    path: "/about",
    file: "about.html",
    title: "About NEX — The Billboard for AI Music",
    description:
      "NEX is the credibility and discovery layer for AI music — a transparent, community-driven ranking that gives AI creators a verifiable track record. Learn how it works.",
    summary:
      "AI-generated music is a fast-growing creative category with no definitive ranking authority. NEX fills that gap: a transparent, community-driven chart that establishes credibility and discoverability for AI music creators worldwide. Rankings are determined by battle wins, votes and plays — never marketing spend — and every ranking factor is public.",
    priority: 0.6,
  },
  {
    path: "/chart-methodology",
    file: "chart-methodology.html",
    title: "How the NEX Chart Works — Ranking Methodology",
    description:
      "How NEX ranks AI music: battle wins (50%), likes (20%), plays (20%) and fans (10%), log-normalized and recalculated continuously. A transparent, auditable method.",
    summary:
      "The NEX ranking is a weighted score: battle wins count 50%, likes 20%, plays 20% and fans 10%. Each signal is log-normalized before being summed, and the index is recalculated continuously so rankings stay current. New-track and completion-rate quality signals are also reflected, and spam or meaningless submissions are blocked by entropy analysis. Every factor is visible — listeners can see battle records, win rates, play counts and vote totals, with no hidden algorithm.",
    priority: 0.6,
  },
  {
    path: "/data-policy",
    file: "data-policy.html",
    title: "Data & Ranking Integrity Policy | NEX",
    description:
      "How NEX keeps rankings fair and data trustworthy — entropy checks on submissions, quality signals and anti-manipulation safeguards behind the AI music chart.",
    summary:
      "NEX protects the integrity of its AI music chart with entropy analysis that blocks spam and meaningless submissions, quality signals that reward genuine engagement, and anti-manipulation safeguards on battles, votes and plays. The goal is a chart that reflects real performance and can be trusted.",
    priority: 0.5,
  },
  {
    path: "/join",
    file: "join.html",
    title: "Submit Your AI Music to NEX",
    description:
      "Submit your AI-generated track to NEX and enter the battle arena. Compete for chart positions, grow an audience through NEX Radio, and build a verified track record.",
    summary:
      "Submit your AI-generated track to NEX with a YouTube or SoundCloud link. Your track enters the battle pool, faces head-to-head matchups, and — with strong win rates — rises toward the official Top 100. No follower gates, no pay-to-play: a new creator can reach #1 on talent alone.",
    priority: 0.7,
  },
];

const ORG = {
  "@type": "Organization",
  "@id": `${ORIGIN}/#org`,
  name: "NEX",
  url: `${ORIGIN}/`,
  logo: `${ORIGIN}/favicon-192.png`,
  description:
    "NEX is the AI Music Ranking Platform — a transparent, battle-driven chart for AI-generated music.",
  sameAs: ["https://www.instagram.com/nexmusic.ai/"],
};

const WEBSITE = {
  "@type": "WebSite",
  "@id": `${ORIGIN}/#website`,
  url: `${ORIGIN}/`,
  name: "NEX",
  publisher: { "@id": `${ORIGIN}/#org` },
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function jsonLdFor(route: Route): string {
  const url = route.path === "/" ? `${ORIGIN}/` : `${ORIGIN}${route.path}`;
  const webPage = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: route.title,
    description: route.description,
    isPartOf: { "@id": `${ORIGIN}/#website` },
    about: { "@id": `${ORIGIN}/#org` },
  };
  const graph: object[] =
    route.path === "/" ? [ORG, WEBSITE, webPage] : [webPage];
  if (route.path !== "/") {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: route.title, item: url },
      ],
    });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

/** Internal-link nav injected into every <noscript> so crawlers find all routes. */
function navLinks(): string {
  return ROUTES.filter((r) => r.path !== "/")
    .map((r) => `<a href="${r.path}">${esc(r.title.split(" | ")[0].split(" — ")[0])}</a>`)
    .join(" · ");
}

function injectSeo(html: string, route: Route): string {
  const url = route.path === "/" ? `${ORIGIN}/` : `${ORIGIN}${route.path}`;
  const t = esc(route.title);
  const d = esc(route.description);
  let out = html;

  const replaceTag = (re: RegExp, replacement: string) => {
    if (re.test(out)) out = out.replace(re, replacement);
  };

  replaceTag(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`);
  replaceTag(
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta name="description" content="${d}" />`,
  );
  replaceTag(
    /<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/i,
    `<link rel="canonical" href="${url}" />`,
  );
  replaceTag(
    /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta property="og:url" content="${url}" />`,
  );
  replaceTag(
    /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta property="og:title" content="${t}" />`,
  );
  replaceTag(
    /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta property="og:description" content="${d}" />`,
  );
  replaceTag(
    /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta name="twitter:title" content="${t}" />`,
  );
  replaceTag(
    /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/i,
    `<meta name="twitter:description" content="${d}" />`,
  );

  // JSON-LD before </head>
  const ld = `<script type="application/ld+json">${jsonLdFor(route)}</script>`;
  out = out.replace(/<\/head>/i, `    ${ld}\n  </head>`);

  // Crawler-readable summary in <noscript> (invisible to JS users).
  const h1 = esc(route.title.split(" | ")[0].split(" — ")[0]);
  const noscript =
    `<noscript>` +
    `<h1>${h1}</h1>` +
    `<p>${esc(route.summary)}</p>` +
    `<nav aria-label="NEX sections">${navLinks()}</nav>` +
    `</noscript>`;
  out = out.replace(/<body>/i, `<body>\n    ${noscript}`);

  return out;
}

function buildSitemap(): string {
  const urls = ROUTES.map((r) => {
    const loc = r.path === "/" ? `${ORIGIN}/` : `${ORIGIN}${r.path}`;
    return (
      `  <url>\n` +
      `    <loc>${loc}</loc>\n` +
      `    <lastmod>${TODAY}</lastmod>\n` +
      `    <changefreq>${r.priority >= 0.8 ? "daily" : "weekly"}</changefreq>\n` +
      `    <priority>${r.priority.toFixed(1)}</priority>\n` +
      `  </url>`
    );
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function main() {
  const indexPath = path.join(DIST, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`[prerender-seo] ${indexPath} not found — run \`vite build\` first.`);
  }
  const base = fs.readFileSync(indexPath, "utf8");

  // Sanity: confirm the head markers we rely on exist, so a template change
  // that drops them fails loudly instead of silently shipping duplicate meta.
  for (const marker of ["<title>", 'name="description"', 'rel="canonical"']) {
    if (!base.includes(marker)) {
      throw new Error(`[prerender-seo] base index.html is missing \`${marker}\` — update client/index.html or this script.`);
    }
  }

  let count = 0;
  for (const route of ROUTES) {
    const html = injectSeo(base, route);
    fs.writeFileSync(path.join(DIST, route.file), html, "utf8");
    count++;
  }

  fs.writeFileSync(path.join(DIST, "sitemap.xml"), buildSitemap(), "utf8");

  console.log(`[prerender-seo] wrote ${count} route HTML files + sitemap.xml to ${DIST}`);
}

main();
