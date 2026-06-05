import { TRACK_PROVENANCE_VERIFIED } from "@shared/constants";
import type { TrackProvenanceStatus } from "@shared/constants";
import { VerifiedCheckIcon } from "@/components/VerifiedCheckIcon";

type Props = {
  name: string;
  provenanceStatus?: TrackProvenanceStatus | string | null;
  className?: string;
  nameClassName?: string;
  testId?: string;
};

/** Artist line on track lists — verified gets filled cyan check + tooltip, nex_pick stays plain. */
export function CreatorNameWithBadge({
  name,
  provenanceStatus,
  className = "",
  nameClassName = "",
  testId,
}: Props) {
  const verified = provenanceStatus === TRACK_PROVENANCE_VERIFIED;
  return (
    <span
      className={`inline-flex items-center gap-1 min-w-0 max-w-full ${className}`}
      data-testid={testId}
    >
      <span className={`truncate ${nameClassName}`}>{name}</span>
      {verified ? (
        <VerifiedCheckIcon
          provenanceStatus={provenanceStatus}
          size={12}
          filled
          showTooltip
        />
      ) : null}
    </span>
  );
}
