/**
 * AgroMarket Phase 3.4: Intelligence Feedback Loop Validation & Invariants
 *
 * GOVERNANCE INVARIANTS:
 * 1. ANTI-PORK ZERO TOLERANCE: Rejects any prohibited produce terms.
 * 2. PRIVACY SAFEGUARDS: Prevents exposure of raw GPS, phone numbers, or private commercial terms.
 * 3. SECURITY SAFEGUARDS: Rejects tactical safe-passage guarantees; enforces advisory status.
 * 4. BIOSECURITY SAFEGUARDS: Rejects diagnostic veterinary/pesticide prescribing claims.
 * 5. DETERMINISTIC STATE MACHINE: Validates valid outcome and evaluation transitions.
 */

import { z } from "zod";
import {
  FEEDBACK_DOMAINS,
  OUTCOME_TYPES,
  OUTCOME_STATUSES,
  OUTCOME_EVIDENCE_TYPES,
  EVIDENCE_SOURCE_TYPES,
  PROVENANCE_NATURES,
  EVALUATION_STATUSES,
  USEFULNESS_RATINGS,
  TIMELINESS_STATUSES,
  TIME_HORIZONS,
  LEARNING_SIGNAL_TYPES,
  DATA_QUALITY_ISSUE_TYPES,
  DATA_QUALITY_SEVERITIES,
  DATA_QUALITY_STATUSES,
  OutcomeStatus,
  EvaluationStatus,
} from "./types";

// -----------------------------------------------------------------------------
// 1. PROHIBITED PRODUCE (ANTI-PORK) INVARIANT
// -----------------------------------------------------------------------------

export const PROHIBITED_PRODUCE_REGEX =
  /\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine|warthog)\b/i;

export function containsProhibitedProduce(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "string") {
    return PROHIBITED_PRODUCE_REGEX.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsProhibitedProduce(item));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((val) =>
      containsProhibitedProduce(val)
    );
  }
  return false;
}

export function assertNoProhibitedProduce(value: unknown, context: string = "Data Validation"): void {
  if (containsProhibitedProduce(value)) {
    throw new Error(
      `[Anti-Pork Policy Violation] Prohibited produce terms detected during: ${context}. AgroMarket strictly forbids pig/pork commodities across all feedback, intelligence, outcomes, and records.`
    );
  }
}

// -----------------------------------------------------------------------------
// 2. PRIVACY & SECURITY DEFENSES
// -----------------------------------------------------------------------------

// Regex for Nigerian phone numbers (+234, 080, 070, 090, 081, etc.)
const PHONE_NUMBER_REGEX = /(?:\+?234|0)[789][01]\d{8}\b/;

// Regex for high-precision GPS coordinates (e.g. 9.0764785, 7.3985741)
const HIGH_PRECISION_COORDINATES_REGEX = /[-+]?\d{1,2}\.\d{5,},\s*[-+]?\d{1,3}\.\d{5,}/;

export function containsPrivateInformation(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "string") {
    return PHONE_NUMBER_REGEX.test(value) || HIGH_PRECISION_COORDINATES_REGEX.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsPrivateInformation(item));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((val) =>
      containsPrivateInformation(val)
    );
  }
  return false;
}

export function assertNoPrivateInformation(value: unknown, context: string = "Privacy Check"): void {
  if (containsPrivateInformation(value)) {
    throw new Error(
      `[Privacy Violation] Private farmer coordinates or phone numbers detected in ${context}. Feedback records must only use regional/LGA level non-sensitive data.`
    );
  }
}

// Tactical security claims defense: AgroMarket never guarantees route safety or military status
const TACTICAL_SECURITY_REGEX =
  /\b(safe[- ]passage guaranteed|route is 100% secure|military escort cleared|no danger guaranteed)\b/i;

export function containsTacticalSecurityClaims(text: string): boolean {
  return TACTICAL_SECURITY_REGEX.test(text);
}

// Diagnostic biosecurity claims defense: AgroMarket analytical indicator, not clinical veterinary diagnosis
const DIAGNOSTIC_PRESCRIPTION_REGEX =
  /\b(prescribe|administer antibiotic|clinical diagnosis confirmed|culled by system order)\b/i;

export function containsDiagnosticPrescriptionClaims(text: string): boolean {
  return DIAGNOSTIC_PRESCRIPTION_REGEX.test(text);
}

// -----------------------------------------------------------------------------
// 3. STATE TRANSITION RULES
// -----------------------------------------------------------------------------

const VALID_OUTCOME_TRANSITIONS: Record<OutcomeStatus, OutcomeStatus[]> = {
  OUTCOME_OBSERVED: ["OUTCOME_OBSERVED", "OUTCOME_EVALUATED", "OUTCOME_UNKNOWN"],
  OUTCOME_UNKNOWN: ["OUTCOME_UNKNOWN", "OUTCOME_OBSERVED", "OUTCOME_EVALUATED"],
  OUTCOME_EVALUATED: ["OUTCOME_EVALUATED"], // Terminal state
};

export function isValidOutcomeTransition(current: OutcomeStatus, next: OutcomeStatus): boolean {
  return VALID_OUTCOME_TRANSITIONS[current]?.includes(next) ?? false;
}

const VALID_EVALUATION_TRANSITIONS: Record<EvaluationStatus, EvaluationStatus[]> = {
  PENDING: ["PENDING", "EVALUATED", "INSUFFICIENT_DATA", "NOT_EVALUABLE"],
  INSUFFICIENT_DATA: ["INSUFFICIENT_DATA", "PENDING", "EVALUATED", "NOT_EVALUABLE"],
  EVALUATED: ["EVALUATED"], // Terminal state (append-only)
  NOT_EVALUABLE: ["NOT_EVALUABLE"], // Terminal state
};

export function isValidEvaluationTransition(
  current: EvaluationStatus,
  next: EvaluationStatus
): boolean {
  return VALID_EVALUATION_TRANSITIONS[current]?.includes(next) ?? false;
}

// -----------------------------------------------------------------------------
// 4. ZOD SCHEMAS FOR RUNTIME GOVERNANCE
// -----------------------------------------------------------------------------

export const recordFeedbackOutcomeSchema = z
  .object({
    recommendationId: z.string().uuid("Invalid recommendationId UUID"),
    decisionId: z.string().uuid("Invalid decisionId UUID").optional().nullable(),
    actionId: z.string().uuid("Invalid actionId UUID").optional().nullable(),
    actionIntegrationId: z.string().uuid("Invalid actionIntegrationId UUID").optional().nullable(),
    outcomeType: z.enum(OUTCOME_TYPES, {
      errorMap: () => ({ message: "Invalid outcomeType from controlled taxonomy" }),
    }),
    status: z.enum(OUTCOME_STATUSES).default("OUTCOME_OBSERVED"),
    decision: z.string().min(1, "Decision description is required"),
    actionTaken: z.string().min(1, "Action taken is required"),
    actionTime: z.string().datetime().optional(),
    observedOutcome: z.string().min(1, "Observed outcome description is required"),
    expectedOutcome: z.string().min(1, "Expected outcome description is required"),
    variance: z.string().min(1, "Variance description is required"),
    evaluationScore: z
      .number()
      .min(0, "Score cannot be negative")
      .max(100, "Score cannot exceed 100"),
    lessonsLearned: z.string().min(1, "Lessons learned required for feedback loop"),
    actorRole: z.string().optional().nullable(),
    commodity: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    lga: z.string().optional().nullable(),
    recordedBy: z.string().uuid().optional().nullable(),
    metadata: z.record(z.unknown()).default({}),
  })
  .refine((data) => !containsProhibitedProduce(data), {
    message: "Prohibited produce terms detected in outcome submission.",
  })
  .refine((data) => !containsPrivateInformation(data), {
    message: "Private phone or GPS coordinates detected in outcome submission.",
  });

export const recordOutcomeEvidenceSchema = z
  .object({
    outcomeId: z.string().uuid("Invalid outcomeId UUID"),
    evidenceType: z.enum(OUTCOME_EVIDENCE_TYPES),
    sourceType: z.enum(EVIDENCE_SOURCE_TYPES),
    sourceReference: z.string().max(255).optional().nullable(),
    provenanceNature: z.enum(PROVENANCE_NATURES),
    observedAt: z.string().datetime(),
    confidence: z.number().min(0.0).max(1.0, "Confidence must be between 0.0 and 1.0"),
    description: z.string().min(3, "Evidence description required"),
    quantitativeValue: z.number().optional().nullable(),
    unit: z.string().max(30).optional().nullable(),
    createdBy: z.string().uuid().optional().nullable(),
  })
  .refine((data) => !containsProhibitedProduce(data), {
    message: "Prohibited produce terms detected in outcome evidence.",
  })
  .refine((data) => !containsPrivateInformation(data), {
    message: "Private information detected in outcome evidence.",
  });

export const recordFeedbackEvaluationSchema = z
  .object({
    recommendationId: z.string().uuid("Invalid recommendationId UUID"),
    outcomeId: z.string().uuid("Invalid outcomeId UUID").optional().nullable(),
    agentId: z.string().min(1, "Agent ID is required"),
    domain: z.enum(FEEDBACK_DOMAINS),
    evaluationStatus: z.enum(EVALUATION_STATUSES),
    accuracyScore: z.number().min(0.0).max(1.0).optional().nullable(),
    usefulnessRating: z.enum(USEFULNESS_RATINGS),
    timeliness: z.enum(TIMELINESS_STATUSES),
    timeHorizon: z.enum(TIME_HORIZONS),
    predictedState: z.string().optional().nullable(),
    actualState: z.string().optional().nullable(),
    varianceAnalysis: z.string().optional().nullable(),
    evaluationNotes: z.string().optional().nullable(),
    evaluatedBy: z.string().uuid().optional().nullable(),
    evaluatedAt: z.string().datetime().optional(),
  })
  .refine((data) => !containsProhibitedProduce(data), {
    message: "Prohibited produce terms detected in feedback evaluation.",
  })
  .refine((data) => !containsPrivateInformation(data), {
    message: "Private information detected in feedback evaluation.",
  });

export const recordLearningSignalSchema = z
  .object({
    evaluationId: z.string().uuid("Invalid evaluationId UUID").optional().nullable(),
    agentId: z.string().min(1, "Agent ID is required"),
    domain: z.enum(FEEDBACK_DOMAINS),
    signalType: z.enum(LEARNING_SIGNAL_TYPES),
    commodity: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    lga: z.string().optional().nullable(),
    sampleSize: z.number().int().min(1, "Sample size must be at least 1"),
    metricValue: z.number().optional().nullable(),
    confidence: z.number().min(0.0).max(1.0, "Confidence must be between 0.0 and 1.0"),
    interpretation: z.string().min(5, "Interpretation must be provided"),
    metadata: z.record(z.unknown()).default({}),
    generatedAt: z.string().datetime().optional(),
  })
  .refine((data) => !containsProhibitedProduce(data), {
    message: "Prohibited produce terms detected in learning signal.",
  });

export const recordDataQualityIssueSchema = z
  .object({
    issueType: z.enum(DATA_QUALITY_ISSUE_TYPES),
    severity: z.enum(DATA_QUALITY_SEVERITIES),
    domain: z.enum(FEEDBACK_DOMAINS),
    commodity: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    lga: z.string().optional().nullable(),
    affectedEntityType: z.string().min(1, "Affected entity type is required"),
    affectedEntityId: z.string().optional().nullable(),
    description: z.string().min(5, "Issue description is required"),
    evidenceDetails: z.record(z.unknown()).default({}),
    status: z.enum(DATA_QUALITY_STATUSES).default("OPEN"),
    resolutionNotes: z.string().optional().nullable(),
    reportedBy: z.string().uuid().optional().nullable(),
  })
  .refine((data) => !containsProhibitedProduce(data), {
    message: "Prohibited produce terms detected in data quality issue.",
  });
