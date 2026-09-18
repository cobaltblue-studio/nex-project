/** Live YT.Player instances — paused/stopped when the NEX tab is hidden or closed. */
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

  if (typeof document !== "undefined") {
    document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]').forEach((el) => {
      try {
        el.remove();
      } catch {
        /* ignore */
      }
    });
  }
}

let guardInstalled = false;

/** Install once — halt audio when the tab is backgrounded or the window is closing. */
export function installYoutubePlaybackGuard(): void {
  if (guardInstalled || typeof window === "undefined") return;
  guardInstalled = true;

  window.addEventListener("pagehide", () => stopAllYoutubePlayers());
  window.addEventListener("beforeunload", () => stopAllYoutubePlayers());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pauseAllYoutubePlayers();
  });
}
