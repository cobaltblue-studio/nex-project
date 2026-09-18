/**
 * Registry of live YT.Player instances.
 * Only hard-stop on real page exit (pagehide). Do NOT pause on every
 * visibilitychange — alt-tab / app switch was freezing in-page playback
 * and made tracks look “broken” after recent guard changes.
 */
const livePlayers = new Set<{
  stopVideo?: () => void;
  pauseVideo?: () => void;
  destroy?: () => void;
}>();

export function registerYoutubePlayer(player: {
  stopVideo?: () => void;
  pauseVideo?: () => void;
  destroy?: () => void;
} | null | undefined): void {
  if (player) livePlayers.add(player);
}

export function unregisterYoutubePlayer(player: {
  stopVideo?: () => void;
  pauseVideo?: () => void;
  destroy?: () => void;
} | null | undefined): void {
  if (player) livePlayers.delete(player);
}

export function stopAllYoutubePlayers(): void {
  for (const player of [...livePlayers]) {
    try {
      player.stopVideo?.();
    } catch {
      /* ignore */
    }
    try {
      player.pauseVideo?.();
    } catch {
      /* ignore */
    }
    try {
      player.destroy?.();
    } catch {
      /* ignore */
    }
    livePlayers.delete(player);
  }
}

let guardInstalled = false;

/** Hard-stop registered players only when the document is being discarded. */
export function installYoutubePlaybackGuard(): void {
  if (guardInstalled || typeof window === "undefined") return;
  guardInstalled = true;
  window.addEventListener("pagehide", () => stopAllYoutubePlayers());
}
