/**
 * AgroMarket Phase 2.2: AI & Agent Reasoning Foundation
 * Reasoning Contracts, Schemas, Objectives, and Budget Definitions
 */

import { z } from "zod";
import {
  IntelligenceSignal,
  IntelligenceObservation,
  IntelligenceEvidence,
  ExpectedImpact,
} from "./types";
import { PORK_PROHIBITED_REGEX } from "./validation";

// -----------------------------------------------------------------------------
// 1. REASONING OBJECTIVES
// -----------------------------------------------------------------------------
export const REASONING_OBJECTIVES = [
  "MARKET_INTERPRETATION",
  "MARKET_TREND_INTERPRETATION",
  "MARKET_PRESSURE_ASSESSMENT",
  "SUPPLY_DEMAND_ANALYSIS",
  "REGIONAL_MARKET_ANALYSIS",
  "MARKET_RISK_SUMMARY",
  "MARKET_RECOMMENDATION",
  "PRODUCTION_PLANNING_INTERPRETATION",
  "PRODUCTION_OPPORTUNITY_ASSESSMENT",
  "PRODUCTION_RISK_ASSESSMENT",
  "PRODUCTION_CONTEXT_SUMMARY",
  "FOOD_SECURITY_ASSESSMENT",
  "LOGISTICS_IMPACT_ASSESSMENT",
  "SECURITY_IMPACT_ASSESSMENT",
  "PRODUCTION_SIGNAL_INTERPRETATION",
  "PROCESSING_BOTTLENECK_ANALYSIS",
  "DEMAND_TREND_INTERPRETATION",
  "DEMAND_FORECAST_INTERPRETATION",
  "DEMAND_PRESSURE_ASSESSMENT",
  "REGIONAL_DEMAND_ANALYSIS",
  "UNMET_DEMAND_ANALYSIS",
  "DEMAND_RISK_SUMMARY",
  "GENERAL_AGRICULTURAL_INTELLIGENCE",
] as const;

export type ReasoningObjective = (typeof REASONING_OBJECTIVES)[number];

export const reasoningObjectiveSchema = z.enum(REASONING_OBJECTIVES);

// -----------------------------------------------------------------------------
// 2. EVIDENCE BUDGET & LIMITS
// -----------------------------------------------------------------------------
export const EVIDENCE_BUDGET = {
  MAX_SIGNALS: 10,
  MAX_OBSERVATIONS: 10,
  MAX_EVIDENCE_ITEMS: 20,
  MAX_HISTORICAL_ITEMS: 5,
  MAX_TOTAL_CHARACTERS: 12000,
} as const;

export interface EvidenceBudgetConfig {
  maxSignals?: number;
  maxObservations?: number;
  maxEvidenceItems?: number;
  maxHistoricalItems?: number;
  maxTotalCharacters?: number;
}

// -----------------------------------------------------------------------------
// 3. EVIDENCE PACKAGE CONTRACT
// -----------------------------------------------------------------------------
export interface GeographicScope {
  state: string;
  lga?: string | null;
  corridor?: string | null;
}

export interface HistoricalContextItem {
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
  notes?: string;
}

export interface EvidencePackage {
  commodity: string;
  geographicScope: GeographicScope;
  signals: IntelligenceSignal[];
  observations: IntelligenceObservation[];
  evidenceItems: IntelligenceEvidence[];
  historicalContext: HistoricalContextItem[];
  evidenceConfidence: number; // Deterministic Phase 2.1 evidence confidence score [0.0, 1.0]
  generatedAt: string;
  isTruncated: boolean;
  truncationNotes?: string[];
}

// -----------------------------------------------------------------------------
// 4. STRUCTURED REASONING REQUEST
// -----------------------------------------------------------------------------
export interface ReasoningRequest {
  agentId: string;
  objective: ReasoningObjective;
  commodity: string;
  location: GeographicScope;
  evidencePackage: EvidencePackage;
  constraints?: string[];
  requestedAt: string;
}

// -----------------------------------------------------------------------------
// 5. STRUCTURED REASONING OUTPUT SCHEMA & TYPE
// -----------------------------------------------------------------------------
export const structuredReasoningOutputSchema = z
  .object({
    summary: z
      .string()
      .min(10, "Summary must be at least 10 characters")
      .max(600, "Summary cannot exceed 600 characters")
      .refine(
        (val) => !PORK_PROHIBITED_REGEX.test(val),
        "Pork or swine references are strictly prohibited"
      ),
    interpretation: z
      .string()
      .min(20, "Interpretation must be at least 20 characters")
      .max(3000, "Interpretation cannot exceed 3000 characters")
      .refine(
        (val) => !PORK_PROHIBITED_REGEX.test(val),
        "Pork or swine references are strictly prohibited"
      ),
    keyFindings: z
      .array(
        z
          .string()
          .min(5)
          .max(250)
          .refine(
            (val) => !PORK_PROHIBITED_REGEX.test(val),
            "Pork or swine references are strictly prohibited"
          )
      )
      .min(1, "At least one key finding is required")
      .max(8, "Cannot exceed 8 key findings"),
    supportingEvidence: z
      .array(
        z.object({
          sourceType: z.string(),
          sourceId: z.string(),
          description: z.string(),
          relevance: z.number().min(0).max(1),
        })
      )
      .max(15),
    uncertainty: z
      .string()
      .min(10, "Uncertainty explanation is required")
      .max(500),
    modelConfidence: z
      .number()
      .min(0.0)
      .max(1.0)
      .describe("AI model's self-reported reasoning confidence"),
    recommendation: z.object({
      title: z
        .string()
        .min(5)
        .max(200)
        .refine(
          (val) => !PORK_PROHIBITED_REGEX.test(val),
          "Pork or swine references are strictly prohibited"
        ),
      recommendation: z
        .string()
        .min(20)
        .max(1500)
        .refine(
          (val) => !PORK_PROHIBITED_REGEX.test(val),
          "Pork or swine references are strictly prohibited"
        ),
      expectedImpact: z.object({
        primaryMetric: z.string(),
        estimatedChange: z.string(),
        timeframeDays: z.number().int().min(1).max(365),
        qualitativeSummary: z.string(),
      }),
      affectedActors: z.array(z.string()).min(1),
      affectedCommodities: z
        .array(z.string())
        .min(1)
        .refine(
          (arr) => arr.every((c) => !PORK_PROHIBITED_REGEX.test(c)),
          "Affected commodities cannot include pork/pig products"
        ),
      affectedLocations: z.array(z.string()).min(1),
    }),
    limitations: z.array(z.string()).min(1, "At least one limitation must be acknowledged"),
    safetyNotes: z.array(z.string()),
  })
  .strict();

export type StructuredReasoningOutput = z.infer<typeof structuredReasoningOutputSchema>;

// -----------------------------------------------------------------------------
// 6. DATABASE RECORD TYPES (Phase 2.2)
// -----------------------------------------------------------------------------
export type ReasoningRunStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED_SAFETY"
  | "REJECTED_VALIDATION"
  | "PROVIDER_UNAVAILABLE";

export interface AIReasoningRun {
  id: string;
  agentId: string;
  objective: ReasoningObjective;
  commodity: string;
  state: string;
  lga?: string | null;
  corridor?: string | null;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: ReasoningRunStatus;
  errorMessage?: string | null;
  requestedBy?: string | null;
  createdAt: string;
}

export interface AIReasoningOutput {
  id: string;
  runId: string;
  summary: string;
  interpretation: string;
  keyFindings: string[];
  supportingEvidence: Array<{
    sourceType: string;
    sourceId: string;
    description: string;
    relevance: number;
  }>;
  uncertainty: string;
  modelConfidence: number;
  evidenceConfidence: number;
  recommendationTitle?: string | null;
  recommendationText?: string | null;
  expectedImpact: ExpectedImpact;
  affectedActors: string[];
  affectedCommodities: string[];
  affectedLocations: string[];
  limitations: string[];
  safetyNotes: string[];
  generatedRecommendationId?: string | null;
  createdAt: string;
}

export type AIReasoningAuditEventType =
  | "REQUEST_INITIATED"
  | "PRE_CHECK_PASSED"
  | "PRE_CHECK_FAILED"
  | "GATEWAY_DISPATCH"
  | "PROVIDER_RESPONSE"
  | "POST_CHECK_PASSED"
  | "POST_CHECK_FAILED"
  | "RECOMMENDATION_PROPOSED"
  | "FAILURE_CAPTURED";

export interface AIReasoningAudit {
  id: string;
  runId: string;
  eventType: AIReasoningAuditEventType;
  actorId?: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}
