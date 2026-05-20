/** Canonical marketing domain (Railway custom domain should point here). */
export const NEX_PUBLIC_ORIGIN =
  (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://nexmusic.ai";

export function trackShareUrl(trackId: number): string {
  return `${NEX_PUBLIC_ORIGIN}/track/${trackId}`;
}

export function battleShareUrl(): string {
  return `${NEX_PUBLIC_ORIGIN}/battle`;
}
