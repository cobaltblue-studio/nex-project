import {
  TRACK_PROVENANCE_NEX_PICK,
  TRACK_PROVENANCE_VERIFIED,
  normalizeTrackProvenanceStatus,
  type TrackProvenanceStatus,
} from "@shared/constants";

export function trackProvenanceFields(track: {
  provenanceStatus?: string | null;
  claimableByCreators?: boolean;
}): {
  provenanceStatus: TrackProvenanceStatus;
  claimableByCreators: boolean;
} {
  const provenanceStatus = normalizeTrackProvenanceStatus(track.provenanceStatus);
  const claimableByCreators =
    provenanceStatus === TRACK_PROVENANCE_NEX_PICK
      ? track.claimableByCreators !== false
      : !!track.claimableByCreators;
  return {
    provenanceStatus,
    claimableByCreators,
  };
}

/** Spread into public track JSON payloads from route formatters. */
export function publicTrackProvenanceExtras(track: {
  provenanceStatus?: string | null;
  claimableByCreators?: boolean;
}) {
  return trackProvenanceFields(track);
}

export { TRACK_PROVENANCE_NEX_PICK, TRACK_PROVENANCE_VERIFIED };
