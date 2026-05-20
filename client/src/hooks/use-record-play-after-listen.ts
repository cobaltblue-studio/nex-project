import { useEffect, useRef } from "react";
import { LISTEN_PLAY_COUNT_MS } from "@shared/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";

/** One session-level dedupe per track (same as `/track/:id` detail player). */
const sessionPlayRecorded = new Set<number>();

/**
 * POST /api/tracks/:id/play after the user keeps the player open for 1 min (logged-in only).
 */
export function useRecordPlayAfterListen(
  trackId: number | null | undefined,
  active: boolean,
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || trackId == null || !Number.isFinite(trackId) || trackId <= 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      void (async () => {
        if (sessionPlayRecorded.has(trackId)) return;
        try {
          const res = await apiRequest("POST", `/api/tracks/${trackId}/play`, { completed: false });
          const body = (await res.json().catch(() => ({}))) as { counted?: boolean };
          if (body.counted !== false) sessionPlayRecorded.add(trackId);
          void queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
        } catch {
          /* best-effort — play count is non-blocking */
        }
      })();
    }, LISTEN_PLAY_COUNT_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trackId, active]);
}
