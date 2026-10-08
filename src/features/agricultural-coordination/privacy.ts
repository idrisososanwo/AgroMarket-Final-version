/**
 * AgroMarket Phase 3.10: Coordination Privacy & Information Isolation
 * Enforces strict information boundaries between participants, ensuring producers never
 * see peers' phone numbers, private commercial terms, exact GPS, or private notes.
 */

import { SupplyCommitment, CoordinationParticipant } from "./types";

/**
 * Sanitizes supply commitments for peer/public viewing.
 * If viewingUser is the commitment owner, coordinator, or admin, full details are retained.
 * Otherwise, contact details, private notes, and internal metadata are stripped.
 */
export function sanitizeSupplyCommitmentForViewer(
  commitment: SupplyCommitment,
  viewerUserId?: string | null,
  isOpportunityCoordinatorOrAdmin: boolean = false
): SupplyCommitment {
  const isOwner = Boolean(viewerUserId && commitment.participantId === viewerUserId);

  if (isOwner || isOpportunityCoordinatorOrAdmin) {
    return commitment;
  }

  // Sanitize for peer participants
  return {
    ...commitment,
    // Anonymize/mask participant ID for peers
    participantId: `masked-${commitment.participantId.slice(0, 8)}`,
    participantDisplayName: commitment.participantDisplayName
      ? `Producer (${commitment.locationState})`
      : `Verified Producer`,
    notes: null, // Hide private commercial notes
    rejectionReason: null,
    metadata: {},
  };
}

/**
 * Sanitizes participant records for peer viewing.
 */
export function sanitizeParticipantForViewer(
  participant: CoordinationParticipant,
  viewerUserId?: string | null,
  isOpportunityCoordinatorOrAdmin: boolean = false
): CoordinationParticipant {
  const isSelf = Boolean(viewerUserId && participant.userId === viewerUserId);

  if (isSelf || isOpportunityCoordinatorOrAdmin) {
    return participant;
  }

  return {
    ...participant,
    userId: `masked-${participant.userId.slice(0, 8)}`,
    displayName: `Participant (${participant.actorRole})`,
    metadata: {},
  };
}

/**
 * Sanitizes commitment evidence for peer viewing.
 */
export function sanitizeEvidenceForViewer(
  evidence: import("./types").CommitmentEvidence,
  viewerUserId?: string | null,
  isOpportunityCoordinatorOrAdmin: boolean = false
): import("./types").CommitmentEvidence {
  const isSubmitter = Boolean(viewerUserId && evidence.submittedBy === viewerUserId);

  if (isSubmitter || isOpportunityCoordinatorOrAdmin) {
    return evidence;
  }

  return {
    ...evidence,
    submittedBy: `masked-${evidence.submittedBy.slice(0, 8)}`,
    submitterDisplayName: evidence.submitterDisplayName ? "Verified Participant" : undefined,
    referenceId: null,
    notes: null,
    metadata: {},
  };
}

