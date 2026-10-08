/**
 * AgroMarket Phase 3.8: Governance Override Engine
 * Handles strictly audited, role-authorized administrative overrides of policy denials.
 * Ordinary users and AI models can never override governance policy.
 */

import {
  CreateOverrideInput,
  GovernanceOverrideRecord,
  OVERRIDE_ROLES,
} from "./types";
import { CURRENT_GOVERNANCE_POLICY_VERSION } from "./constants";
import {
  assertNoProhibitedProduce,
  assertNoPrivateInformation,
  sanitizeGovernanceText,
} from "./validation";

/**
 * Creates an immutable, auditable administrative governance override.
 */
export function createGovernanceOverride(input: CreateOverrideInput): GovernanceOverrideRecord {
  // 1. Role Authorization Check: Only ADMIN or PLATFORM_COORDINATOR can override
  if (!OVERRIDE_ROLES.includes(input.overrideRole)) {
    throw new Error(
      `Unauthorized Override Attempt: Role '${input.overrideRole}' is not permitted to override governance policies.`
    );
  }

  // 2. Invariants Check: Anti-pork & Privacy
  assertNoProhibitedProduce(input.reason, "Governance Override Reason");
  assertNoProhibitedProduce(input.metadata, "Governance Override Metadata");
  assertNoPrivateInformation(input.reason, "Governance Override Reason");
  assertNoPrivateInformation(input.metadata, "Governance Override Metadata");

  const cleanReason = sanitizeGovernanceText(input.reason, "override reason");

  if (cleanReason.length < 15) {
    throw new Error(
      "Substantive Reason Required: Governance overrides require a detailed explanation (minimum 15 characters)."
    );
  }

  return {
    id: crypto.randomUUID(),
    evaluationId: input.evaluationId,
    overrideById: input.overrideById,
    overrideRole: input.overrideRole,
    originalDecision: input.originalDecision,
    overrideDecision: input.overrideDecision,
    reason: cleanReason,
    policyVersion: CURRENT_GOVERNANCE_POLICY_VERSION,
    overriddenPolicyRules: input.overriddenPolicyRules || [],
    metadata: input.metadata || {},
    createdAt: new Date().toISOString(),
  };
}
