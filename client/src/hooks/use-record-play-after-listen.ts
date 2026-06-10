import { useEffect, useRef } from "react";
import { LISTEN_PLAY_COUNT_MS } from "@shared/constants";
import { queryClient } from "@/lib/queryClient";
import { recordTrackPlay } from "@/lib/recordPlay";
// playContext is included inside recordTrackPlay

/** One session-level dedupe per track (same as `/track/:id` detail player). */
const sessionPlayRecorded = new Set<number>();

/**
 * POST /api/tracks/:id/play after continuous listen threshold.
 * Works for logged-in users and guests (opaque sessionKey).
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
          const body = await recordTrackPlay(trackId, false);
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
