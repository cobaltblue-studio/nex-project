import { useEffect, useRef } from "react";
import { LISTEN_CHEER_MS } from "@shared/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";

/** One session dedupe per track (server still enforces UTC-day per track). */
const sessionLikeRecorded = new Set<number>();

/**
 * Auto-cheer after 1 min listen (same threshold as play count). Manual heart still works immediately.
 * Silent on 409 / errors.
 */
export function useRecordLikeAfterListen(
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
        if (sessionLikeRecorded.has(trackId)) return;
        try {
          await apiRequest("POST", `/api/tracks/${trackId}/like`, {});
          sessionLikeRecorded.add(trackId);
          void queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
          void queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
        } catch (err: unknown) {
          const msg = String((err as Error)?.message ?? "");
          if (msg.startsWith("409")) {
            sessionLikeRecorded.add(trackId);
          }
        }
      })();
    }, LISTEN_CHEER_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trackId, active]);
}
