/**
 * AgroMarket Phase 3.10: Coordination Data Layer
 * Server-authoritative persistence for opportunities, requirements, participants,
 * commitments, and immutable coordination events with in-memory fallback for testing.
 */

import { createClient } from "@/lib/supabase/server";
import {
  CoordinationOpportunity,
  CoordinationRequirement,
  CoordinationParticipant,
  SupplyCommitment,
  CoordinationEvent,
  CommitmentEvidence,
  CoordinationOpportunityStatus,
  CoordinationCoverageStatus,
  SupplyCommitmentStatus,
  CommitmentReadinessStatus,
  QuantityReconciliationStatus,
  CommitmentFailureReason,
  EvidenceCategory,
  EvidenceProvenance,
  EvidenceReferenceType,
  CoordinationParticipantRole,
  CoordinationParticipantStatus,
  CoordinationRequirementType,
  CoordinationEventType,
} from "./types";
import { GovernanceDecision } from "@/features/intelligence-governance/types";
import { assertNoProhibitedProduceCoordination } from "./validation";
import { validateCommitmentCapacity } from "./calculations";

// -----------------------------------------------------------------------------
// IN-MEMORY FALLBACK STORE (Offline & Unit Testing)
// -----------------------------------------------------------------------------

const inMemoryOpportunities: CoordinationOpportunity[] = [];
const inMemoryRequirements: CoordinationRequirement[] = [];
const inMemoryParticipants: CoordinationParticipant[] = [];
const inMemoryCommitments: SupplyCommitment[] = [];
const inMemoryEvents: CoordinationEvent[] = [];
const inMemoryEvidence: CommitmentEvidence[] = [];

export function clearInMemoryCoordinationStore(): void {
  inMemoryOpportunities.length = 0;
  inMemoryRequirements.length = 0;
  inMemoryParticipants.length = 0;
  inMemoryCommitments.length = 0;
  inMemoryEvents.length = 0;
  inMemoryEvidence.length = 0;
}

export function seedInMemoryCoordinationStore(data: {
  opportunities?: CoordinationOpportunity[];
  requirements?: CoordinationRequirement[];
  participants?: CoordinationParticipant[];
  commitments?: SupplyCommitment[];
  events?: CoordinationEvent[];
  evidence?: CommitmentEvidence[];
}): void {
  if (data.opportunities) inMemoryOpportunities.push(...data.opportunities);
  if (data.requirements) inMemoryRequirements.push(...data.requirements);
  if (data.participants) inMemoryParticipants.push(...data.participants);
  if (data.commitments) inMemoryCommitments.push(...data.commitments);
  if (data.events) inMemoryEvents.push(...data.events);
  if (data.evidence) inMemoryEvidence.push(...data.evidence);
}

// -----------------------------------------------------------------------------
// 1. OPPORTUNITIES
// -----------------------------------------------------------------------------

export async function getCoordinationOpportunities(options?: {
  commodity?: string;
  targetState?: string;
  status?: string;
  limit?: number;
}): Promise<CoordinationOpportunity[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_coordination_opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    if (options?.commodity) query = query.ilike("commodity", `%${options.commodity}%`);
    if (options?.targetState) query = query.eq("target_state", options.targetState);
    if (options?.status) query = query.eq("status", options.status);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map(mapDbOpportunityToDomain);
    }
  } catch {
    // Fall back to in-memory store
  }

  let result = [...inMemoryOpportunities];
  if (options?.commodity) {
    result = result.filter((o) =>
      o.commodity.toLowerCase().includes(options.commodity!.toLowerCase())
    );
  }
  if (options?.targetState) {
    result = result.filter((o) => o.targetState === options.targetState);
  }
  if (options?.status) {
    result = result.filter((o) => o.status === options.status);
  }
  if (options?.limit) {
    result = result.slice(0, options.limit);
  }
  return result;
}

export async function getCoordinationOpportunityById(
  id: string
): Promise<CoordinationOpportunity | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_coordination_opportunities")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      return mapDbOpportunityToDomain(data);
    }
  } catch {
    // Fall back to in-memory store
  }

  return inMemoryOpportunities.find((o) => o.id === id) || null;
}

export async function saveCoordinationOpportunity(
  opportunity: CoordinationOpportunity
): Promise<boolean> {
  assertNoProhibitedProduceCoordination(opportunity.commodity, "Save Opportunity Commodity");
  assertNoProhibitedProduceCoordination(opportunity.title, "Save Opportunity Title");

  const idx = inMemoryOpportunities.findIndex((o) => o.id === opportunity.id);
  if (idx >= 0) {
    inMemoryOpportunities[idx] = opportunity;
  } else {
    inMemoryOpportunities.push(opportunity);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("agricultural_coordination_opportunities")
      .upsert({
        id: opportunity.id,
        creator_id: opportunity.creatorId,
        b2b_demand_id: opportunity.b2bDemandId ?? null,
        title: opportunity.title,
        commodity: opportunity.commodity,
        required_quantity: opportunity.requiredQuantity,
        unit: opportunity.unit,
        canonical_quantity_kg: opportunity.canonicalQuantityKg,
        accepted_quantity: opportunity.acceptedQuantity,
        fulfilled_quantity: opportunity.fulfilledQuantity,
        target_state: opportunity.targetState,
        target_lga: opportunity.targetLga,
        delivery_window_start: opportunity.deliveryWindowStart,
        delivery_window_end: opportunity.deliveryWindowEnd,
        quality_grade: opportunity.qualityGrade,
        processing_required: opportunity.processingRequired,
        processing_facility_id: opportunity.processingFacilityId ?? null,
        logistics_required: opportunity.logisticsRequired,
        status: opportunity.status,
        coverage_status: opportunity.coverageStatus,
        governance_decision: opportunity.governanceDecision,
        notes: opportunity.notes ?? null,
        metadata: opportunity.metadata || {},
        updated_at: opportunity.updatedAt,
      });

    return !error;
  } catch {
    return true; // Retained in-memory
  }
}

// -----------------------------------------------------------------------------
// 2. REQUIREMENTS
// -----------------------------------------------------------------------------

export async function getOpportunityRequirements(
  opportunityId: string
): Promise<CoordinationRequirement[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_coordination_requirements")
      .select("*")
      .eq("opportunity_id", opportunityId);

    if (!error && data && data.length > 0) {
      return data.map(mapDbRequirementToDomain);
    }
  } catch {
    // Fall back to memory
  }

  return inMemoryRequirements.filter((r) => r.opportunityId === opportunityId);
}

export async function saveCoordinationRequirement(
  req: CoordinationRequirement
): Promise<boolean> {
  const idx = inMemoryRequirements.findIndex((r) => r.id === req.id);
  if (idx >= 0) {
    inMemoryRequirements[idx] = req;
  } else {
    inMemoryRequirements.push(req);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("agricultural_coordination_requirements")
      .upsert({
        id: req.id,
        opportunity_id: req.opportunityId,
        requirement_type: req.requirementType,
        title: req.title,
        description: req.description ?? null,
        is_mandatory: req.isMandatory,
        parameters: req.parameters || {},
        updated_at: req.updatedAt,
      });
    return !error;
  } catch {
    return true;
  }
}

// -----------------------------------------------------------------------------
// 3. PARTICIPANTS
// -----------------------------------------------------------------------------

export async function getOpportunityParticipants(
  opportunityId: string
): Promise<CoordinationParticipant[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_coordination_participants")
      .select("*, profiles:user_id(display_name)")
      .eq("opportunity_id", opportunityId);

    if (!error && data && data.length > 0) {
      return data.map((d: Record<string, unknown>) => ({
        id: d.id as string,
        opportunityId: d.opportunity_id as string,
        userId: d.user_id as string,
        actorRole: d.actor_role as CoordinationParticipantRole,
        status: d.status as CoordinationParticipantStatus,
        joinedAt: d.joined_at as string,
        updatedAt: d.updated_at as string,
        metadata: (d.metadata as Record<string, unknown>) || {},
        displayName: (d.profiles as { display_name?: string } | undefined)?.display_name,
      }));
    }
  } catch {
    // Fall back to memory
  }

  return inMemoryParticipants.filter((p) => p.opportunityId === opportunityId);
}

export async function saveCoordinationParticipant(
  part: CoordinationParticipant
): Promise<boolean> {
  const idx = inMemoryParticipants.findIndex((p) => p.id === part.id);
  if (idx >= 0) {
    inMemoryParticipants[idx] = part;
  } else {
    inMemoryParticipants.push(part);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("agricultural_coordination_participants")
      .upsert({
        id: part.id,
        opportunity_id: part.opportunityId,
        user_id: part.userId,
        actor_role: part.actorRole,
        status: part.status,
        metadata: part.metadata || {},
        updated_at: part.updatedAt,
      });
    return !error;
  } catch {
    return true;
  }
}

// -----------------------------------------------------------------------------
// 4. SUPPLY COMMITMENTS
// -----------------------------------------------------------------------------

export async function getOpportunityCommitments(
  opportunityId: string
): Promise<SupplyCommitment[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_supply_commitments")
      .select("*, profiles:participant_id(display_name)")
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: Record<string, unknown>) => mapDbCommitmentToDomain(d));
    }
  } catch {
    // Fall back to memory
  }

  return inMemoryCommitments.filter((c) => c.opportunityId === opportunityId);
}

export async function getSupplyCommitmentById(
  id: string
): Promise<SupplyCommitment | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_supply_commitments")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      return mapDbCommitmentToDomain(data);
    }
  } catch {
    // Fall back to memory
  }

  return inMemoryCommitments.find((c) => c.id === id) || null;
}

export async function saveSupplyCommitment(
  commitment: SupplyCommitment
): Promise<boolean> {
  assertNoProhibitedProduceCoordination(commitment.commodity, "Save Commitment Commodity");

  const idx = inMemoryCommitments.findIndex((c) => c.id === commitment.id);
  if (idx >= 0) {
    inMemoryCommitments[idx] = commitment;
  } else {
    inMemoryCommitments.push(commitment);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("agricultural_supply_commitments")
      .upsert({
        id: commitment.id,
        opportunity_id: commitment.opportunityId,
        participant_id: commitment.participantId,
        production_output_id: commitment.productionOutputId ?? null,
        commodity: commitment.commodity,
        committed_quantity: commitment.committedQuantity,
        unit: commitment.unit,
        canonical_quantity_kg: commitment.canonicalQuantityKg,
        quality_grade: commitment.qualityGrade,
        availability_date: commitment.availabilityDate,
        location_state: commitment.locationState,
        location_lga: commitment.locationLga,
        status: commitment.status,
        rejection_reason: commitment.rejectionReason ?? null,
        notes: commitment.notes ?? null,
        governance_decision: commitment.governanceDecision,
        metadata: commitment.metadata || {},
        updated_at: commitment.updatedAt,
      });

    return !error;
  } catch {
    return true;
  }
}

// -----------------------------------------------------------------------------
// 5. ATOMIC ACCEPT COMMITMENT (PostgreSQL RPC or In-Memory Concurrency Safe)
// -----------------------------------------------------------------------------

export async function atomicAcceptSupplyCommitment(params: {
  commitmentId: string;
  coordinatorId: string;
}): Promise<{
  success: boolean;
  error?: string;
  code?: string;
  acceptedQuantityKg?: number;
  opportunityStatus?: string;
}> {
  const { commitmentId, coordinatorId } = params;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("atomic_accept_supply_commitment", {
      p_commitment_id: commitmentId,
      p_coordinator_id: coordinatorId,
    });

    if (!error && data) {
      if (data.success) {
        // Synchronize in-memory cache if present
        const c = inMemoryCommitments.find((x) => x.id === commitmentId);
        if (c) c.status = "ACCEPTED";
        const o = inMemoryOpportunities.find((x) => x.id === c?.opportunityId);
        if (o && data.accepted_quantity_kg != null) {
          o.acceptedQuantity = data.accepted_quantity_kg;
          o.status = data.opportunity_status;
        }
        return {
          success: true,
          acceptedQuantityKg: data.accepted_quantity_kg,
          opportunityStatus: data.opportunity_status,
        };
      }
      return { success: false, error: data.error, code: data.code };
    }
  } catch {
    // Fall through to in-memory atomic processing
  }

  // In-Memory atomic implementation for tests
  const commitment = inMemoryCommitments.find((c) => c.id === commitmentId);
  if (!commitment) {
    return { success: false, error: "Commitment not found." };
  }
  if (!["PROPOSED", "OFFERED"].includes(commitment.status)) {
    return {
      success: false,
      error: `Invalid commitment state for acceptance: ${commitment.status}`,
    };
  }

  const opportunity = inMemoryOpportunities.find((o) => o.id === commitment.opportunityId);
  if (!opportunity) {
    return { success: false, error: "Parent coordination opportunity not found." };
  }

  if (["CANCELLED", "EXPIRED", "COMPLETED"].includes(opportunity.status)) {
    return {
      success: false,
      error: `Cannot accept commitment on an inactive opportunity (${opportunity.status}).`,
    };
  }

  // Concurrency quantity verification
  const capacity = validateCommitmentCapacity({
    requiredQuantityKg: opportunity.canonicalQuantityKg,
    currentAcceptedQuantityKg: opportunity.acceptedQuantity,
    newCommitmentQuantityKg: commitment.canonicalQuantityKg,
  });

  if (!capacity.canAccept) {
    return {
      success: false,
      error: capacity.reason,
      code: "OVERCOMMITMENT_BLOCKED",
    };
  }

  commitment.status = "ACCEPTED";
  commitment.updatedAt = new Date().toISOString();

  opportunity.acceptedQuantity = capacity.resultingTotalKg;
  if (opportunity.acceptedQuantity >= opportunity.canonicalQuantityKg) {
    opportunity.status = "FULLY_COMMITTED";
    opportunity.coverageStatus = "FULLY_COVERED";
  } else {
    opportunity.status = "PARTIALLY_COMMITTED";
    opportunity.coverageStatus = "PARTIALLY_COVERED";
  }
  opportunity.updatedAt = new Date().toISOString();

  inMemoryEvents.push({
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    commitmentId: commitment.id,
    actorId: coordinatorId,
    eventType: "COMMITMENT_ACCEPTED",
    title: `Supply commitment accepted (${commitment.committedQuantity} ${commitment.unit})`,
    details: {
      accepted_kg: commitment.canonicalQuantityKg,
      new_total_accepted_kg: opportunity.acceptedQuantity,
      required_kg: opportunity.canonicalQuantityKg,
      opportunity_status: opportunity.status,
    },
    occurredAt: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
  });

  return {
    success: true,
    acceptedQuantityKg: opportunity.acceptedQuantity,
    opportunityStatus: opportunity.status,
  };
}

// -----------------------------------------------------------------------------
// 6. COORDINATION EVENTS
// -----------------------------------------------------------------------------

export async function recordCoordinationEvent(
  event: CoordinationEvent
): Promise<boolean> {
  assertNoProhibitedProduceCoordination(event.title, "Coordination Event Title");

  inMemoryEvents.push(event);

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("agricultural_coordination_events").insert({
      id: event.id,
      opportunity_id: event.opportunityId,
      commitment_id: event.commitmentId ?? null,
      actor_id: event.actorId,
      event_type: event.eventType,
      title: event.title,
      details: event.details || {},
      occurred_at: event.occurredAt,
    });
    return !error;
  } catch {
    return true;
  }
}

export async function getOpportunityEvents(
  opportunityId: string
): Promise<CoordinationEvent[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_coordination_events")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("occurred_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: Record<string, unknown>) => ({
        id: d.id as string,
        opportunityId: d.opportunity_id as string,
        commitmentId: d.commitment_id as string | null,
        actorId: d.actor_id as string,
        eventType: d.event_type as CoordinationEventType,
        title: d.title as string,
        details: (d.details as Record<string, unknown>) || {},
        occurredAt: d.occurred_at as string,
        recordedAt: d.recorded_at as string,
      }));
    }
  } catch {
    // Fall back to memory
  }

  return inMemoryEvents
    .filter((e) => e.opportunityId === opportunityId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

// -----------------------------------------------------------------------------
// DOMAIN MAPPERS
// -----------------------------------------------------------------------------

function mapDbOpportunityToDomain(d: Record<string, unknown>): CoordinationOpportunity {
  return {
    id: d.id as string,
    creatorId: d.creator_id as string,
    b2bDemandId: d.b2b_demand_id as string | null,
    title: d.title as string,
    commodity: d.commodity as string,
    requiredQuantity: Number(d.required_quantity),
    unit: d.unit as string,
    canonicalQuantityKg: Number(d.canonical_quantity_kg),
    acceptedQuantity: Number(d.accepted_quantity),
    fulfilledQuantity: Number(d.fulfilled_quantity),
    targetState: d.target_state as string,
    targetLga: d.target_lga as string,
    deliveryWindowStart: d.delivery_window_start as string,
    deliveryWindowEnd: d.delivery_window_end as string,
    qualityGrade: d.quality_grade as string,
    processingRequired: Boolean(d.processing_required),
    processingFacilityId: d.processing_facility_id as string | null,
    logisticsRequired: Boolean(d.logistics_required),
    status: d.status as CoordinationOpportunityStatus,
    coverageStatus: d.coverage_status as CoordinationCoverageStatus,
    governanceDecision: d.governance_decision as GovernanceDecision,
    notes: d.notes as string | null,
    metadata: (d.metadata as Record<string, unknown>) || {},
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
  };
}

function mapDbRequirementToDomain(d: Record<string, unknown>): CoordinationRequirement {
  return {
    id: d.id as string,
    opportunityId: d.opportunity_id as string,
    requirementType: d.requirement_type as CoordinationRequirementType,
    title: d.title as string,
    description: d.description as string | null,
    isMandatory: Boolean(d.is_mandatory),
    parameters: (d.parameters as Record<string, unknown>) || {},
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
  };
}

function mapDbCommitmentToDomain(d: Record<string, unknown>): SupplyCommitment {
  return {
    id: d.id as string,
    opportunityId: d.opportunity_id as string,
    participantId: d.participant_id as string,
    productionOutputId: d.production_output_id as string | null,
    commodity: d.commodity as string,
    committedQuantity: Number(d.committed_quantity),
    unit: d.unit as string,
    canonicalQuantityKg: Number(d.canonical_quantity_kg),
    qualityGrade: d.quality_grade as string,
    availabilityDate: d.availability_date as string,
    locationState: d.location_state as string,
    locationLga: d.location_lga as string,
    status: d.status as SupplyCommitmentStatus,
    rejectionReason: d.rejection_reason as string | null,
    notes: d.notes as string | null,
    governanceDecision: d.governance_decision as GovernanceDecision,
    metadata: (d.metadata as Record<string, unknown>) || {},
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
    readinessStatus: (d.readiness_status as CommitmentReadinessStatus) || "NOT_READY",
    confirmedQuantity: d.confirmed_quantity != null ? Number(d.confirmed_quantity) : null,
    fulfilledQuantity: Number(d.fulfilled_quantity || 0),
    remainingQuantity: Number(d.remaining_quantity != null ? d.remaining_quantity : d.committed_quantity),
    reconciliationStatus: (d.reconciliation_status as QuantityReconciliationStatus) || "PENDING",
    reconciledAt: d.reconciled_at as string | null,
    reconciledBy: d.reconciled_by as string | null,
    failureReason: d.failure_reason as CommitmentFailureReason | null,
    disputeId: d.dispute_id as string | null,
  };
}

function mapDbEvidenceToDomain(d: Record<string, unknown>): CommitmentEvidence {
  return {
    id: d.id as string,
    commitmentId: d.commitment_id as string,
    opportunityId: d.opportunity_id as string,
    submittedBy: d.submitted_by as string,
    evidenceCategory: d.evidence_category as EvidenceCategory,
    provenance: d.provenance as EvidenceProvenance,
    quantityObserved: d.quantity_observed != null ? Number(d.quantity_observed) : null,
    unit: d.unit as string | null,
    referenceId: d.reference_id as string | null,
    referenceType: d.reference_type as EvidenceReferenceType | null,
    notes: d.notes as string | null,
    metadata: (d.metadata as Record<string, unknown>) || {},
    createdAt: d.created_at as string,
    submitterDisplayName: (d.profiles as { display_name?: string } | undefined)?.display_name,
  };
}

// -----------------------------------------------------------------------------
// 6. PHASE 3.11: EVIDENCE PERSISTENCE & ATOMIC FULFILMENT
// -----------------------------------------------------------------------------

export async function saveCommitmentEvidence(
  evidence: CommitmentEvidence
): Promise<CommitmentEvidence> {
  if (evidence.notes) {
    assertNoProhibitedProduceCoordination(evidence.notes, "Evidence Notes");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_commitment_evidence")
      .insert({
        id: evidence.id,
        commitment_id: evidence.commitmentId,
        opportunity_id: evidence.opportunityId,
        submitted_by: evidence.submittedBy,
        evidence_category: evidence.evidenceCategory,
        provenance: evidence.provenance,
        quantity_observed: evidence.quantityObserved ?? null,
        unit: evidence.unit ?? null,
        reference_id: evidence.referenceId ?? null,
        reference_type: evidence.referenceType ?? null,
        notes: evidence.notes ?? null,
        metadata: evidence.metadata || {},
        created_at: evidence.createdAt,
      })
      .select("*, profiles:submitted_by(display_name)")
      .single();

    if (!error && data) {
      return mapDbEvidenceToDomain(data);
    }
  } catch {
    // Fall back to memory
  }

  inMemoryEvidence.push(evidence);
  return evidence;
}

export async function getEvidenceForCommitment(
  commitmentId: string
): Promise<CommitmentEvidence[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_commitment_evidence")
      .select("*, profiles:submitted_by(display_name)")
      .eq("commitment_id", commitmentId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: Record<string, unknown>) => mapDbEvidenceToDomain(d));
    }
  } catch {
    // Fall back to memory
  }

  return inMemoryEvidence.filter((e) => e.commitmentId === commitmentId);
}

export async function getEvidenceForOpportunity(
  opportunityId: string
): Promise<CommitmentEvidence[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_commitment_evidence")
      .select("*, profiles:submitted_by(display_name)")
      .eq("opportunity_id", opportunityId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: Record<string, unknown>) => mapDbEvidenceToDomain(d));
    }
  } catch {
    // Fall back to memory
  }

  return inMemoryEvidence.filter((e) => e.opportunityId === opportunityId);
}

export async function atomicRecordCommitmentFulfilment(params: {
  commitmentId: string;
  actorId: string;
  fulfilledQuantity: number;
  evidenceCategory: EvidenceCategory;
  provenance: EvidenceProvenance;
  notes?: string;
  referenceId?: string;
  referenceType?: EvidenceReferenceType;
  failureReason?: CommitmentFailureReason;
}): Promise<{
  success: boolean;
  commitmentId?: string;
  opportunityId?: string;
  fulfilledQuantity?: number;
  remainingQuantity?: number;
  reconciliationStatus?: QuantityReconciliationStatus;
  commitmentStatus?: SupplyCommitmentStatus;
  readinessStatus?: CommitmentReadinessStatus;
  error?: string;
  code?: string;
  message?: string;
}> {
  const {
    commitmentId,
    actorId,
    fulfilledQuantity,
    evidenceCategory,
    provenance,
    notes,
    referenceId,
    referenceType,
    failureReason,
  } = params;

  if (notes) {
    assertNoProhibitedProduceCoordination(notes, "Fulfilment Notes");
  }

  // 1. Try Supabase RPC
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("atomic_record_commitment_fulfilment", {
      p_commitment_id: commitmentId,
      p_actor_id: actorId,
      p_fulfilled_quantity: fulfilledQuantity,
      p_evidence_category: evidenceCategory,
      p_provenance: provenance,
      p_notes: notes || null,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
      p_failure_reason: failureReason || null,
    });

    if (!error && data) {
      if (data.success) {
        return {
          success: true,
          commitmentId: data.commitment_id,
          opportunityId: data.opportunity_id,
          fulfilledQuantity: data.fulfilled_quantity,
          remainingQuantity: data.remaining_quantity,
          reconciliationStatus: data.reconciliation_status,
          commitmentStatus: data.commitment_status,
          readinessStatus: data.readiness_status,
        };
      }
      return {
        success: false,
        error: data.message || data.error,
        code: data.error,
      };
    }
  } catch {
    // Fall through to in-memory atomic processing
  }

  // 2. In-Memory fallback for tests and offline execution
  const commitment = inMemoryCommitments.find((c) => c.id === commitmentId);
  if (!commitment) {
    return { success: false, error: "Commitment not found." };
  }

  if (
    !["ACCEPTED", "CONFIRMED", "FULFILMENT_PENDING", "PARTIALLY_FULFILLED"].includes(
      commitment.status
    )
  ) {
    return {
      success: false,
      error: `Invalid commitment state for fulfilment: ${commitment.status}`,
    };
  }

  const opportunity = inMemoryOpportunities.find((o) => o.id === commitment.opportunityId);
  if (!opportunity) {
    return { success: false, error: "Parent coordination opportunity not found." };
  }

  if (fulfilledQuantity < 0) {
    return { success: false, error: "Fulfilled quantity cannot be negative." };
  }

  const newFulfilled = (commitment.fulfilledQuantity || 0) + fulfilledQuantity;
  if (newFulfilled > commitment.committedQuantity) {
    inMemoryEvents.push({
      id: crypto.randomUUID(),
      opportunityId: opportunity.id,
      commitmentId: commitment.id,
      actorId,
      eventType: "CONCURRENCY_BLOCKED",
      title: "Fulfilment exceeds committed quantity",
      details: {
        attempted_quantity: fulfilledQuantity,
        current_fulfilled: commitment.fulfilledQuantity,
        committed_quantity: commitment.committedQuantity,
      },
      occurredAt: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
    });

    return {
      success: false,
      error: "Fulfilment would exceed committed quantity",
      code: "OVER_FULFILLED_BLOCKED",
    };
  }

  const remaining = Number((commitment.committedQuantity - newFulfilled).toFixed(2));
  let recStatus: QuantityReconciliationStatus = "PENDING";
  let newCommitmentStatus: SupplyCommitmentStatus = commitment.status;
  let newReadinessStatus: CommitmentReadinessStatus = commitment.readinessStatus;

  if (remaining === 0) {
    recStatus = "EXACT";
    newCommitmentStatus = "FULFILLED";
    newReadinessStatus = "FULFILLED";
  } else if (newFulfilled > 0 && failureReason) {
    recStatus = "UNDER_FULFILLED";
    newCommitmentStatus = "FAILED";
    newReadinessStatus = "PARTIALLY_FULFILLED";
  } else if (newFulfilled > 0) {
    recStatus = "UNDER_FULFILLED";
    newCommitmentStatus = "FULFILMENT_PENDING";
    newReadinessStatus = "PARTIALLY_FULFILLED";
  } else if (failureReason) {
    recStatus = "NO_FULFILMENT";
    newCommitmentStatus = "FAILED";
    newReadinessStatus = "FAILED";
  }

  commitment.fulfilledQuantity = newFulfilled;
  commitment.remainingQuantity = remaining;
  commitment.status = newCommitmentStatus;
  commitment.readinessStatus = newReadinessStatus;
  commitment.reconciliationStatus = recStatus;
  commitment.reconciledAt = new Date().toISOString();
  commitment.reconciledBy = actorId;
  if (failureReason) {
    commitment.failureReason = failureReason;
  }
  commitment.updatedAt = new Date().toISOString();

  // Opportunity update
  const newOppFulfilled = (opportunity.fulfilledQuantity || 0) + fulfilledQuantity;
  opportunity.fulfilledQuantity = newOppFulfilled;
  if (newOppFulfilled >= opportunity.requiredQuantity) {
    opportunity.status = "COMPLETED";
  } else if (
    ["OPEN", "COORDINATING", "PARTIALLY_COMMITTED", "FULLY_COMMITTED"].includes(
      opportunity.status
    ) &&
    newOppFulfilled > 0
  ) {
    opportunity.status = "IN_FULFILMENT";
  }
  opportunity.updatedAt = new Date().toISOString();

  // Evidence record
  const evidenceRecord: CommitmentEvidence = {
    id: crypto.randomUUID(),
    commitmentId: commitment.id,
    opportunityId: opportunity.id,
    submittedBy: actorId,
    evidenceCategory,
    provenance,
    quantityObserved: fulfilledQuantity,
    unit: commitment.unit,
    referenceId,
    referenceType,
    notes: notes || null,
    metadata: { recorded_in_memory: true },
    createdAt: new Date().toISOString(),
  };
  inMemoryEvidence.push(evidenceRecord);

  // Coordination event
  inMemoryEvents.push({
    id: crypto.randomUUID(),
    opportunityId: opportunity.id,
    commitmentId: commitment.id,
    actorId,
    eventType: "FULFILMENT_RECORDED",
    title: `Fulfilment of ${fulfilledQuantity} ${commitment.unit} recorded`,
    details: {
      fulfilled_quantity: fulfilledQuantity,
      total_fulfilled: newFulfilled,
      remaining_quantity: remaining,
      reconciliation_status: recStatus,
      evidence_id: evidenceRecord.id,
      evidence_category: evidenceCategory,
      provenance,
      failure_reason: failureReason,
    },
    occurredAt: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
  });

  return {
    success: true,
    commitmentId: commitment.id,
    opportunityId: opportunity.id,
    fulfilledQuantity: newFulfilled,
    remainingQuantity: remaining,
    reconciliationStatus: recStatus,
    commitmentStatus: newCommitmentStatus,
    readinessStatus: newReadinessStatus,
  };
}

