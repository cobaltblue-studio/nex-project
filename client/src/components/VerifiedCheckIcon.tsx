import { BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TRACK_PROVENANCE_VERIFIED } from "@shared/constants";
import type { TrackProvenanceStatus } from "@shared/constants";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  provenanceStatus?: TrackProvenanceStatus | string | null;
  className?: string;
  /** Pixel size for the icon (default 12 on lists). */
  size?: number;
  /** Filled cyan rosette (default true). Set false for minimal overlay-only use. */
  filled?: boolean;
  /** Hover tooltip on track lists (default false). */
  showTooltip?: boolean;
};

/** Small NEX cyan check — only for verified tracks/creators. */
export function VerifiedCheckIcon({
  provenanceStatus,
  className = "",
  size = 12,
  filled = true,
  showTooltip = false,
}: Props) {
  const { t } = useTranslation();
  if (provenanceStatus !== TRACK_PROVENANCE_VERIFIED) return null;

  const icon = (
    <BadgeCheck
      className={`shrink-0 inline-block ${
        filled ? "text-primary fill-primary stroke-primary" : "text-primary"
      } ${className}`}
      style={{ width: size, height: size }}
      strokeWidth={filled ? 1.75 : 2.25}
      aria-hidden={showTooltip}
      aria-label={showTooltip ? undefined : t("provenance.verifiedCreatorTooltip")}
    />
  );

  if (!showTooltip) return icon;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          className="inline-flex shrink-0 cursor-default"
          tabIndex={0}
          aria-label={t("provenance.verifiedCreatorTooltip")}
        >
          {icon}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="text-[10px] font-medium normal-case tracking-normal border-primary/20 bg-zinc-950 text-primary"
      >
        {t("provenance.verifiedCreatorTooltip")}
      </TooltipContent>
    </Tooltip>
  );
}
