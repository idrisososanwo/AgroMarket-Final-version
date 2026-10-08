/**
 * AgroMarket Phase 3.10: Coordination & Supply Commitment State Machines
 * Deterministic lifecycle state machines enforcing permitted transitions, terminal states,
 * and actor authorizations. Client-side arbitrary mutations are strictly prevented.
 */

import {
  CoordinationOpportunityStatus,
  SupplyCommitmentStatus,
  CommitmentReadinessStatus,
} from "./types";

// -----------------------------------------------------------------------------
// 1. OPPORTUNITY TRANSITIONS
// -----------------------------------------------------------------------------

export const PERMITTED_OPPORTUNITY_TRANSITIONS: Record<
  CoordinationOpportunityStatus,
  readonly CoordinationOpportunityStatus[]
> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: [
    "COORDINATING",
    "PARTIALLY_COMMITTED",
    "FULLY_COMMITTED",
    "CANCELLED",
    "EXPIRED",
    "CONSTRAINED",
  ],
  COORDINATING: [
    "PARTIALLY_COMMITTED",
    "FULLY_COMMITTED",
    "CANCELLED",
    "EXPIRED",
    "CONSTRAINED",
  ],
  PARTIALLY_COMMITTED: [
    "FULLY_COMMITTED",
    "IN_FULFILMENT",
    "CANCELLED",
    "EXPIRED",
    "CONSTRAINED",
  ],
  FULLY_COMMITTED: [
    "IN_FULFILMENT",
    "CANCELLED",
    "CONSTRAINED",
  ],
  IN_FULFILMENT: [
    "COMPLETED",
    "CANCELLED",
    "CONSTRAINED",
  ],
  COMPLETED: [], // Terminal
  CANCELLED: [], // Terminal
  EXPIRED: [],   // Terminal
  CONSTRAINED: [
    "COORDINATING",
    "PARTIALLY_COMMITTED",
    "FULLY_COMMITTED",
    "CANCELLED",
  ],
};

export function canTransitionOpportunity(
  from: CoordinationOpportunityStatus,
  to: CoordinationOpportunityStatus
): boolean {
  if (from === to) return true;
  const allowed = PERMITTED_OPPORTUNITY_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function validateOpportunityTransition(
  from: CoordinationOpportunityStatus,
  to: CoordinationOpportunityStatus
): void {
  if (!canTransitionOpportunity(from, to)) {
    throw new Error(
      `Invalid coordination opportunity state transition: cannot transition from '${from}' to '${to}'.`
    );
  }
}

// -----------------------------------------------------------------------------
// 2. SUPPLY COMMITMENT TRANSITIONS
// -----------------------------------------------------------------------------

export const PERMITTED_COMMITMENT_TRANSITIONS: Record<
  SupplyCommitmentStatus,
  readonly SupplyCommitmentStatus[]
> = {
  PROPOSED: ["OFFERED", "WITHDRAWN", "REJECTED", "EXPIRED"],
  OFFERED: ["ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"],
  ACCEPTED: ["CONFIRMED", "WITHDRAWN", "CANCELLED", "FAILED"],
  CONFIRMED: ["FULFILMENT_PENDING", "CANCELLED", "FAILED"],
  FULFILMENT_PENDING: ["FULFILLED", "FAILED", "CANCELLED"],
  FULFILLED: [],  // Terminal
  WITHDRAWN: [],  // Terminal
  REJECTED: [],   // Terminal
  EXPIRED: [],    // Terminal
  CANCELLED: [],  // Terminal
  FAILED: [],     // Terminal
};

export function canTransitionCommitment(
  from: SupplyCommitmentStatus,
  to: SupplyCommitmentStatus
): boolean {
  if (from === to) return true;
  const allowed = PERMITTED_COMMITMENT_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function validateCommitmentTransition(
  from: SupplyCommitmentStatus,
  to: SupplyCommitmentStatus
): void {
  if (!canTransitionCommitment(from, to)) {
    throw new Error(
      `Invalid supply commitment state transition: cannot transition from '${from}' to '${to}'.`
    );
  }
}

export function isCommitmentTerminal(status: SupplyCommitmentStatus): boolean {
  return PERMITTED_COMMITMENT_TRANSITIONS[status].length === 0;
}

export function isOpportunityTerminal(status: CoordinationOpportunityStatus): boolean {
  return PERMITTED_OPPORTUNITY_TRANSITIONS[status].length === 0;
}

// -----------------------------------------------------------------------------
// 3. FULFILMENT READINESS TRANSITIONS (Phase 3.11)
// -----------------------------------------------------------------------------

export const PERMITTED_READINESS_TRANSITIONS: Record<
  CommitmentReadinessStatus,
  readonly CommitmentReadinessStatus[]
> = {
  NOT_READY: [
    "READY_FOR_AGGREGATION",
    "READY_FOR_PROCESSING",
    "READY_FOR_LOGISTICS",
    "IN_FULFILMENT",
    "CANCELLED",
    "FAILED",
  ],
  READY_FOR_AGGREGATION: [
    "READY_FOR_PROCESSING",
    "READY_FOR_LOGISTICS",
    "IN_FULFILMENT",
    "CANCELLED",
    "FAILED",
  ],
  READY_FOR_PROCESSING: [
    "READY_FOR_LOGISTICS",
    "IN_FULFILMENT",
    "CANCELLED",
    "FAILED",
  ],
  READY_FOR_LOGISTICS: [
    "IN_FULFILMENT",
    "FULFILLED",
    "PARTIALLY_FULFILLED",
    "CANCELLED",
    "FAILED",
  ],
  IN_FULFILMENT: [
    "FULFILLED",
    "PARTIALLY_FULFILLED",
    "FAILED",
    "CANCELLED",
  ],
  PARTIALLY_FULFILLED: [
    "IN_FULFILMENT",
    "FULFILLED",
    "FAILED",
    "CANCELLED",
  ],
  FULFILLED: [],  // Terminal
  FAILED: [],     // Terminal
  CANCELLED: [],  // Terminal
};

export function canTransitionReadiness(
  from: CommitmentReadinessStatus,
  to: CommitmentReadinessStatus
): boolean {
  if (from === to) return true;
  const allowed = PERMITTED_READINESS_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function validateReadinessTransition(
  from: CommitmentReadinessStatus,
  to: CommitmentReadinessStatus
): void {
  if (!canTransitionReadiness(from, to)) {
    throw new Error(
      `Invalid fulfilment readiness state transition: cannot transition from '${from}' to '${to}'.`
    );
  }
}

export function isReadinessTerminal(status: CommitmentReadinessStatus): boolean {
  return PERMITTED_READINESS_TRANSITIONS[status].length === 0;
}

