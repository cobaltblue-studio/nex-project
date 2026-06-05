import { getCanonicalOrigin } from "./canonicalHost";
import { normalizeTrackProvenanceStatus } from "@shared/constants";
import { resolvePublicPlayCount } from "@shared/publicPlayCount";

export type AdminCreatorTrackExportRow = {
  trackId: number;
  creatorName: string;
  ytHandle: string;
  trackName: string;
  provenanceStatus: string;
  claimableByCreators: boolean;
  plays: number;
  likes: number;
  battleWins: number;
  chartRank: number | null;
  trackUrl: string;
  registrationEmail: string;
};

export function publicTrackPageUrl(trackId: number): string {
  const origin = getCanonicalOrigin() || "https://nexmusic.ai";
  return `${origin.replace(/\/+$/, "")}/track/${trackId}`;
}

/** Pull @handle from youtube.com/@… if present on the track link. */
export function extractYoutubeHandle(
  audioUrl?: string | null,
  mvUrl?: string | null,
  profileUsername?: string | null,
): string {
  for (const raw of [audioUrl, mvUrl]) {
    const u = String(raw ?? "").trim();
    if (!u) continue;
    const at = u.match(/youtube\.com\/@([^/?#]+)/i);
    if (at?.[1]) return `@${at[1]}`;
    const channel = u.match(/youtube\.com\/channel\/([^/?#]+)/i);
    if (channel?.[1]) return channel[1];
  }
  const slug = String(profileUsername ?? "").trim();
  if (slug && !/^(nex|admin|creator|founder)$/i.test(slug)) return slug;
  return "";
}

export function isExportableRegistrationEmail(email: string | null | undefined): string {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e || !e.includes("@")) return "";
  if (e.endsWith("@artist.local") || e.endsWith("@neo.ai")) return "";
  return e;
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function adminCreatorTrackExportCsv(rows: AdminCreatorTrackExportRow[]): string {
  const headers = [
    "creator_name",
    "yt_handle",
    "track_name",
    "provenance_status",
    "claimable",
    "plays",
    "likes",
    "battle_wins",
    "chart_rank",
    "nex_track_url",
    "registration_email",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.creatorName),
        csvCell(r.ytHandle),
        csvCell(r.trackName),
        csvCell(normalizeTrackProvenanceStatus(r.provenanceStatus)),
        csvCell(r.claimableByCreators ? "true" : "false"),
        csvCell(r.plays),
        csvCell(r.likes),
        csvCell(r.battleWins),
        csvCell(r.chartRank ?? ""),
        csvCell(r.trackUrl),
        csvCell(r.registrationEmail),
      ].join(","),
    );
  }
  return lines.join("\n") + "\n";
}
