import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CLASH_NIGHT_PREVIEW_KEY,
  isClientClashNightForceEnv,
  readClashNightPreviewStorage,
  syncClashNightPreviewFromUrl,
  type ClashNightSource,
} from "@/lib/clashNight";

type ClashNightApi = {
  active: boolean;
  timezone: string;
  weekday: string;
  reason: string;
  nowIso: string;
  rules?: {
    pool: {
      streakMin: number;
      streakMul: number;
      recentDays: number;
      recentMul: number;
      activityDiv: number;
      activityCap: number;
    };
    winBonus: { rankingScoreFlat: number };
  };
};

/**
 * Friday Clash Night activation:
 * 1) `?clashNight=1|0` (synced to localStorage)
 * 2) `localStorage nex.clashNight.preview=1`
 * 3) `VITE_CLASH_NIGHT_FORCE=1`
 * 4) Server `/api/arena/clash-night` (KST Friday + server env force/disable)
 *
 * B/C (pool + win bonus) need server night. For local smoke without KST Friday,
 * pass `clashNightPreview: true` on battle/vote when `sendServerPreview` is true
 * (non-production server honors it). Prefer `CLASH_NIGHT_FORCE=1` on the server.
 */
export function useClashNight(): {
  active: boolean;
  source: ClashNightSource;
  server: ClashNightApi | undefined;
  /** When true, include clashNightPreview on match/vote so non-prod server runs B/C. */
  sendServerPreview: boolean;
} {
  const [previewOn, setPreviewOn] = useState(false);
  const [queryOff, setQueryOff] = useState(false);

  useEffect(() => {
    const fromQuery = syncClashNightPreviewFromUrl();
    if (fromQuery === false) {
      setQueryOff(true);
      setPreviewOn(false);
    } else if (fromQuery === true) {
      setQueryOff(false);
      setPreviewOn(true);
    } else {
      setQueryOff(false);
      setPreviewOn(readClashNightPreviewStorage());
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === CLASH_NIGHT_PREVIEW_KEY || e.key === null) {
        setPreviewOn(readClashNightPreviewStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const clientEnvForce = isClientClashNightForceEnv();

  const { data: server } = useQuery<ClashNightApi>({
    queryKey: ["/api/arena/clash-night"],
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  if (queryOff) {
    return { active: false, source: "off", server, sendServerPreview: false };
  }
  if (previewOn) {
    return {
      active: true,
      source: "preview-storage",
      server,
      sendServerPreview: true,
    };
  }
  if (clientEnvForce) {
    return {
      active: true,
      source: "client-env",
      server,
      sendServerPreview: true,
    };
  }
  if (server?.active) {
    return { active: true, source: "server", server, sendServerPreview: false };
  }
  return { active: false, source: "off", server, sendServerPreview: false };
}
