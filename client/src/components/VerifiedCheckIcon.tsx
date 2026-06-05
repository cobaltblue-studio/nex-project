import { BadgeCheck } from "lucide-react";
import { TRACK_PROVENANCE_VERIFIED } from "@shared/constants";
import type { TrackProvenanceStatus } from "@shared/constants";

type Props = {
  provenanceStatus?: TrackProvenanceStatus | string | null;
  className?: string;
  /** Pixel size for the icon (default 14). */
  size?: number;
};

/** Small NEX cyan check — only for verified tracks/creators. */
export function VerifiedCheckIcon({ provenanceStatus, className = "", size = 14 }: Props) {
  if (provenanceStatus !== TRACK_PROVENANCE_VERIFIED) return null;
  return (
    <BadgeCheck
      className={`shrink-0 text-primary inline-block ${className}`}
      style={{ width: size, height: size }}
      strokeWidth={2.25}
      aria-hidden
    />
  );
}
