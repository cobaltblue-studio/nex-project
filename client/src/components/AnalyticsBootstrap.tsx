import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { capturePageView, captureSessionStart } from "@/lib/analytics";

/** Bootstraps session_start (UTM) + page_view on every route change. */
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

  return null;
}
