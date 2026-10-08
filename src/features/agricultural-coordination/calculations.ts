/**
 * AgroMarket Phase 3.10: Coordination Calculations & Quantity Accounting
 * Mathematically safe quantity comparisons, coverage progress tracking, and over-commitment prevention.
 */

import {
  CoordinationCoverageStatus,
  CoordinationCoverageSummary,
  CoordinationOpportunityStatus,
  SupplyCommitment,
} from "./types";

/**
 * Calculates deterministic coverage for a coordination opportunity based on its accepted commitments.
 */
export function calculateCoordinationCoverage(params: {
  opportunityId: string;
  requiredQuantityKg: number;
  acceptedCommitments: Array<Pick<SupplyCommitment, "canonicalQuantityKg" | "status">>;
  allCommitments?: Array<Pick<SupplyCommitment, "status">>;
  fulfilledQuantityKg?: number;
}): CoordinationCoverageSummary {
  const {
    opportunityId,
    requiredQuantityKg,
    acceptedCommitments,
    allCommitments = [],
    fulfilledQuantityKg = 0,
  } = params;

  if (requiredQuantityKg == null || isNaN(requiredQuantityKg) || requiredQuantityKg <= 0) {
    return {
      opportunityId,
      requiredQuantityKg: 0,
      acceptedQuantityKg: 0,
      fulfilledQuantityKg: 0,
      coveragePercentage: 0,
      remainingCapacityKg: 0,
      coverageStatus: "INSUFFICIENT_DATA",
      acceptedCommitmentsCount: 0,
      pendingOffersCount: 0,
    };
  }

  // Sum only active accepted or fulfilled commitments
  const acceptedKg = acceptedCommitments
    .filter((c) => ["ACCEPTED", "CONFIRMED", "FULFILMENT_PENDING", "FULFILLED"].includes(c.status))
    .reduce((sum, c) => sum + (c.canonicalQuantityKg || 0), 0);

  const roundedAccepted = Number(acceptedKg.toFixed(2));
  const roundedRequired = Number(requiredQuantityKg.toFixed(2));
  const remaining = Number(Math.max(0, roundedRequired - roundedAccepted).toFixed(2));

  let coveragePercentage = 0;
  if (roundedRequired > 0) {
    coveragePercentage = Number(
      Math.min(100, (roundedAccepted / roundedRequired) * 100).toFixed(1)
    );
  }

  let coverageStatus: CoordinationCoverageStatus = "NO_COVERAGE";
  if (roundedAccepted > roundedRequired) {
    coverageStatus = "OVER_COMMITTED_BLOCKED";
  } else if (roundedAccepted >= roundedRequired) {
    coverageStatus = "FULLY_COVERED";
  } else if (roundedAccepted > 0) {
    coverageStatus = "PARTIALLY_COVERED";
  }

  const pendingCount = allCommitments.filter((c) =>
    ["PROPOSED", "OFFERED"].includes(c.status)
  ).length;

  return {
    opportunityId,
    requiredQuantityKg: roundedRequired,
    acceptedQuantityKg: roundedAccepted,
    fulfilledQuantityKg: Number(fulfilledQuantityKg.toFixed(2)),
    coveragePercentage,
    remainingCapacityKg: remaining,
    coverageStatus,
    acceptedCommitmentsCount: acceptedCommitments.length,
    pendingOffersCount: pendingCount,
  };
}

/**
 * Validates whether accepting a specific commitment would cause over-commitment.
 */
export function validateCommitmentCapacity(params: {
  requiredQuantityKg: number;
  currentAcceptedQuantityKg: number;
  newCommitmentQuantityKg: number;
}): {
  canAccept: boolean;
  remainingCapacityKg: number;
  resultingTotalKg: number;
  reason?: string;
} {
  const { requiredQuantityKg, currentAcceptedQuantityKg, newCommitmentQuantityKg } = params;

  if (newCommitmentQuantityKg <= 0) {
    return {
      canAccept: false,
      remainingCapacityKg: 0,
      resultingTotalKg: currentAcceptedQuantityKg,
      reason: "Commitment quantity must be greater than zero.",
    };
  }

  const remaining = Number((requiredQuantityKg - currentAcceptedQuantityKg).toFixed(2));
  const resulting = Number((currentAcceptedQuantityKg + newCommitmentQuantityKg).toFixed(2));

  if (resulting > Number(requiredQuantityKg.toFixed(2))) {
    return {
      canAccept: false,
      remainingCapacityKg: Math.max(0, remaining),
      resultingTotalKg: resulting,
      reason: `Overcommitment prevented: accepting ${newCommitmentQuantityKg} kg would total ${resulting} kg, exceeding required ${requiredQuantityKg} kg (remaining available: ${remaining} kg).`,
    };
  }

  return {
    canAccept: true,
    remainingCapacityKg: Number(Math.max(0, remaining - newCommitmentQuantityKg).toFixed(2)),
    resultingTotalKg: resulting,
  };
}

/**
 * Derives appropriate opportunity lifecycle status from coverage.
 */
export function deriveOpportunityStatusFromCoverage(
  currentStatus: CoordinationOpportunityStatus,
  coverageStatus: CoordinationCoverageStatus
): CoordinationOpportunityStatus {
  // If already in fulfilment, completed, or cancelled, do not revert
  if (["IN_FULFILMENT", "COMPLETED", "CANCELLED", "EXPIRED"].includes(currentStatus)) {
    return currentStatus;
  }

  if (coverageStatus === "FULLY_COVERED") {
    return "FULLY_COMMITTED";
  }
  if (coverageStatus === "PARTIALLY_COVERED") {
    return "PARTIALLY_COMMITTED";
  }
  return "OPEN";
}
