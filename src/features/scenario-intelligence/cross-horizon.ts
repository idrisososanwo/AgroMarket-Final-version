/**
 * AgroMarket Phase 3.7: Cross-Horizon Synthesis & Reasoning
 * Correlates predictive signals across Short-Term (0–7d), Medium-Term (8–30d), and Long-Term (31–90d).
 *
 * Implements:
 * SHORT TERM (Tactical) + MEDIUM TERM (Operational) + LONG TERM (Strategic)
 * -> CROSS-HORIZON TRAJECTORY CLASSIFICATION
 * -> HORIZON CONVERGENCE SCORE
 * -> HORIZON DIVERGENCE / CONFLICT DETECTION
 */

import { MultiHorizonForecast } from "@/features/forecasting/types";
import { assertNoProhibitedProduce } from "./validation";

export type HorizonTrajectoryType =
  | "STRUCTURAL_DEFICIT"          // Persistent shortage across all horizons
  | "TRANSIENT_SPIKE"              // Short-term sharp disruption resolving in medium/long term
  | "ACCELERATING_SURPLUS"         // Growing excess supply across medium and long horizons
  | "COUNTER_CYCLICAL_DIVERGENCE"  // Short-term trend contradicts long-term seasonal direction
  | "NOMINAL_STABILITY"            // Stable across all horizons
  | "INSUFFICIENT_HORIZON_DATA";   // Fewer than 2 horizons available for cross-reasoning

export interface CrossHorizonSynthesis {
  trajectoryType: HorizonTrajectoryType;
  convergenceScore: number; // 0.0 to 1.0 (1.0 = perfectly aligned directional outlook)
  shortTermForecast?: MultiHorizonForecast | null;
  mediumTermForecast?: MultiHorizonForecast | null;
  longTermForecast?: MultiHorizonForecast | null;
  hasHorizonConflict: boolean;
  conflictSummary?: string | null;
  explanatoryNotes: string[];
}

/**
 * Synthesizes forecasts across short, medium, and long horizons into a unified multi-horizon trajectory
 */
export function synthesizeCrossHorizonForecasts(
  forecasts: MultiHorizonForecast[],
  commodity: string
): CrossHorizonSynthesis {
  assertNoProhibitedProduce(commodity, "Cross-Horizon Synthesis");

  const shortTerm = forecasts.find((f) => f.timeHorizon === "SHORT_TERM_0_7D");
  const mediumTerm = forecasts.find((f) => f.timeHorizon === "MEDIUM_TERM_8_30D");
  const longTerm = forecasts.find((f) => f.timeHorizon === "LONG_TERM_31_90D");

  const availableHorizons = [shortTerm, mediumTerm, longTerm].filter(
    (f): f is MultiHorizonForecast => Boolean(f && f.status === "ACTIVE" && f.confidenceLevel !== "INSUFFICIENT_DATA")
  );

  if (availableHorizons.length < 2) {
    return {
      trajectoryType: "INSUFFICIENT_HORIZON_DATA",
      convergenceScore: 0.0,
      shortTermForecast: shortTerm || null,
      mediumTermForecast: mediumTerm || null,
      longTermForecast: longTerm || null,
      hasHorizonConflict: false,
      conflictSummary: null,
      explanatoryNotes: [
        `Cross-horizon reasoning requires at least 2 active forecasts. Currently ${availableHorizons.length} available for ${commodity}.`,
      ],
    };
  }

  const shortDir = shortTerm?.direction || "UNKNOWN";
  const medDir = mediumTerm?.direction || "UNKNOWN";
  const longDir = longTerm?.direction || "UNKNOWN";

  const notes: string[] = [];
  let trajectoryType: HorizonTrajectoryType = "NOMINAL_STABILITY";
  let hasHorizonConflict = false;
  let conflictSummary: string | null = null;

  // 1. Structural Deficit: Supply decreasing or market pressure increasing persistently
  if (
    (shortDir === "INCREASING" && medDir === "INCREASING") ||
    (shortDir === "DECREASING" && medDir === "DECREASING")
  ) {
    if (shortDir === "DECREASING" && (longDir === "DECREASING" || longDir === "STABLE")) {
      trajectoryType = "STRUCTURAL_DEFICIT";
      notes.push("Multi-horizon indicators confirm persistent downward supply pressure across short and medium horizons.");
    } else if (shortDir === "INCREASING" && (longDir === "INCREASING" || longDir === "STABLE")) {
      trajectoryType = "ACCELERATING_SURPLUS";
      notes.push("Multi-horizon indicators project continuous upward volume growth extending into medium horizon.");
    }
  }

  // 2. Transient Spike: Short-term volatile/increasing while medium and long term are stable or reversing
  else if (
    (shortDir === "INCREASING" && medDir === "STABLE") ||
    (shortDir === "VOLATILE" && medDir === "STABLE")
  ) {
    trajectoryType = "TRANSIENT_SPIKE";
    notes.push("Short-term pressure detected, but medium-term baseline exhibits nominal stability, suggesting temporary shock.");
  }

  // 3. Counter-Cyclical Divergence: Short-term opposes medium/long term
  else if (
    (shortDir === "DECREASING" && medDir === "INCREASING") ||
    (shortDir === "INCREASING" && medDir === "DECREASING")
  ) {
    trajectoryType = "COUNTER_CYCLICAL_DIVERGENCE";
    hasHorizonConflict = true;
    conflictSummary = `Short-term forecast indicates ${shortDir} while medium-term indicates ${medDir}.`;
    notes.push(`Horizon Divergence: Short-term trend (${shortDir}) contradicts medium-term outlook (${medDir}).`);
  }

  // 4. Nominal Stability
  else if (shortDir === "STABLE" && medDir === "STABLE") {
    trajectoryType = "NOMINAL_STABILITY";
    notes.push("Both short-term and medium-term horizons reflect balanced nominal conditions within expected bands.");
  }

  // Calculate Convergence Score
  // Baseline 0.5; identical directions add +0.3; third matching horizon adds +0.2; conflict penalizes -0.3
  let convergenceScore = 0.5;
  if (shortDir !== "UNKNOWN" && shortDir === medDir) {
    convergenceScore += 0.3;
  }
  if (longDir !== "UNKNOWN" && longDir === medDir) {
    convergenceScore += 0.2;
  }
  if (hasHorizonConflict) {
    convergenceScore = Math.max(0.1, convergenceScore - 0.3);
  }

  return {
    trajectoryType,
    convergenceScore: Math.min(1.0, Math.max(0.0, Number(convergenceScore.toFixed(3)))),
    shortTermForecast: shortTerm || null,
    mediumTermForecast: mediumTerm || null,
    longTermForecast: longTerm || null,
    hasHorizonConflict,
    conflictSummary,
    explanatoryNotes: notes,
  };
}
