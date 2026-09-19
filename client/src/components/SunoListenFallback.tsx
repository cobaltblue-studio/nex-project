import { useState } from "react";
import { ExternalLink, Music } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  normalizeSunoCoverImageUrl,
  sunoCoverUrlFromSongUuid,
} from "@shared/trackThumbnail";
import {
  buildSunoSongPageUrl,
  extractSunoSongIdFromUrl,
  isSunoSongUuid,
} from "@/lib/streamingEmbed";

type Props = {
  shareUrl?: string | null;
  coverImageUrl?: string | null;
  title?: string;
  /** Tighter layout for battle / radio shells. */
  compact?: boolean;
  /** Server resolve failure code — private songs get a clearer CTA. */
  reason?: "SUNO_PRIVATE" | "NO_PUBLIC_STREAM" | null;
};

/**
 * Cover + outbound CTA when Suno has no browser-native public stream
 * (private clip / ciphertext-only m4a-opus / missing social MP4). Never mounts Clerk /embed.
 */
export function SunoListenFallback({
  shareUrl,
  coverImageUrl,
  title,
  compact = false,
  reason = null,
}: Props) {
  const { t } = useTranslation();
  const [coverBroken, setCoverBroken] = useState(false);
  const uuid = extractSunoSongIdFromUrl(shareUrl);
  const cover =
    normalizeSunoCoverImageUrl(coverImageUrl) ??
    (uuid && isSunoSongUuid(uuid) ? sunoCoverUrlFromSongUuid(uuid) : null);
  const openUrl = buildSunoSongPageUrl(shareUrl);
  const showCover = !!cover && !coverBroken;
  const messageKey =
    reason === "SUNO_PRIVATE" ? "suno.privateOnSuno" : "suno.embedUnavailable";

  return (
    <div
      className={`relative w-full h-full min-h-[200px] overflow-hidden bg-black ${
        compact ? "min-h-[120px]" : ""
      }`}
      data-testid="suno-listen-fallback"
      data-reason={reason ?? "NO_PUBLIC_STREAM"}
    >
      {showCover ? (
        <img
          src={cover}
          alt={title ? `${title} cover` : ""}
          className="absolute inset-0 w-full h-full object-cover opacity-45"
          onError={() => setCoverBroken(true)}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
      <div className="relative z-10 flex h-full min-h-[inherit] flex-col items-center justify-center gap-3 px-4 py-6 text-center">
        {!showCover ? <Music className="h-10 w-10 text-zinc-600" /> : null}
        <p className="max-w-sm text-[10px] leading-relaxed text-zinc-300 sm:text-[11px]">
          {t(messageKey)}
        </p>
        {openUrl ? (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-open-on-suno"
            className="inline-flex items-center gap-2 rounded-sm border border-primary/40 bg-primary/15 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary transition-premium hover:bg-primary/25"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("suno.openOnSuno")}
          </a>
        ) : null}
      </div>
    </div>
  );
}
