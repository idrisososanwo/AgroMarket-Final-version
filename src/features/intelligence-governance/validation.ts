/**
 * AgroMarket Phase 3.8: Governance Validation, Invariants, and Prompt Injection Defense
 */

import { z } from "zod";
import {
  GOVERNANCE_DECISIONS,
  APPROVAL_TYPES,
  OVERRIDE_ROLES,
  OVERRIDE_DECISIONS,
} from "./types";
import { ACTOR_ROLES } from "@/features/decision-intelligence/types";

// -----------------------------------------------------------------------------
// 1. ANTI-PORK ZERO-TOLERANCE INVARIANT
// -----------------------------------------------------------------------------

export const PROHIBITED_PRODUCE_REGEX =
  /(^|[^a-zA-Z])(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)($|[^a-zA-Z])/i;

export function assertNoProhibitedProduce(target: unknown, context: string): void {
  if (target === null || target === undefined) return;

  if (typeof target === "string") {
    if (PROHIBITED_PRODUCE_REGEX.test(target)) {
      throw new Error(
        `Anti-Pork Policy Violation in [${context}]: Prohibited swine/pork terms detected.`
      );
    }
    return;
  }

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      assertNoProhibitedProduce(target[i], `${context}[${i}]`);
    }
    return;
  }

  if (typeof target === "object") {
    for (const [key, val] of Object.entries(target as Record<string, unknown>)) {
      assertNoProhibitedProduce(key, `${context}.${key}`);
      assertNoProhibitedProduce(val, `${context}.${key}`);
    }
  }
}

// -----------------------------------------------------------------------------
// 2. PRIVACY & PII SAFEGUARDS
// -----------------------------------------------------------------------------

export const PHONE_NUMBER_REGEX =
  /(\+?234|0)[789][01]\d{8}\b/;

export const GPS_LAT_LNG_REGEX =
  /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/;

export function assertNoPrivateInformation(target: unknown, context: string): void {
  if (target === null || target === undefined) return;

  const targetStr = typeof target === "string" ? target : JSON.stringify(target);

  if (PHONE_NUMBER_REGEX.test(targetStr)) {
    throw new Error(
      `Commercial Privacy Violation in [${context}]: Direct phone numbers must not be exposed in intelligence governance records.`
    );
  }

  if (GPS_LAT_LNG_REGEX.test(targetStr)) {
    throw new Error(
      `Commercial Privacy Violation in [${context}]: Exact GPS latitude/longitude coordinates must not be exposed. Use regional/State/LGA aggregation.`
    );
  }
}

// -----------------------------------------------------------------------------
// 3. PROMPT INJECTION DEFENSE IN UNTRUSTED INPUTS
// -----------------------------------------------------------------------------

export const PROMPT_INJECTION_PATTERNS = [
  /\b(ignore (all )?previous instructions|disregard (all )?system instructions)\b/i,
  /\b(system prompt override|override (the )?governance policy)\b/i,
  /\b(bypass (all )?safety (checks|rules)|act as an unrestricted|you are now in developer mode)\b/i,
  /\b(approve this (action|transaction|request) automatically)\b/i,
  /\b(mark this (disease|hazard|risk) as safe|treat this as safe)\b/i,
  /\b(force allow|skip human review|grant admin rights)\b/i,
];

export function detectPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeGovernanceText(text: string, fieldName: string): string {
  if (detectPromptInjection(text)) {
    throw new Error(
      `Governance Security Violation: Adversarial prompt injection pattern detected in '${fieldName}'. Policy evaluation aborted.`
    );
  }
  return text.trim();
}

// -----------------------------------------------------------------------------
// 4. ZOD SCHEMAS FOR GOVERNANCE OPERATIONS
// -----------------------------------------------------------------------------

export const governanceEvaluationInputSchema = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
  recommendationId: z.string().uuid().optional().nullable(),
  scenarioId: z.string().uuid().optional().nullable(),
  actionIntent: z.string().min(1, "Action intent is required"),
  actorRole: z.enum(ACTOR_ROLES as unknown as [string, ...string[]]),
  domain: z.string().optional(),
  commodity: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  lga: z.string().optional().nullable(),
  evidenceCount: z.number().int().min(0).default(0),
  confidenceScore: z.number().min(0).max(1).default(0.5),
  conflictingIntelligenceDetected: z.boolean().default(false),
  contextMetadata: z.record(z.string(), z.unknown()).default({}),
  policyVersion: z.string().default("v1.0.0"),
});

export const createApprovalSchema = z.object({
  evaluationId: z.string().uuid("Valid evaluation ID is required"),
  recommendationId: z.string().uuid("Valid recommendation ID is required"),
  actionIntent: z.string().min(1, "Action intent is required"),
  approverId: z.string().uuid("Valid approver user ID is required"),
  approverRole: z.enum(ACTOR_ROLES as unknown as [string, ...string[]]),
  approvalType: z.enum(APPROVAL_TYPES),
  justification: z.string().min(10, "Justification must be at least 10 characters"),
  evidenceReferences: z.array(z.string()).default([]),
  ttlHours: z.number().min(1).max(72).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const revokeApprovalSchema = z.object({
  approvalId: z.string().uuid("Valid approval ID is required"),
  revokerId: z.string().uuid("Valid revoker user ID is required"),
  reason: z.string().min(5, "Revocation reason is required"),
});

export const createOverrideSchema = z.object({
  evaluationId: z.string().uuid("Valid evaluation ID is required"),
  overrideById: z.string().uuid("Valid admin/coordinator user ID is required"),
  overrideRole: z.enum(OVERRIDE_ROLES),
  originalDecision: z.enum(GOVERNANCE_DECISIONS),
  overrideDecision: z.enum(OVERRIDE_DECISIONS),
  reason: z.string().min(15, "Override reason must be substantive (at least 15 characters)"),
  overriddenPolicyRules: z.array(z.string()).min(1, "At least one overridden rule must be cited"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
