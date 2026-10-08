/**
 * AgroMarket Phase 3.12: Agricultural Concentration & Bottleneck Analysis Engine
 *
 * Implements deterministic concentration metrics:
 * - Supplier Concentration
 * - Processing Facility Concentration
 * - Logistics Corridor Transit Concentration
 * - Regional Supply Concentration
 *
 * Enforces canonical thresholds (Phase 2.8 / 2.9) and INSUFFICIENT_DATA protections.
 */

import {
  DependencyNodeType,
  ConcentrationClassification,
  ConcentrationAnalysisResult,
  DependencyConfidence,
  DependencyProvenance,
} from "./types";
import {
  CONCENTRATION_THRESHOLDS,
  MIN_OBSERVATION_SAMPLE_SIZE,
} from "./constants";

export interface ConcentrationObservation {
  entityId: string;
  entityLabel?: string;
  sharePercentage?: number; // 0 to 100
  absoluteQuantity?: number;
}

/**
 * Classifies concentration ratio into canonical dependency brackets.
 */
export function classifyConcentrationRatio(ratio: number): ConcentrationClassification {
  if (ratio >= CONCENTRATION_THRESHOLDS.CRITICAL_DEPENDENCY_MIN) {
    return "CRITICAL_DEPENDENCY";
  }
  if (ratio >= CONCENTRATION_THRESHOLDS.HIGH_DEPENDENCY_MIN) {
    return "HIGH_DEPENDENCY";
  }
  if (ratio >= CONCENTRATION_THRESHOLDS.CONCENTRATED_MIN) {
    return "CONCENTRATED";
  }
  return "NORMAL";
}

/**
 * Computes deterministic concentration analysis across a set of observations.
 * Strictly returns INSUFFICIENT_DATA if sample size is below the minimum threshold (3).
 */
export function calculateConcentrationRisk(params: {
  subjectType: DependencyNodeType;
  subjectId: string;
  concentrationType: "SUPPLIER" | "PROCESSING" | "CORRIDOR" | "REGIONAL";
  observations: ConcentrationObservation[];
  confidence?: DependencyConfidence;
  provenance?: DependencyProvenance;
}): ConcentrationAnalysisResult {
  const {
    subjectType,
    subjectId,
    concentrationType,
    observations,
    confidence = "MODERATE",
    provenance = "DERIVED",
  } = params;

  const thresholds = {
    normalMax: CONCENTRATION_THRESHOLDS.NORMAL_MAX,
    concentratedMax: CONCENTRATION_THRESHOLDS.CONCENTRATED_MAX,
    highMax: CONCENTRATION_THRESHOLDS.HIGH_DEPENDENCY_MAX,
    criticalMin: CONCENTRATION_THRESHOLDS.CRITICAL_DEPENDENCY_MIN,
  };

  const sampleSize = observations.length;

  // 1. Enforce minimum sample size
  if (sampleSize < MIN_OBSERVATION_SAMPLE_SIZE) {
    return {
      subjectType,
      subjectId,
      concentrationType,
      dominantEntityId: null,
      dominantEntityLabel: null,
      concentrationRatio: null,
      classification: "INSUFFICIENT_DATA",
      sampleSize,
      thresholds,
      isSinglePointOfFailure: false,
      confidence: "INSUFFICIENT_DATA",
      provenance: "INSUFFICIENT_DATA",
      status: "INSUFFICIENT_DATA",
      advisoryGuidance: `Insufficient historical observations (${sampleSize}/${MIN_OBSERVATION_SAMPLE_SIZE}) to compute a reliable ${concentrationType.toLowerCase()} concentration ratio.`,
    };
  }

  // 2. Calculate percentages
  let dominantId: string | null = null;
  let dominantLabel: string | null = null;
  let maxRatio = 0;

  // Check if observations provide explicit sharePercentage or absolute quantities
  const hasShares = observations.every((o) => typeof o.sharePercentage === "number");
  const hasQuantities = observations.every((o) => typeof o.absoluteQuantity === "number");

  if (hasShares) {
    for (const obs of observations) {
      const share = obs.sharePercentage || 0;
      if (share > maxRatio) {
        maxRatio = share;
        dominantId = obs.entityId;
        dominantLabel = obs.entityLabel || obs.entityId;
      }
    }
  } else if (hasQuantities) {
    const totalQuantity = observations.reduce((acc, curr) => acc + (curr.absoluteQuantity || 0), 0);
    if (totalQuantity <= 0) {
      return {
        subjectType,
        subjectId,
        concentrationType,
        dominantEntityId: null,
        dominantEntityLabel: null,
        concentrationRatio: null,
        classification: "INSUFFICIENT_DATA",
        sampleSize,
        thresholds,
        isSinglePointOfFailure: false,
        confidence: "INSUFFICIENT_DATA",
        provenance: "INSUFFICIENT_DATA",
        status: "INSUFFICIENT_DATA",
        advisoryGuidance: "Total observed flow quantity is zero. Cannot derive concentration.",
      };
    }

    for (const obs of observations) {
      const ratio = Number((((obs.absoluteQuantity || 0) / totalQuantity) * 100).toFixed(2));
      if (ratio > maxRatio) {
        maxRatio = ratio;
        dominantId = obs.entityId;
        dominantLabel = obs.entityLabel || obs.entityId;
      }
    }
  } else {
    // Missing structured share or quantity metrics
    return {
      subjectType,
      subjectId,
      concentrationType,
      dominantEntityId: null,
      dominantEntityLabel: null,
      concentrationRatio: null,
      classification: "INSUFFICIENT_DATA",
      sampleSize,
      thresholds,
      isSinglePointOfFailure: false,
      confidence: "INSUFFICIENT_DATA",
      provenance: "INSUFFICIENT_DATA",
      status: "INSUFFICIENT_DATA",
      advisoryGuidance: "Observations lack valid numerical share or quantity properties.",
    };
  }

  const roundedRatio = Number(maxRatio.toFixed(2));
  const classification = classifyConcentrationRatio(roundedRatio);
  const isSinglePointOfFailure = classification === "CRITICAL_DEPENDENCY";

  // Build advisory guidance
  let guidance = "";
  switch (concentrationType) {
    case "SUPPLIER":
      guidance = isSinglePointOfFailure
        ? `Critical supplier concentration (${roundedRatio}%): Dominant supplier ${dominantLabel} represents a single point of supply failure. Multi-source onboarding advised.`
        : `Supplier concentration ratio computed at ${roundedRatio}% (${classification}).`;
      break;
    case "PROCESSING":
      guidance = isSinglePointOfFailure
        ? `Critical processing bottleneck (${roundedRatio}%): Facility ${dominantLabel} handles over 75% of transformation throughput. Secondary backup mill recommended.`
        : `Processing facility throughput concentration computed at ${roundedRatio}% (${classification}).`;
      break;
    case "CORRIDOR":
      guidance = isSinglePointOfFailure
        ? `Critical corridor transit bottleneck (${roundedRatio}%): Route ${dominantLabel} bears extreme traffic share. Feasible bypass routes should be analyzed.`
        : `Corridor transit share computed at ${roundedRatio}% (${classification}).`;
      break;
    case "REGIONAL":
      guidance = isSinglePointOfFailure
        ? `Critical regional concentration (${roundedRatio}%): Commodity supply originates almost entirely from ${dominantLabel}. Regional biosecurity/climate disruption risk is elevated.`
        : `Regional origin concentration computed at ${roundedRatio}% (${classification}).`;
      break;
  }

  return {
    subjectType,
    subjectId,
    concentrationType,
    dominantEntityId: dominantId,
    dominantEntityLabel: dominantLabel,
    concentrationRatio: roundedRatio,
    classification,
    sampleSize,
    thresholds,
    isSinglePointOfFailure,
    confidence,
    provenance,
    status: "COMPUTED",
    advisoryGuidance: guidance,
  };
}
