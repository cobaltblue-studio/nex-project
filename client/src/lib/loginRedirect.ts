import { buildApiUrl } from "./apiOrigin";

function safeReturnPath(path: string): string {
  const p = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  if (p === "/auth" || p.startsWith("/auth?")) return "/";
  return p;
}

/** Build OAuth login URL that returns the user to a safe in-app path. */
export function getLoginUrl(returnTo?: string): string {
  const raw =
    returnTo ??
    (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/");
  const path = safeReturnPath(raw);
  return buildApiUrl(`/api/auth/login?returnTo=${encodeURIComponent(path)}`);
}

export function redirectToLogin(returnTo?: string): void {
  window.location.href = getLoginUrl(returnTo);
}
