export type PlayListenerContext = {
  listenerCountry?: string | null;
  deviceClass?: string | null;
  referrerHost?: string | null;
};

const DEVICE_CLASSES = new Set(["mobile", "desktop", "tablet", "unknown"]);

export function normalizeDeviceClass(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s || !DEVICE_CLASSES.has(s)) return null;
  return s;
}

export function normalizeReferrerHost(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.length > 120) return s.slice(0, 120);
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(s) && !s.includes(".")) return null;
  return s;
}

export function normalizeListenerCountry(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s || s.length > 64) return null;
  return s;
}

export function playContextFromBody(body: Record<string, unknown> | undefined): PlayListenerContext {
  return {
    deviceClass: normalizeDeviceClass(body?.deviceClass),
    referrerHost: normalizeReferrerHost(body?.referrerHost),
  };
}
