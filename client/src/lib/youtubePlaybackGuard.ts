/**
 * Registry of live YT.Player instances for intentional pause/stop.
 * Do not scrape/remove iframes from the DOM here — React owns mount lifecycle.
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

export function pauseAllYoutubePlayers(): void {
  for (const player of [...livePlayers]) {
    try {
      player.pauseVideo?.();
    } catch {
      /* ignore */
    }
    try {
      player.stopVideo?.();
    } catch {
      /* ignore */
    }
  }
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

/** Pause when the tab is backgrounded; hard-stop registered players on page exit. */
export function installYoutubePlaybackGuard(): void {
  if (guardInstalled || typeof window === "undefined") return;
  guardInstalled = true;

  window.addEventListener("pagehide", () => stopAllYoutubePlayers());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pauseAllYoutubePlayers();
  });
}
