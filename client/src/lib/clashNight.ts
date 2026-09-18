/** Friday Clash Night — preview + product TZ helpers (W5). */

export const CLASH_NIGHT_PREVIEW_KEY = "nex.clashNight.preview";
export const CLASH_NIGHT_TZ = "Asia/Seoul";

export type ClashNightSource =
  | "preview-query"
  | "preview-storage"
  | "client-env"
  | "server"
  | "off";

export function readClashNightPreviewStorage(): boolean {
  try {
    return window.localStorage.getItem(CLASH_NIGHT_PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeClashNightPreviewStorage(on: boolean): void {
  try {
    if (on) {
      window.localStorage.setItem(CLASH_NIGHT_PREVIEW_KEY, "1");
    } else {
      window.localStorage.removeItem(CLASH_NIGHT_PREVIEW_KEY);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Sync `?clashNight=1|0` into localStorage so the night frame survives in-app navigation.
 * Returns forced on/off from query, or null if query absent.
 */
export function syncClashNightPreviewFromUrl(search = window.location.search): boolean | null {
  const params = new URLSearchParams(search);
  const raw = params.get("clashNight");
  if (raw == null) return null;
  const on = raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "on";
  writeClashNightPreviewStorage(on);
  return on;
}

export function isClientClashNightForceEnv(): boolean {
  try {
    return String(import.meta.env.VITE_CLASH_NIGHT_FORCE || "").trim() === "1";
  } catch {
    return false;
  }
}
