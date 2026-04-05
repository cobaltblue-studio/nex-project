/** Public site origin (no trailing slash). Used for share links / SEO helpers. */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ||
  import.meta.env.NEXT_PUBLIC_SITE_URL ||
  "https://nexmusic.ai"
)
  .trim()
  .replace(/\/+$/, "");
