const DEFAULT = "https://nexmusic.ai";

export function getPublicSiteOrigin(): string {
  const configured = String(import.meta.env.VITE_PUBLIC_SITE_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (import.meta.env.PROD) return DEFAULT;
  return typeof window !== "undefined" ? window.location.origin : DEFAULT;
}

/** Redirect *.up.railway.app (and www) to nexmusic.ai in production builds. */
export function enforceCanonicalPublicHost(): void {
  if (!import.meta.env.PROD || typeof window === "undefined") return;

  const canonical = getPublicSiteOrigin();
  let target: URL;
  try {
    target = new URL(canonical);
  } catch {
    return;
  }

  const host = window.location.hostname.toLowerCase();
  const canonHost = target.hostname.toLowerCase();
  const onRailway = host.endsWith(".up.railway.app");
  const onWww = canonHost === "nexmusic.ai" && host === "www.nexmusic.ai";

  if (!onRailway && !onWww) return;

  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(`${target.origin}${path}`);
}
