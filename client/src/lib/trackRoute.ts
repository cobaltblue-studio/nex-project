/** True while the SPA URL is a track detail page (`/track/:id`). */
export function isTrackDetailPath(pathname: string): boolean {
  return /^\/track\/[^/]+\/?$/.test(pathname);
}
