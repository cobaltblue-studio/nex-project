import { getOrCreateNexSessionKey } from "./nexSession";

const SESSION_STARTED_KEY = "nex_analytics_session_started";
const UTM_STORAGE_KEY = "nex_analytics_utm";

type AnalyticsEventPayload = {
  eventName: string;
  pagePath?: string;
  properties?: Record<string, unknown>;
};

type UtmBundle = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_path?: string;
  landing_url?: string;
  referrer_host?: string;
};

function sanitizeReferrerHost(): string | undefined {
  try {
    const ref = String(document.referrer ?? "").trim();
    if (!ref) return undefined;
    return new URL(ref).hostname.replace(/^www\./i, "").slice(0, 120);
  } catch {
    return undefined;
  }
}

function parseUtmFromLocation(): UtmBundle {
  const params = new URLSearchParams(window.location.search);
  const bundle: UtmBundle = {
    landing_path: `${window.location.pathname}${window.location.search}`.slice(0, 512),
    landing_url: window.location.href.slice(0, 512),
    referrer_host: sanitizeReferrerHost(),
  };
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const v = params.get(key)?.trim();
    if (v) bundle[key] = v.slice(0, 120);
  }
  return bundle;
}

function getStoredUtm(): UtmBundle {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UtmBundle;
  } catch {
    /* ignore */
  }
  const fresh = parseUtmFromLocation();
  try {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    /* ignore */
  }
  return fresh;
}

const queue: AnalyticsEventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAnalyticsQueue();
  }, 400);
}

async function flushAnalyticsQueue(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 25);
  const sessionId = getOrCreateNexSessionKey();
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Nex-Session": sessionId,
      },
      credentials: "include",
      body: JSON.stringify({ sessionId, events: batch }),
    });
  } catch {
    queue.unshift(...batch);
  }
}

export function captureEvent(eventName: string, properties?: Record<string, unknown>): void {
  queue.push({
    eventName,
    pagePath: window.location.pathname,
    properties,
  });
  scheduleFlush();
}

export function capturePageView(path: string): void {
  captureEvent("page_view", { path });
}

/** Once per browser tab session — includes UTM + landing for attribution. */
export function captureSessionStart(): void {
  try {
    if (sessionStorage.getItem(SESSION_STARTED_KEY) === "1") return;
    sessionStorage.setItem(SESSION_STARTED_KEY, "1");
  } catch {
    /* continue anyway */
  }
  captureEvent("session_start", getStoredUtm());
}

export function nexAnalyticsHeaders(): Record<string, string> {
  return { "X-Nex-Session": getOrCreateNexSessionKey() };
}
