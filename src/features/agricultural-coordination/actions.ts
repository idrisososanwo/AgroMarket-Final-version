"use server";

/**
 * AgroMarket Phase 3.10: Agricultural Coordination Server Actions
 * Governed server-authoritative mutations for coordination opportunities,
 * supply commitments, state transitions, and concurrency safeguards.
 */

import { getCurrentUser } from "@/lib/auth/server";
import {
  createOpportunityInputSchema,
  offerSupplyCommitmentInputSchema,
  acceptSupplyCommitmentInputSchema,
  withdrawSupplyCommitmentInputSchema,
  confirmSupplyCommitmentInputSchema,
  recordFulfilmentInputSchema,
  cancelOpportunityInputSchema,
  assertNoProhibitedProduceCoordination,
  resolveCanonicalQuantityKg,
} from "./validation";
import {
  validateOpportunityTransition,
  validateCommitmentTransition,
} from "./state-machine";
import {
  CoordinationOpportunity,
  SupplyCommitment,
} from "./types";
import {
  getCoordinationOpportunityById,
  saveCoordinationOpportunity,
  getSupplyCommitmentById,
  saveSupplyCommitment,
  saveCoordinationParticipant,
  recordCoordinationEvent,
  atomicAcceptSupplyCommitment,
} from "./data-layer";
import { evaluateGovernancePolicy } from "@/features/intelligence-governance/policy-engine";
import { ActorRole } from "@/features/decision-intelligence/types";

export interface CoordinationActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Server Action: Creates a new Coordination Opportunity.
 */
export async function createCoordinationOpportunityAction(
  rawInput: unknown
): Promise<CoordinationActionResult<CoordinationOpportunity>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Please log in to create a coordination opportunity." };
  }

  const parseResult = createOpportunityInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors.map((e) => e.message).join(", "),
    };
  }

  const input = parseResult.data;

  // 1. Anti-Pork Invariant Assertion
  try {
    assertNoProhibitedProduceCoordination(input.commodity, "Create Opportunity Commodity");
    assertNoProhibitedProduceCoordination(input.title, "Create Opportunity Title");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message, code: "ANTI_PORK_VIOLATION" };
  }

  // 2. Unit Normalization to Canonical KG
  let canonicalKg: number;
  try {
    const res = resolveCanonicalQuantityKg(input.requiredQuantity, input.unit);
    canonicalKg = res.canonicalKg;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message, code: "INCOMPATIBLE_UNIT" };
  }

  // 3. Phase 3.8 Governance Evaluation
  const governanceEval = evaluateGovernancePolicy({
    agentId: "AGRICULTURAL_ORCHESTRATION_AGENT",
    domain: "COORDINATION",
    actionIntent: "VIEW_COORDINATION_OPPORTUNITY",
    actorRole: (user.roles[0] as ActorRole) || "BUYER",
    commodity: input.commodity,
    state: input.targetState,
    lga: input.targetLga,
  });

  if (governanceEval.decision === "DENY") {
    return {
      success: false,
      error: `Governance Policy Block: Coordination request denied by safety policy (${governanceEval.reasons.join("; ")}).`,
      code: "GOVERNANCE_DENIED",
    };
  }

  const now = new Date().toISOString();
  const opportunity: CoordinationOpportunity = {
    id: crypto.randomUUID(),
    creatorId: user.id,
    b2bDemandId: input.b2bDemandId ?? null,
    title: input.title,
    commodity: input.commodity,
    requiredQuantity: input.requiredQuantity,
    unit: input.unit.toUpperCase(),
    canonicalQuantityKg: canonicalKg,
    acceptedQuantity: 0,
    fulfilledQuantity: 0,
    targetState: input.targetState,
    targetLga: input.targetLga,
    deliveryWindowStart: input.deliveryWindowStart,
    deliveryWindowEnd: input.deliveryWindowEnd,
    qualityGrade: input.qualityGrade || "STANDARD",
    processingRequired: Boolean(input.processingRequired),
    processingFacilityId: input.processingFacilityId ?? null,
    logisticsRequired: Boolean(input.logisticsRequired),
    status: "OPEN",
    coverageStatus: "NO_COVERAGE",
    governanceDecision: governanceEval.decision,
    notes: input.notes ?? null,
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  await saveCoordinationOpportunity(opportunity);

  // Auto-register creator as participant
  await saveCoordinationParticipant({
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    userId: user.id,
    actorRole: user.roles.includes("ADMIN") ? "COORDINATOR" : "BUYER",
    status: "ACTIVE",
    joinedAt: now,
    updatedAt: now,
  });

  // Record immutable creation event
  await recordCoordinationEvent({
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    actorId: user.id,
    eventType: "OPPORTUNITY_CREATED",
    title: `Coordination opportunity opened: ${opportunity.title}`,
    details: {
      commodity: opportunity.commodity,
      required_quantity: opportunity.requiredQuantity,
      unit: opportunity.unit,
      canonical_kg: canonicalKg,
      target_state: opportunity.targetState,
    },
    occurredAt: now,
    recordedAt: now,
  });

  return { success: true, data: opportunity };
}

/**
 * Server Action: Offers a supply commitment against an open coordination opportunity.
 */
export async function offerSupplyCommitmentAction(
  rawInput: unknown
): Promise<CoordinationActionResult<SupplyCommitment>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Please log in to offer a supply commitment." };
  }

  const parseResult = offerSupplyCommitmentInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors.map((e) => e.message).join(", "),
    };
  }

  const input = parseResult.data;

  // 1. Anti-Pork Check
  try {
    assertNoProhibitedProduceCoordination(input.commodity, "Offer Commitment Commodity");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message, code: "ANTI_PORK_VIOLATION" };
  }

  // 2. Fetch parent opportunity
  const opportunity = await getCoordinationOpportunityById(input.opportunityId);
  if (!opportunity) {
    return { success: false, error: "Coordination opportunity not found." };
  }

  if (["COMPLETED", "CANCELLED", "EXPIRED"].includes(opportunity.status)) {
    return {
      success: false,
      error: `Cannot offer supply to an opportunity that is ${opportunity.status.toLowerCase()}.`,
    };
  }

  // 3. Resolve canonical KG
  let canonicalKg: number;
  try {
    const res = resolveCanonicalQuantityKg(input.committedQuantity, input.unit);
    canonicalKg = res.canonicalKg;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message, code: "INCOMPATIBLE_UNIT" };
  }

  // 4. Governance Safety Check
  const governanceEval = evaluateGovernancePolicy({
    agentId: "SUPPLY_MATCHING_AGENT",
    domain: "COORDINATION",
    actionIntent: "VIEW_SUPPLY_OPTIONS",
    actorRole: (user.roles[0] as ActorRole) || "FARMER",
    commodity: input.commodity,
    state: input.locationState,
    lga: input.locationLga,
  });

  if (governanceEval.decision === "DENY") {
    return {
      success: false,
      error: `Governance Policy Block: Supply offer denied (${governanceEval.reasons.join("; ")}).`,
      code: "GOVERNANCE_DENIED",
    };
  }

  const now = new Date().toISOString();
  const commitment: SupplyCommitment = {
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    participantId: user.id,
    productionOutputId: input.productionOutputId ?? null,
    commodity: input.commodity,
    committedQuantity: input.committedQuantity,
    unit: input.unit.toUpperCase(),
    canonicalQuantityKg: canonicalKg,
    qualityGrade: input.qualityGrade || "STANDARD",
    availabilityDate: input.availabilityDate,
    locationState: input.locationState,
    locationLga: input.locationLga,
    status: "OFFERED",
    governanceDecision: governanceEval.decision,
    notes: input.notes ?? null,
    metadata: input.metadata || {},
    createdAt: now,
    updatedAt: now,
  };

  await saveSupplyCommitment(commitment);

  // Register producer as participant if not already registered
  await saveCoordinationParticipant({
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    userId: user.id,
    actorRole: user.roles.includes("FARMER") ? "FARMER" : "PRODUCER",
    status: "ACTIVE",
    joinedAt: now,
    updatedAt: now,
  });

  // Record audit event
  await recordCoordinationEvent({
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    commitmentId: commitment.id,
    actorId: user.id,
    eventType: "COMMITMENT_OFFERED",
    title: `Supply offered: ${commitment.committedQuantity} ${commitment.unit} of ${commitment.commodity}`,
    details: {
      canonical_kg: canonicalKg,
      availability_date: commitment.availabilityDate,
      location_state: commitment.locationState,
    },
    occurredAt: now,
    recordedAt: now,
  });

  return { success: true, data: commitment };
}

/**
 * Server Action: Accepts a supply commitment atomically, preventing overcommitment and race conditions.
 */
export async function acceptSupplyCommitmentAction(
  rawInput: unknown
): Promise<CoordinationActionResult<{ acceptedQuantityKg: number; opportunityStatus: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Please log in." };
  }

  const parseResult = acceptSupplyCommitmentInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors.map((e) => e.message).join(", "),
    };
  }

  const input = parseResult.data;
  const commitment = await getSupplyCommitmentById(input.commitmentId);
  if (!commitment) {
    return { success: false, error: "Commitment not found." };
  }

  const opportunity = await getCoordinationOpportunityById(commitment.opportunityId);
  if (!opportunity) {
    return { success: false, error: "Coordination opportunity not found." };
  }

  // Authorization check: Only opportunity creator or admin can accept
  if (opportunity.creatorId !== user.id && !user.roles.includes("ADMIN")) {
    return {
      success: false,
      error: "Unauthorized: Only the coordination creator or administrator can accept supply commitments.",
    };
  }

  // State machine check
  try {
    validateCommitmentTransition(commitment.status, "ACCEPTED");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }

  // Governance re-evaluation before consequential acceptance
  const governanceEval = evaluateGovernancePolicy({
    agentId: "AGRICULTURAL_ORCHESTRATION_AGENT",
    domain: "COORDINATION",
    actionIntent: "REVIEW_RECOMMENDATION",
    actorRole: (user.roles[0] as ActorRole) || "COORDINATOR",
    commodity: opportunity.commodity,
    state: opportunity.targetState,
  });

  if (governanceEval.decision === "DENY") {
    return {
      success: false,
      error: `Governance Policy Block: Acceptance prevented by policy (${governanceEval.reasons.join("; ")}).`,
      code: "GOVERNANCE_DENIED",
    };
  }

  // Atomic acceptance via PostgreSQL RPC (with row-lock) or atomic in-memory fallback
  const result = await atomicAcceptSupplyCommitment({
    commitmentId: commitment.id,
    coordinatorId: user.id,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      code: result.code || "ACCEPTANCE_FAILED",
    };
  }

  return {
    success: true,
    data: {
      acceptedQuantityKg: result.acceptedQuantityKg!,
      opportunityStatus: result.opportunityStatus!,
    },
  };
}

/**
 * Server Action: Withdraws a supply commitment by the offering participant.
 */
export async function withdrawSupplyCommitmentAction(
  rawInput: unknown
): Promise<CoordinationActionResult<SupplyCommitment>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Please log in." };
  }

  const parseResult = withdrawSupplyCommitmentInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors.map((e) => e.message).join(", ") };
  }

  const input = parseResult.data;
  const commitment = await getSupplyCommitmentById(input.commitmentId);
  if (!commitment) {
    return { success: false, error: "Commitment not found." };
  }

  if (commitment.participantId !== user.id && !user.roles.includes("ADMIN")) {
    return { success: false, error: "Unauthorized: Only the commitment owner or admin may withdraw." };
  }

  try {
    validateCommitmentTransition(commitment.status, "WITHDRAWN");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }

  const wasAccepted = commitment.status === "ACCEPTED";
  commitment.status = "WITHDRAWN";
  commitment.notes = input.reason;
  commitment.updatedAt = new Date().toISOString();

  await saveSupplyCommitment(commitment);

  // If was accepted, adjust opportunity accepted quantity
  if (wasAccepted) {
    const opportunity = await getCoordinationOpportunityById(commitment.opportunityId);
    if (opportunity) {
      opportunity.acceptedQuantity = Math.max(
        0,
        opportunity.acceptedQuantity - commitment.canonicalQuantityKg
      );
      if (opportunity.acceptedQuantity >= opportunity.canonicalQuantityKg) {
        opportunity.status = "FULLY_COMMITTED";
        opportunity.coverageStatus = "FULLY_COVERED";
      } else if (opportunity.acceptedQuantity > 0) {
        opportunity.status = "PARTIALLY_COMMITTED";
        opportunity.coverageStatus = "PARTIALLY_COVERED";
      } else {
        opportunity.status = "OPEN";
        opportunity.coverageStatus = "NO_COVERAGE";
      }
      opportunity.updatedAt = new Date().toISOString();
      await saveCoordinationOpportunity(opportunity);
    }
  }

  await recordCoordinationEvent({
    id: crypto.randomUUID(),
    opportunityId: commitment.opportunityId,
    commitmentId: commitment.id,
    actorId: user.id,
    eventType: "COMMITMENT_WITHDRAWN",
    title: `Commitment withdrawn by producer`,
    details: { reason: input.reason },
    occurredAt: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
  });

  return { success: true, data: commitment };
}

/**
 * Server Action: Confirms an accepted commitment for fulfilment scheduling.
 */
export async function confirmSupplyCommitmentAction(
  rawInput: unknown
): Promise<CoordinationActionResult<SupplyCommitment>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Please log in." };
  }

  const parseResult = confirmSupplyCommitmentInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors.map((e) => e.message).join(", ") };
  }

  const input = parseResult.data;
  const commitment = await getSupplyCommitmentById(input.commitmentId);
  if (!commitment) {
    return { success: false, error: "Commitment not found." };
  }

  if (commitment.participantId !== user.id && !user.roles.includes("ADMIN")) {
    return { success: false, error: "Unauthorized: Only the commitment owner or admin may confirm readiness." };
  }

  try {
    validateCommitmentTransition(commitment.status, "CONFIRMED");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }

  commitment.status = "CONFIRMED";
  if (input.notes) commitment.notes = input.notes;
  commitment.updatedAt = new Date().toISOString();

  await saveSupplyCommitment(commitment);

  await recordCoordinationEvent({
    id: crypto.randomUUID(),
    opportunityId: commitment.opportunityId,
    commitmentId: commitment.id,
    actorId: user.id,
    eventType: "COMMITMENT_CONFIRMED",
    title: `Commitment readiness confirmed by producer`,
    details: { notes: input.notes },
    occurredAt: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
  });

  return { success: true, data: commitment };
}

/**
 * Server Action: Records physical fulfillment against an accepted/confirmed commitment.
 */
export async function recordFulfilmentAction(
  rawInput: unknown
): Promise<CoordinationActionResult<SupplyCommitment>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Please log in." };
  }

  const parseResult = recordFulfilmentInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors.map((e) => e.message).join(", ") };
  }

  const input = parseResult.data;
  const commitment = await getSupplyCommitmentById(input.commitmentId);
  if (!commitment) {
    return { success: false, error: "Commitment not found." };
  }

  const opportunity = await getCoordinationOpportunityById(commitment.opportunityId);
  if (!opportunity) {
    return { success: false, error: "Opportunity not found." };
  }

  // Only coordinator or admin can verify physical fulfillment receipt
  if (opportunity.creatorId !== user.id && !user.roles.includes("ADMIN")) {
    return { success: false, error: "Unauthorized: Only the opportunity coordinator can record fulfillment." };
  }

  let fulfilledKg: number;
  try {
    const res = resolveCanonicalQuantityKg(input.fulfilledQuantity, input.fulfilledUnit);
    fulfilledKg = res.canonicalKg;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }

  commitment.status = "FULFILLED";
  commitment.updatedAt = new Date().toISOString();
  await saveSupplyCommitment(commitment);

  opportunity.fulfilledQuantity += fulfilledKg;
  if (opportunity.fulfilledQuantity >= opportunity.canonicalQuantityKg) {
    opportunity.status = "COMPLETED";
  } else {
    opportunity.status = "IN_FULFILMENT";
  }
  opportunity.updatedAt = new Date().toISOString();
  await saveCoordinationOpportunity(opportunity);

  await recordCoordinationEvent({
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    commitmentId: commitment.id,
    actorId: user.id,
    eventType: "FULFILMENT_RECORDED",
    title: `Physical fulfillment recorded: ${input.fulfilledQuantity} ${input.fulfilledUnit}`,
    details: {
      fulfilled_kg: fulfilledKg,
      total_opportunity_fulfilled_kg: opportunity.fulfilledQuantity,
      notes: input.notes,
    },
    occurredAt: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
  });

  return { success: true, data: commitment };
}

/**
 * Server Action: Cancels a coordination opportunity.
 */
export async function cancelCoordinationOpportunityAction(
  rawInput: unknown
): Promise<CoordinationActionResult<CoordinationOpportunity>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized: Please log in." };
  }

  const parseResult = cancelOpportunityInputSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors.map((e) => e.message).join(", ") };
  }

  const input = parseResult.data;
  const opportunity = await getCoordinationOpportunityById(input.opportunityId);
  if (!opportunity) {
    return { success: false, error: "Opportunity not found." };
  }

  if (opportunity.creatorId !== user.id && !user.roles.includes("ADMIN")) {
    return { success: false, error: "Unauthorized: Only coordinator or admin can cancel." };
  }

  try {
    validateOpportunityTransition(opportunity.status, "CANCELLED");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }

  opportunity.status = "CANCELLED";
  opportunity.notes = input.reason;
  opportunity.updatedAt = new Date().toISOString();
  await saveCoordinationOpportunity(opportunity);

  await recordCoordinationEvent({
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    actorId: user.id,
    eventType: "OPPORTUNITY_STATUS_CHANGED",
    title: `Coordination cancelled: ${input.reason}`,
    details: { reason: input.reason },
    occurredAt: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
  });

  return { success: true, data: opportunity };
}
