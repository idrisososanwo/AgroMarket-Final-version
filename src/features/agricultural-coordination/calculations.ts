/**
 * AgroMarket Phase 3.10: Coordination Calculations & Quantity Accounting
 * Mathematically safe quantity comparisons, coverage progress tracking, and over-commitment prevention.
 */

import {
  CoordinationCoverageStatus,
  CoordinationCoverageSummary,
  CoordinationOpportunityStatus,
  SupplyCommitment,
  QuantityReconciliationResult,
  QuantityReconciliationStatus,
  CoordinationShortfallSummary,
  ParticipantReliabilityMetrics,
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

// -----------------------------------------------------------------------------
// 4. PHASE 3.11: QUANTITY RECONCILIATION, SHORTFALL & RELIABILITY
// -----------------------------------------------------------------------------


/**
 * Deterministically reconciles committed vs confirmed vs fulfilled vs observed quantities.
 * Preserves historical committed quantity intact; never alters original obligation.
 */
export function reconcileCommitmentQuantity(params: {
  commitmentId: string;
  committedQuantity: number;
  confirmedQuantity?: number | null;
  fulfilledQuantity: number;
  receivedQuantity?: number | null;
  unit: string;
}): QuantityReconciliationResult {
  const {
    commitmentId,
    committedQuantity,
    confirmedQuantity = null,
    fulfilledQuantity,
    receivedQuantity = null,
    unit,
  } = params;

  if (committedQuantity == null || isNaN(committedQuantity) || committedQuantity <= 0) {
    return {
      commitmentId,
      committedQuantity: 0,
      confirmedQuantity,
      fulfilledQuantity: 0,
      receivedQuantity,
      varianceQuantity: 0,
      variancePercentage: 0,
      outcome: "INSUFFICIENT_DATA",
      isPartial: false,
      remainingQuantity: 0,
      unit,
      reconciledAt: new Date().toISOString(),
    };
  }

  const effectiveObserved = receivedQuantity ?? fulfilledQuantity;
  const varianceQuantity = Number((effectiveObserved - committedQuantity).toFixed(2));
  const variancePercentage = Number(
    ((varianceQuantity / committedQuantity) * 100).toFixed(1)
  );

  let outcome: QuantityReconciliationStatus = "PENDING";
  if (effectiveObserved <= 0) {
    outcome = "NO_FULFILMENT";
  } else if (effectiveObserved > committedQuantity) {
    outcome = "OVER_FULFILLED_BLOCKED";
  } else if (effectiveObserved === committedQuantity) {
    outcome = "EXACT";
  } else {
    outcome = "UNDER_FULFILLED";
  }

  const isPartial = effectiveObserved > 0 && effectiveObserved < committedQuantity;
  const remainingQuantity = Number(
    Math.max(0, committedQuantity - effectiveObserved).toFixed(2)
  );

  return {
    commitmentId,
    committedQuantity,
    confirmedQuantity,
    fulfilledQuantity,
    receivedQuantity,
    varianceQuantity,
    variancePercentage,
    outcome,
    isPartial,
    remainingQuantity,
    unit,
    reconciledAt: new Date().toISOString(),
  };
}

/**
 * Calculates remaining coordination shortfall for an opportunity.
 * Purely advisory: Never automatically triggers replacement supply or procurement.
 */
export function calculateCoordinationShortfall(params: {
  opportunityId: string;
  requiredQuantity: number;
  fulfilledQuantity: number;
  unit: string;
}): CoordinationShortfallSummary {
  const { opportunityId, requiredQuantity, fulfilledQuantity, unit } = params;

  const validRequired = Math.max(0, Number(requiredQuantity) || 0);
  const validFulfilled = Math.max(0, Number(fulfilledQuantity) || 0);
  const shortfallQuantity = Number(
    Math.max(0, validRequired - validFulfilled).toFixed(2)
  );

  return {
    opportunityId,
    requiredQuantity: validRequired,
    fulfilledQuantity: validFulfilled,
    shortfallQuantity,
    hasShortfall: shortfallQuantity > 0,
    unit,
  };
}

/**
 * Computes deterministic participant reliability metrics from observed historical commitments.
 * INSUFFICIENT DATA RULE: Returns INSUFFICIENT_DATA if completed sample size is below threshold (3).
 * Never ranks or penalizes participants with inadequate historical data.
 */
export function calculateParticipantReliabilityMetrics(params: {
  participantId: string;
  commitments: Array<{
    status: SupplyCommitment["status"];
    readinessStatus?: string;
    committedQuantity: number;
    fulfilledQuantity: number;
    availabilityDate?: string;
    updatedAt?: string;
  }>;
  minimumSampleSizeThreshold?: number;
}): ParticipantReliabilityMetrics {
  const { participantId, commitments, minimumSampleSizeThreshold = 3 } = params;

  // Count terminal/closed commitments
  const closedCommitments = commitments.filter((c) =>
    ["FULFILLED", "FAILED", "WITHDRAWN", "REJECTED", "EXPIRED", "CANCELLED"].includes(
      c.status
    )
  );

  const fulfilledCommitments = commitments.filter((c) => c.status === "FULFILLED").length;
  const partiallyFulfilledCommitments = commitments.filter(
    (c) =>
      c.fulfilledQuantity > 0 &&
      c.fulfilledQuantity < c.committedQuantity &&
      (c.status === "FULFILLED" || c.status === "FAILED")
  ).length;
  const failedCommitments = commitments.filter((c) => c.status === "FAILED").length;
  const totalCommitments = commitments.length;

  if (closedCommitments.length < minimumSampleSizeThreshold) {
    return {
      participantId,
      totalCommitments,
      fulfilledCommitments,
      partiallyFulfilledCommitments,
      failedCommitments,
      fulfilmentRate: null,
      onTimeRate: null,
      averageVariancePercentage: null,
      status: "INSUFFICIENT_DATA",
      minimumSampleSizeThreshold,
      advisoryOnly: true,
    };
  }

  // Calculate fulfilment rate over evaluated closed commitments
  const evaluatedCount = closedCommitments.length;
  const fulfilmentRate = Number(
    ((fulfilledCommitments / evaluatedCount) * 100).toFixed(1)
  );

  // Calculate on-time rate for fulfilled commitments
  let onTimeCount = 0;
  let fulfilledCountWithDates = 0;
  for (const c of commitments.filter((x) => x.status === "FULFILLED")) {
    if (c.availabilityDate && c.updatedAt) {
      fulfilledCountWithDates++;
      const availableTime = new Date(c.availabilityDate).getTime();
      const updatedTime = new Date(c.updatedAt).getTime();
      // On-time if fulfilled within 24h of availability window
      if (updatedTime <= availableTime + 86400000) {
        onTimeCount++;
      }
    }
  }

  const onTimeRate =
    fulfilledCountWithDates > 0
      ? Number(((onTimeCount / fulfilledCountWithDates) * 100).toFixed(1))
      : null;

  // Calculate average variance %
  let totalVariancePct = 0;
  let varianceCount = 0;
  for (const c of closedCommitments) {
    if (c.committedQuantity > 0) {
      const variance = (c.fulfilledQuantity - c.committedQuantity) / c.committedQuantity;
      totalVariancePct += variance * 100;
      varianceCount++;
    }
  }

  const averageVariancePercentage =
    varianceCount > 0 ? Number((totalVariancePct / varianceCount).toFixed(1)) : 0;

  return {
    participantId,
    totalCommitments,
    fulfilledCommitments,
    partiallyFulfilledCommitments,
    failedCommitments,
    fulfilmentRate,
    onTimeRate,
    averageVariancePercentage,
    status: "ADEQUATE_HISTORY",
    minimumSampleSizeThreshold,
    advisoryOnly: true,
  };
}

