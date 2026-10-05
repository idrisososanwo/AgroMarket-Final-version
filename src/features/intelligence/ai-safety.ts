/**
 * AgroMarket Phase 2.2: AI & Agent Reasoning Foundation
 * Deterministic Safety Engine: Pre-Checks, Post-Checks, and Prompt Injection Defense
 *
 * Implements strict anti-pork rejection, disease-risk non-diagnostic constraints,
 * food safety certification bans, halal certification bans, route safety bans,
 * and autonomous financial/livestock action prohibitions.
 */

import {
  ReasoningRequest,
  StructuredReasoningOutput,
  REASONING_OBJECTIVES,
} from "./reasoning-contracts";
import { PORK_PROHIBITED_REGEX, NIGERIAN_STATES } from "./validation";

export interface SafetyCheckResult {
  passed: boolean;
  violations: string[];
}

// -----------------------------------------------------------------------------
// FORBIDDEN REASONING PATTERNS (POST-CHECK REGEXES)
// -----------------------------------------------------------------------------

// 1. Disease Diagnosis & Veterinary Treatment Prohibition
export const VETERINARY_DIAGNOSIS_REGEX =
  /\b(this animal has|diagnosed with|treat the animal with|prescribe (medication|antibiotics|drugs)|administer (medication|antibiotics|vaccine) to the animal|definitive veterinary diagnosis)\b/i;

// 2. Food Safety Certification Prohibition
export const FOOD_SAFETY_CERTIFICATION_REGEX =
  /\b(officially food[- ]safe|officially certified food[- ]safe|guaranteed food[- ]safe|guarantees food safety|certified safe for human consumption)\b/i;

// 3. Halal Certification Prohibition
export const HALAL_CERTIFICATION_REGEX =
  /\b(officially halal certified|certifies this product as halal|guaranteed halal|halal certification issued|hereby certified halal)\b/i;

// 4. Physical / Corridor Safety Guarantee Prohibition
export const ROUTE_SAFETY_GUARANTEE_REGEX =
  /\b(this road is safe|this corridor is (100% )?safe|guaranteed safe passage|guarantees physical safety|route is completely secure)\b/i;

// 5. Autonomous Financial / Livestock Action Prohibition
export const AUTONOMOUS_ACTION_REGEX =
  /\b(autonomously transfer|transfer money automatically|execute payment automatically|disburse funds autonomously|auto-purchase livestock|automatically dispatch livestock|autonomously slaughter|execute settlement without approval)\b/i;

// 6. Prompt Injection Patterns in Untrusted Agricultural Evidence
export const PROMPT_INJECTION_REGEX =
  /\b(ignore (all )?previous instructions|disregard (all )?system instructions|system prompt override|bypass (all )?safety (checks|rules)|act as an unrestricted|you are now in developer mode)\b/i;

/**
 * 1. DETERMINISTIC PRE-CHECK
 * Executes before dispatching request to AI Gateway.
 */
export function validatePreReasoningSafety(request: ReasoningRequest): SafetyCheckResult {
  const violations: string[] = [];

  // 1.1 Anti-pork check on requested commodity
  if (PORK_PROHIBITED_REGEX.test(request.commodity)) {
    violations.push(`Anti-Pork Violation: Commodity '${request.commodity}' contains prohibited swine/pork terms.`);
  }

  // 1.2 Anti-pork check on constraints and context
  for (const c of request.constraints || []) {
    if (PORK_PROHIBITED_REGEX.test(c)) {
      violations.push(`Anti-Pork Violation: Constraint '${c}' contains prohibited swine/pork terms.`);
    }
  }

  // 1.3 Objective validity
  if (!REASONING_OBJECTIVES.includes(request.objective)) {
    violations.push(`Objective Violation: '${request.objective}' is not an authorized reasoning objective.`);
  }

  // 1.4 Geographic validation: State must be a valid Nigerian State
  const inputState = request.location.state?.trim().toLowerCase();
  const isValidState = Boolean(
    inputState &&
      (NIGERIAN_STATES as readonly string[]).some(
        (s) => s.toLowerCase() === inputState
      )
  );
  if (!isValidState) {
    violations.push(`Geographic Violation: '${request.location.state}' is not a recognized Nigerian state.`);
  }

  // 1.5 Evidence presence check: At least 1 signal, observation, or evidence item
  const pkg = request.evidencePackage;
  const totalEvidencePoints =
    (pkg.signals?.length || 0) +
    (pkg.observations?.length || 0) +
    (pkg.evidenceItems?.length || 0);

  if (totalEvidencePoints === 0) {
    violations.push("Evidence Violation: Reasoning requires at least one supporting signal, observation, or evidence record.");
  }

  // 1.6 Prompt Injection scan on input parameters and evidence texts
  for (const sig of pkg.signals || []) {
    if (PROMPT_INJECTION_REGEX.test(sig.source)) {
      violations.push(`Prompt Injection Detected in signal source: '${sig.source}'.`);
    }
    if (PORK_PROHIBITED_REGEX.test(sig.commodity)) {
      violations.push(`Anti-Pork Violation in signal commodity: '${sig.commodity}'.`);
    }
  }

  for (const obs of pkg.observations || []) {
    if (PROMPT_INJECTION_REGEX.test(obs.summary)) {
      violations.push(`Prompt Injection Detected in observation summary: '${obs.summary}'.`);
    }
    if (obs.commodity && PORK_PROHIBITED_REGEX.test(obs.commodity)) {
      violations.push(`Anti-Pork Violation in observation commodity: '${obs.commodity}'.`);
    }
  }

  for (const ev of pkg.evidenceItems || []) {
    if (PROMPT_INJECTION_REGEX.test(ev.description)) {
      violations.push(`Prompt Injection Detected in evidence description: '${ev.description}'.`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * 2. DETERMINISTIC POST-CHECK
 * Executes on validated StructuredReasoningOutput before accepting into the application domain.
 */
export function validatePostReasoningSafety(output: StructuredReasoningOutput): SafetyCheckResult {
  const violations: string[] = [];

  const textBlocks: string[] = [
    output.summary,
    output.interpretation,
    ...output.keyFindings,
    output.uncertainty,
    output.recommendation.title,
    output.recommendation.recommendation,
    output.recommendation.expectedImpact.qualitativeSummary,
    ...output.recommendation.affectedCommodities,
    ...output.limitations,
    ...output.safetyNotes,
  ];

  for (const block of textBlocks) {
    if (!block) continue;

    // 2.1 Anti-pork check
    if (PORK_PROHIBITED_REGEX.test(block)) {
      violations.push(`Anti-Pork Violation: Generated content contains prohibited swine/pork terms.`);
      break;
    }

    // 2.2 Veterinary diagnosis check
    if (VETERINARY_DIAGNOSIS_REGEX.test(block)) {
      violations.push(
        "Disease-Risk Boundary Violation: AI must not claim veterinary diagnosis or prescribe medical treatments. Only risk alerts are permitted."
      );
    }

    // 2.3 Food safety certification check
    if (FOOD_SAFETY_CERTIFICATION_REGEX.test(block)) {
      violations.push(
        "Food Safety Boundary Violation: AI must not certify food safety or claim products are officially food-safe."
      );
    }

    // 2.4 Halal certification check
    if (HALAL_CERTIFICATION_REGEX.test(block)) {
      violations.push(
        "Halal Certification Boundary Violation: AI cannot issue halal certifications or declare products officially halal."
      );
    }

    // 2.5 Route safety guarantee check
    if (ROUTE_SAFETY_GUARANTEE_REGEX.test(block)) {
      violations.push(
        "Security Intelligence Boundary Violation: AI must never guarantee physical or corridor safety. All security intelligence is advisory."
      );
    }

    // 2.6 Autonomous financial or livestock action check
    if (AUTONOMOUS_ACTION_REGEX.test(block)) {
      violations.push(
        "No-Autonomous-Action Violation: AI must not recommend or execute autonomous fund disbursements, payments, or livestock operations."
      );
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
