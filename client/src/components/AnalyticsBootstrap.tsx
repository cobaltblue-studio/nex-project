import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { captureEvent, capturePageView, captureSessionStart } from "@/lib/analytics";

const HEARTBEAT_INTERVAL_MS = 60_000;

/** Bootstraps session_start (UTM) + page_view on every route change, plus a visibility heartbeat so idle tabs still count toward "online now". */
export function AnalyticsBootstrap() {
  const [location] = useLocation();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    captureSessionStart();
  }, []);

  useEffect(() => {
    if (lastPathRef.current === location) return;
    lastPathRef.current = location;
    capturePageView(location);
  }, [location]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") captureEvent("heartbeat");
    };
    const id = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return null;
}
