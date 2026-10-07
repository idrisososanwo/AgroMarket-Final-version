/**
 * AgroMarket Phase 3.4: Unified Agent Performance & Attribution Layer
 * Evaluates performance across all 9 canonical agricultural intelligence agents.
 *
 * SAFETY INVARIANTS:
 * 1. ZERO FABRICATED ACCURACY: Displays INSUFFICIENT_DATA if sample size < MIN_EVALUATIONS_THRESHOLD.
 * 2. 8 CORE QUESTIONS ANSWERED: Provides transparent auditability for agent outputs.
 * 3. CALIBRATION METRICS: Measures stated confidence against observed empirical outcomes.
 * 4. ANTI-PORK ZERO TOLERANCE: Rejects any prohibited produce terms.
 */

import {
  AgentPerformanceSummary,
  CANONICAL_AGENT_IDS,
  CanonicalAgentId,
  FeedbackEvaluationItem,
  FeedbackOutcomeRecord,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";

export const MIN_EVALUATIONS_THRESHOLD = 3;

export const AGENT_NAMES_MAP: Record<CanonicalAgentId, { name: string; domain: string }> = {
  MARKET_INTELLIGENCE_AGENT: {
    name: "Commodity Market Intelligence Agent",
    domain: "MARKET",
  },
  PRODUCTION_PLANNING_AGENT: {
    name: "Farm Production Planning Agent",
    domain: "PRODUCTION",
  },
  DEMAND_FORECASTING_AGENT: {
    name: "Ecosystem Demand Forecasting Agent",
    domain: "DEMAND",
  },
  SUPPLY_MATCHING_AGENT: {
    name: "Value-Chain Supply Matching Agent",
    domain: "SUPPLY",
  },
  PROCUREMENT_INTELLIGENCE_AGENT: {
    name: "Institutional B2B Procurement Agent",
    domain: "B2B_PROCUREMENT",
  },
  FOOD_SECURITY_RESILIENCE_AGENT: {
    name: "Food Security & Resilience Agent",
    domain: "FOOD_SECURITY",
  },
  LOGISTICS_INTELLIGENCE_AGENT: {
    name: "Cold-Chain & Freight Logistics Agent",
    domain: "LOGISTICS",
  },
  AGRICULTURAL_DISEASE_BIOSECURITY_AGENT: {
    name: "Agricultural Disease Alert Agent",
    domain: "DISEASE_BIOSECURITY",
  },
  AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR: {
    name: "Agricultural Intelligence Orchestrator",
    domain: "ORCHESTRATION",
  },
};

export interface ComputeAgentPerformanceParams {
  agentId: CanonicalAgentId | string;
  evaluations: FeedbackEvaluationItem[];
  outcomes?: FeedbackOutcomeRecord[];
  statedConfidences?: number[];
  decisionsCount?: number;
  actionsCount?: number;
}

/**
 * Computes deterministic agent performance summary answering the 8 core evaluation questions
 */
export function computeAgentPerformance(
  params: ComputeAgentPerformanceParams
): AgentPerformanceSummary {
  assertNoProhibitedProduce(params, "Compute Agent Performance");

  const {
    agentId,
    evaluations,
    outcomes = [],
    statedConfidences = [0.8],
    decisionsCount = 0,
    actionsCount = 0,
  } = params;

  const meta =
    AGENT_NAMES_MAP[agentId as CanonicalAgentId] || {
      name: agentId,
      domain: "GENERAL",
    };

  const agentEvals = evaluations.filter((e) => e.agentId === agentId);
  const validAccuracyScores = agentEvals
    .map((e) => e.accuracyScore)
    .filter((score): score is number => score !== null && score !== undefined);

  const meanConfidence =
    statedConfidences.length > 0
      ? Number(
          (
            statedConfidences.reduce((acc, c) => acc + c, 0) /
            statedConfidences.length
          ).toFixed(3)
        )
      : 0.8;

  // Check if historical data is sufficient
  const isSufficient = validAccuracyScores.length >= MIN_EVALUATIONS_THRESHOLD;

  let meanAccuracyScore: number | null = null;
  let usefulnessRate: number | null = null;
  let timelinessRate: number | null = null;
  let calibrationBias: number | null = null;

  if (isSufficient) {
    const sumAccuracy = validAccuracyScores.reduce((acc, s) => acc + s, 0);
    meanAccuracyScore = Number((sumAccuracy / validAccuracyScores.length).toFixed(3));

    const usefulCount = agentEvals.filter(
      (e) => e.usefulnessRating === "USEFUL" || e.usefulnessRating === "VERY_USEFUL"
    ).length;
    usefulnessRate = Number((usefulCount / agentEvals.length).toFixed(3));

    const timelyCount = agentEvals.filter(
      (e) => e.timeliness === "ON_TIME" || e.timeliness === "EARLY"
    ).length;
    timelinessRate = Number((timelyCount / agentEvals.length).toFixed(3));

    calibrationBias = Number((meanConfidence - meanAccuracyScore).toFixed(3));
  }

  // Answer 8 Core Evaluation Questions
  const answers = {
    whichAgent: `${meta.name} (${agentId})`,
    evidenceUsedCount: agentEvals.length,
    statedConfidence: meanConfidence,
    decisionsCount,
    actionsCount,
    outcomesObservedCount: outcomes.length,
    wasUseful: isSufficient
      ? usefulnessRate !== null && usefulnessRate >= 0.70
        ? "Yes (Useful in ≥70% of evaluations)"
        : "Moderate/Mixed usefulness"
      : "INSUFFICIENT_DATA to evaluate usefulness",
    wasPredictionCorrect: isSufficient
      ? meanAccuracyScore !== null && meanAccuracyScore >= 0.75
        ? `Yes (Mean verified accuracy ${(meanAccuracyScore * 100).toFixed(1)}%)`
        : `Diverged from observed outcomes (Mean accuracy ${(Number(meanAccuracyScore) * 100).toFixed(1)}%)`
      : "INSUFFICIENT_DATA to evaluate prediction accuracy",
  };

  return {
    agentId,
    agentName: meta.name,
    domain: meta.domain,
    totalRecommendationsGenerated: agentEvals.length,
    totalDecisionsResulted: decisionsCount,
    totalActionsInitiated: actionsCount,
    totalOutcomesObserved: outcomes.length,
    totalEvaluationsCount: agentEvals.length,
    evaluationState: isSufficient ? "EVALUATED" : "INSUFFICIENT_DATA",
    meanAccuracyScore,
    usefulnessRate,
    timelinessRate,
    meanConfidence,
    calibrationBias,
    answers,
    disclaimer:
      "Performance metrics represent empirical associations between recommendations and observed outcomes. AgroMarket does not fabricate accuracy without verified ground truth.",
  };
}

/**
 * Returns performance summary across all canonical agents
 */
export function getAllAgentsPerformanceBaseline(
  evaluations: FeedbackEvaluationItem[] = []
): AgentPerformanceSummary[] {
  return CANONICAL_AGENT_IDS.map((agentId) =>
    computeAgentPerformance({
      agentId,
      evaluations: evaluations.filter((e) => e.agentId === agentId),
    })
  );
}
