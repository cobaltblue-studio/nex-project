export type PlayContextPayload = {
  deviceClass: "mobile" | "desktop" | "tablet" | "unknown";
  referrerHost: string;
};

function detectDeviceClass(): PlayContextPayload["deviceClass"] {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

function sanitizeReferrerHost(): string {
  try {
    const ref = String(document.referrer ?? "").trim();
    if (!ref) return "";
    const host = new URL(ref).hostname.toLowerCase().slice(0, 120);
    if (!host || host === window.location.hostname) return "";
    return host;
  } catch {
    return "";
  }
}

export function getPlayContext(): PlayContextPayload {
  return {
    deviceClass: detectDeviceClass(),
    referrerHost: sanitizeReferrerHost(),
  };
}
