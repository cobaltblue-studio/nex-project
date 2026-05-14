/**
 * API origin resolver.
 * Default: same-origin `/api` (Vercel rewrites to Railway on nexmusic.ai).
 * Override only when explicitly set via VITE_API_ORIGIN.
 */
function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function getApiOrigin(): string {
  const configured = String(import.meta.env.VITE_API_ORIGIN || "").trim();
  if (configured) return normalizeOrigin(configured);
  return "";
}

export function buildApiUrl(path: string): string {
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  const origin = getApiOrigin();
  return origin ? `${origin}${apiPath}` : apiPath;
}
