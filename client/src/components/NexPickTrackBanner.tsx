import { useTranslation } from "react-i18next";
import { TRACK_PROVENANCE_NEX_PICK } from "@shared/constants";
import type { TrackProvenanceStatus } from "@shared/constants";
import { TrackClaimSection } from "@/components/TrackClaimSection";
import { VerifiedCheckIcon } from "@/components/VerifiedCheckIcon";

type Props = {
  trackId: number;
  provenanceStatus?: TrackProvenanceStatus | string | null;
  claimableByCreators: boolean;
  trackOwnerProfileId: number;
  artistName?: string;
};

export function NexPickTrackBanner({
  trackId,
  provenanceStatus,
  claimableByCreators,
  trackOwnerProfileId,
  artistName,
}: Props) {
  const { t } = useTranslation();
  const isVerified = provenanceStatus === "verified";
  const showNexPickBanner =
    provenanceStatus === TRACK_PROVENANCE_NEX_PICK && claimableByCreators;

  if (!isVerified && !showNexPickBanner) return null;

  return (
    <div className="space-y-3">
      {isVerified && artistName ? (
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/90">
          <VerifiedCheckIcon provenanceStatus={provenanceStatus} size={14} filled showTooltip />
          <span>{artistName}</span>
        </div>
      ) : null}

      {showNexPickBanner ? (
        <div className="rounded-sm border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
          <p className="text-[11px] text-zinc-300 leading-relaxed">{t("provenance.nexPickBanner")}</p>
          <TrackClaimSection
            trackId={trackId}
            claimableByCreators={claimableByCreators}
            trackOwnerProfileId={trackOwnerProfileId}
            compact
          />
          <p className="text-[10px] text-zinc-500">
            <a
              href="mailto:d9ckoblack@gmail.com?subject=NEX%20track%20removal%20request"
              className="hover:text-primary transition-colors underline-offset-2 hover:underline"
            >
              {t("provenance.removalLink")}
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}
