import { resolveSoundCloudShareToPermalink } from "./soundcloud-resolve";
import {
  diagnoseSunoResolveFailure,
  resolveSunoPlayableMediaVerified,
} from "./suno-audio";
import { resolveSunoShareToSongUuid } from "./suno-resolve";
import { inspectYoutubeVideoAvailability } from "./youtube-availability";

export type MediaSourceKind = "youtube" | "soundcloud" | "suno" | "other";
export type MediaBlockedReason = "private_or_removed" | "embed_blocked" | "unresolvable_link";

export type MediaAvailabilityResult =
  | { status: "ok"; source: MediaSourceKind }
  | { status: "unknown"; source: MediaSourceKind }
  | { status: "blocked"; source: MediaSourceKind; reason: MediaBlockedReason };

export function describePlaybackIssue(result: {
  source: MediaSourceKind;
  reason: MediaBlockedReason;
}): { ko: string; en: string } {
  if (result.reason === "embed_blocked") {
    return {
      ko: "원본 플랫폼이 외부 사이트 임베드를 차단하고 있어 NEX에서 재생할 수 없습니다.",
      en: "The source platform blocks external embeds, so NEX cannot play this media.",
    };
  }
  if (result.reason === "private_or_removed") {
    return {
      ko: "원본 링크가 비공개, 삭제, 또는 접근 불가 상태입니다.",
      en: "The source link is private, removed, or otherwise inaccessible.",
    };
  }
  return {
    ko: "원본 링크를 재생 가능한 공개 링크로 확인할 수 없습니다.",
    en: "The source link could not be confirmed as a playable public link.",
  };
}

function classifySource(url: string | null | undefined): MediaSourceKind {
  const raw = String(url ?? "").trim();
  if (!raw) return "other";
  if (/youtu\.be|youtube\.com/i.test(raw)) return "youtube";
  if (/soundcloud\.com|on\.soundcloud\.com/i.test(raw)) return "soundcloud";
  if (/suno\.(com|ai)/i.test(raw)) return "suno";
  return "other";
}

const SC_OEMBED_HEADERS = {
  Accept: "application/json",
  "User-Agent": "NEX-Music-Platform/1.0 (+https://nexmusic.ai)",
} as const;

/**
 * SoundCloud oEmbed is definitive for public track/set existence.
 * 404/403 → removed or private; network failures stay inconclusive.
 */
export async function inspectSoundCloudOembed(
  permalink: string,
): Promise<"ok" | "blocked" | "unknown"> {
  const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(permalink)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(oembedUrl, {
      method: "GET",
      signal: controller.signal,
      headers: SC_OEMBED_HEADERS,
    });
    if (res.ok) return "ok";
    if (res.status === 404 || res.status === 403) return "blocked";
    return "unknown";
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timeout);
  }
}

export async function inspectTrackPlaybackAvailability(
  url: string | null | undefined,
): Promise<MediaAvailabilityResult> {
  const source = classifySource(url);
  const raw = String(url ?? "").trim();
  if (!raw) return { status: "unknown", source };

  if (source === "youtube") {
    const out = await inspectYoutubeVideoAvailability(raw);
    if (out.status === "ok") return { status: "ok", source };
    if (out.status === "blocked") return { status: "blocked", source, reason: out.reason };
    return { status: "unknown", source };
  }

  if (source === "soundcloud") {
    const permalink = await resolveSoundCloudShareToPermalink(raw);
    if (!permalink) return { status: "unknown", source };
    const oembed = await inspectSoundCloudOembed(permalink);
    if (oembed === "ok") return { status: "ok", source };
    if (oembed === "blocked") {
      return { status: "blocked", source, reason: "private_or_removed" };
    }
    return { status: "unknown", source };
  }

  if (source === "suno") {
    const uuid = await resolveSunoShareToSongUuid(raw);
    if (!uuid) return { status: "unknown", source };
    // UUID alone is not enough — Private clips still resolve a UUID but have no public stream.
    const media = await resolveSunoPlayableMediaVerified(raw);
    if (media) return { status: "ok", source };
    const fail = await diagnoseSunoResolveFailure(raw);
    if (fail === "SUNO_PRIVATE") {
      return { status: "blocked", source, reason: "private_or_removed" };
    }
    return { status: "blocked", source, reason: "unresolvable_link" };
  }

  return { status: "unknown", source };
}
