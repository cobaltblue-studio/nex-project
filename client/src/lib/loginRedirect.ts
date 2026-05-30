import { buildApiUrl } from "./apiOrigin";
import { isLikelyInAppBrowser } from "./inapp-browser";

function safeReturnPath(path: string): string {
  const p = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  if (p === "/auth" || p.startsWith("/auth?")) return "/";
  return p;
}

function authPageUrl(returnPath: string): string {
  return `/auth?returnTo=${encodeURIComponent(returnPath)}`;
}

function resolveReturnPath(returnTo?: string): string {
  const raw =
    returnTo ??
    (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/");
  return safeReturnPath(raw);
}

/** Direct Google OAuth start (use only outside in-app browsers). */
export function getGoogleOAuthUrl(returnTo?: string): string {
  const path = resolveReturnPath(returnTo);
  return buildApiUrl(`/api/auth/login?returnTo=${encodeURIComponent(path)}`);
}

/** Login entry: auth page in in-app browsers, OAuth URL otherwise. */
export function getLoginUrl(returnTo?: string): string {
  const path = resolveReturnPath(returnTo);
  if (typeof window !== "undefined" && isLikelyInAppBrowser()) {
    return authPageUrl(path);
  }
  return getGoogleOAuthUrl(returnTo);
}

export function redirectToLogin(returnTo?: string): void {
  window.location.href = getLoginUrl(returnTo);
}
