import { getPlayContext } from "./playContext";
import { getOrCreateNexSessionKey } from "./nexSession";

export async function recordTrackPlay(
  trackId: number,
  completed: boolean,
): Promise<{ counted?: boolean; completionUpdated?: boolean }> {
  const sessionKey = getOrCreateNexSessionKey();
  const ctx = getPlayContext();
  const res = await fetch(`/api/tracks/${trackId}/play`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Nex-Session": sessionKey,
    },
    credentials: "include",
    body: JSON.stringify({ completed, sessionKey, ...ctx }),
  });
  if (!res.ok) return {};
  return (await res.json().catch(() => ({}))) as { counted?: boolean; completionUpdated?: boolean };
}
