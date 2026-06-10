import { useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRecordPlayAfterListen } from "@/hooks/use-record-play-after-listen";
import { useRecordLikeAfterListen } from "@/hooks/use-record-like-after-listen";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { YoutubePlayer, extractYoutubeId } from "@/components/YoutubePlayer";
import { Music, Maximize2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { classifyStreamingSource } from "@/lib/streamingEmbed";
import { usePlayableStreamingSrc } from "@/hooks/use-playable-streaming-src";
import { buildIntentOverlay } from "@/lib/intentOverlay";
import { SunoEmbedOutboundShield } from "@/components/SunoEmbedOutboundShield";
import { TrackClaimSection } from "@/components/TrackClaimSection";
import { Link } from "wouter";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  creatorName: string;
  audioUrl?: string | null;
  mvUrl?: string | null;
  trackType?: string | null;
  aiPrompt?: string | null;
  /** When set with owner id, modal shows the same ownership claim flow as the track detail page. */
  trackId?: number | null;
  claimableByCreators?: boolean;
  trackOwnerProfileId?: number | null;
};

/** Quick play dialog — title size tuned down (~40%) vs full detail page for mobile. */
export function TrackPlayModal({
  open,
  onOpenChange,
  title,
  creatorName,
  audioUrl,
  mvUrl,
  trackType,
  aiPrompt,
  trackId = null,
  claimableByCreators = false,
  trackOwnerProfileId = null,
}: Props) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const mediaShellRef = useRef<HTMLDivElement>(null);

  useRecordPlayAfterListen(trackId, open);
  useRecordLikeAfterListen(trackId, open && isAuthenticated);
  const isVideo = trackType === "video";
  const primaryMedia = isVideo ? mvUrl || audioUrl : audioUrl || mvUrl;
  const ytIdFromMv = extractYoutubeId(mvUrl || undefined);
  const ytIdFromAudio = extractYoutubeId(audioUrl || undefined);
  const ytId = isVideo ? ytIdFromMv || ytIdFromAudio : ytIdFromAudio || ytIdFromMv;
  const { iframeSrc: playableSrc, loading: streamLoading, error: streamError } = usePlayableStreamingSrc(
    !ytId ? primaryMedia : undefined,
    { autoplay: true, enableJsApi: true },
  );
  const embedKind = classifyStreamingSource(primaryMedia || undefined);
  const isWide = !!(
    ytId ||
    (playableSrc && (isVideo || embedKind === "vimeo" || embedKind === "youtube"))
  );
  const overlay = buildIntentOverlay(aiPrompt);

  const requestMediaFullscreen = () => {
    const el = mediaShellRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void el.requestFullscreen?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isVideo
            ? "max-w-[min(100vw-0.5rem,72rem)] w-[min(98vw,72rem)] bg-[#0a0a0a] border-white/10 text-white p-4 sm:p-6 gap-4"
            : "max-w-[min(100vw-1.5rem,36rem)] bg-[#0a0a0a] border-white/10 text-white p-4 sm:p-6 gap-4"
        }
      >
        <DialogHeader className="space-y-1 text-left pr-8">
          <DialogTitle
            className="font-display font-bold text-white uppercase tracking-tight leading-snug neon-text-strong neon-text-green text-sm sm:text-base md:text-lg"
            style={{ fontSize: "clamp(0.8rem, 3.5vw, 1.05rem)" }}
          >
            {title}
          </DialogTitle>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">
            {creatorName}
          </p>
        </DialogHeader>

        <div className="space-y-2">
          <div
            ref={mediaShellRef}
            className={`relative w-full rounded-sm overflow-hidden border border-white/10 bg-black ${
              ytId || embedKind === "youtube" || embedKind === "vimeo"
                ? isWide
                  ? "aspect-video max-h-[min(85vh,960px)]"
                  : "aspect-square max-h-[min(60vh,320px)] mx-auto"
                : embedKind === "soundcloud"
                  ? "min-h-[166px] h-[180px] sm:h-[200px]"
                  : embedKind === "suno"
                    ? "min-h-[280px] h-[320px] sm:h-[360px]"
                    : isWide
                      ? "aspect-video max-h-[min(85vh,960px)]"
                      : "aspect-square max-h-[min(60vh,320px)] mx-auto"
            }`}
          >
            {ytId ? (
              <YoutubePlayer videoId={ytId} autoplay className="!h-full !min-h-0" />
            ) : streamLoading && !playableSrc ? (
              <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2 text-zinc-500">
                <Loader2 className="w-10 h-10 animate-spin text-primary/60" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-center px-4">
                  {t("suno.resolving")}
                </p>
              </div>
            ) : playableSrc ? (
              <>
                <iframe
                  key={playableSrc}
                  title={title}
                  src={playableSrc}
                  width="100%"
                  height="100%"
                  className="w-full h-full min-h-[200px]"
                  style={{ border: "none" }}
                  allow="autoplay; encrypted-media; fullscreen; clipboard-write; picture-in-picture"
                  allowFullScreen
                  {...(embedKind === "suno"
                    ? { referrerPolicy: "strict-origin-when-cross-origin" as const }
                    : {})}
                />
                {embedKind === "suno" ? <SunoEmbedOutboundShield /> : null}
              </>
            ) : streamError ? (
              <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2 px-4 text-center">
                <Music className="w-12 h-12 text-zinc-700" />
                <p className="text-[10px] text-zinc-400 leading-relaxed">{streamError}</p>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-16 h-16 text-zinc-700" />
              </div>
            )}
          </div>
          {isVideo && isWide ? (
            <button
              type="button"
              onClick={requestMediaFullscreen}
              data-testid="button-mv-fullscreen"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-[10px] font-black uppercase tracking-[0.25em] border border-primary/35 text-primary bg-primary/10 hover:bg-primary/20 rounded-sm transition-premium"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              View fullscreen
            </button>
          ) : null}
        </div>

        <div className="rounded-sm border border-white/10 bg-black/35 backdrop-blur-sm p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/90">Prompt Recipe</p>
            {overlay.showQualityWarning ? (
              <span className="text-[9px] uppercase tracking-widest text-yellow-300">
                Intent quality is weak
              </span>
            ) : null}
          </div>
          <div className="rounded-sm border border-primary/30 bg-primary/10 px-2.5 py-2">
            <p className="text-[11px] text-zinc-200 whitespace-pre-wrap max-h-28 overflow-y-auto">
              {overlay.promptRecipeText || "Prompt asset is not set."}
            </p>
          </div>
        </div>

        {trackId != null && trackOwnerProfileId != null ? (
          <div className="space-y-3">
            <TrackClaimSection
              trackId={trackId}
              claimableByCreators={claimableByCreators}
              trackOwnerProfileId={trackOwnerProfileId}
              compact
            />
            <Link
              href={`/track/${trackId}`}
              className="block text-center text-[10px] font-bold uppercase tracking-widest text-primary/80 hover:text-primary border border-white/10 rounded-sm py-2 hover:bg-white/5"
              onClick={() => onOpenChange(false)}
            >
              Open full track page
            </Link>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
