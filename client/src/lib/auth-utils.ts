export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

function safeAuthReturnPath(): string {
  const raw = typeof window !== "undefined" ? window.location.pathname : "/";
  const path = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  if (path === "/auth" || path.startsWith("/auth?")) return "/";
  return path;
}

/**
 * Redirect to /auth (standard login entry); optional toast then navigate.
 * Call only when you know the user is unauthorized — not while `useAuth().isLoading` is true,
 * or you can bounce the UI before the session cookie is readable.
 */
export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    const rt = encodeURIComponent(safeAuthReturnPath());
    window.location.href = `/auth?returnTo=${rt}`;
  }, 500);
}

export function finalizeLoginSession(): void {
  window.location.href = "/";
}
