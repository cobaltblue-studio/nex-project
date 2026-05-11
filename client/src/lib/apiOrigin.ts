/**
 * API origin resolver for emergency failover.
 * - Default: same-origin (/api)
 * - On nexmusic.ai hosts: route /api calls to Railway API origin
 * - Can be overridden with VITE_API_ORIGIN
 */
const FALLBACK_API_ORIGIN = "https://nex-project-production.up.railway.app";

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function getApiOrigin(): string {
  const configured = String(import.meta.env.VITE_API_ORIGIN || "").trim();
  if (configured) return normalizeOrigin(configured);

  if (typeof window === "undefined") return "";
  const host = window.location.hostname.toLowerCase();
  if (host === "nexmusic.ai" || host === "www.nexmusic.ai") {
    return FALLBACK_API_ORIGIN;
  }
  return "";
}

export function buildApiUrl(path: string): string {
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  const origin = getApiOrigin();
  return origin ? `${origin}${apiPath}` : apiPath;
}

