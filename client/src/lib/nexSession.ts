const STORAGE_KEY = "nex_listener_session";

/** Stable opaque id for guest play analytics (no PII). */
export function getOrCreateNexSessionKey(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)?.trim();
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return `fallback_${Date.now().toString(36)}`;
  }
}
