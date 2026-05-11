/**
 * Vercel serves only the Vite static app. Express lives elsewhere (e.g. Railway).
 * Set NEX_API_PROXY_ORIGIN in Vercel → Environment Variables (Production), e.g.
 *   https://your-service.up.railway.app
 * No trailing slash. Then https://nexmusic.ai/api/* is proxied to that origin.
 */
const apiOrigin = (
  process.env.NEX_API_PROXY_ORIGIN?.trim() || "https://nex-project-production.up.railway.app"
).replace(/\/$/, "");

const rewrites = apiOrigin
  ? [
      { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
      { source: "/(.*)", destination: "/index.html" },
    ]
  : [{ source: "/(.*)", destination: "/index.html" }];

export const config = {
  buildCommand: "npm run build",
  outputDirectory: "client/dist",
  rewrites,
};
