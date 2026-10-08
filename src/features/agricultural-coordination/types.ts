/**
-- ==============================================================================
-- AGROMARKET PHASE 3.10: MULTI-PARTY AGRICULTURAL COORDINATION & SUPPLY COMMITMENT
-- Domain Contracts, Lifecycles, Quantity Accounting, and Safety Models
-- ==============================================================================
 */

import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { GovernanceDecision } from "@/features/intelligence-governance/types";

export type NigerianState = (typeof NIGERIAN_STATES)[number];

// -----------------------------------------------------------------------------
// 1. LIFECYCLE STATES & ENUMS
// -----------------------------------------------------------------------------

export const COORDINATION_OPPORTUNITY_STATUSES = [
  "DRAFT",
  "OPEN",
  "COORDINATING",
  "PARTIALLY_COMMITTED",
  "FULLY_COMMITTED",
  "IN_FULFILMENT",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "CONSTRAINED",
] as const;
export type CoordinationOpportunityStatus = (typeof COORDINATION_OPPORTUNITY_STATUSES)[number];

export const SUPPLY_COMMITMENT_STATUSES = [
  "PROPOSED",
  "OFFERED",
  "ACCEPTED",
  "CONFIRMED",
  "FULFILMENT_PENDING",
  "FULFILLED",
  "WITHDRAWN",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "FAILED",
] as const;
export type SupplyCommitmentStatus = (typeof SUPPLY_COMMITMENT_STATUSES)[number];

export const COORDINATION_COVERAGE_STATUSES = [
  "NO_COVERAGE",
  "PARTIALLY_COVERED",
  "FULLY_COVERED",
  "OVER_COMMITTED_BLOCKED",
  "INSUFFICIENT_DATA",
] as const;
export type CoordinationCoverageStatus = (typeof COORDINATION_COVERAGE_STATUSES)[number];

export const COORDINATION_REQUIREMENT_TYPES = [
  "COMMODITY_SPECIFICATION",
  "QUALITY_GRADE",
  "MAX_MOISTURE_CONTENT",
  "PACKAGING_TYPE",
  "SANITARY_INSPECTION",
  "HALAL_CERTIFICATION",
  "PROCESSING_SPECIFICATION",
  "COLD_CHAIN_REQUIRED",
  "MINIMUM_LOT_SIZE",
  "DELIVERY_WINDOW",
] as const;
export type CoordinationRequirementType = (typeof COORDINATION_REQUIREMENT_TYPES)[number];

export const COORDINATION_PARTICIPANT_ROLES = [
  "BUYER",
  "COORDINATOR",
  "FARMER",
  "PRODUCER",
  "AGGREGATOR",
  "PROCESSOR",
  "LOGISTICS_PROVIDER",
  "EQUIPMENT_OWNER",
  "SERVICE_PROVIDER",
] as const;
export type CoordinationParticipantRole = (typeof COORDINATION_PARTICIPANT_ROLES)[number];

export const COORDINATION_PARTICIPANT_STATUSES = [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "WITHDRAWN",
  "REMOVED",
] as const;
export type CoordinationParticipantStatus = (typeof COORDINATION_PARTICIPANT_STATUSES)[number];

export const COORDINATION_EVENT_TYPES = [
  "OPPORTUNITY_CREATED",
  "OPPORTUNITY_UPDATED",
  "OPPORTUNITY_STATUS_CHANGED",
  "REQUIREMENT_ADDED",
  "PARTICIPANT_JOINED",
  "PARTICIPANT_WITHDRAWN",
  "COMMITMENT_PROPOSED",
  "COMMITMENT_OFFERED",
  "COMMITMENT_ACCEPTED",
  "COMMITMENT_CONFIRMED",
  "COMMITMENT_REJECTED",
  "COMMITMENT_WITHDRAWN",
  "COMMITMENT_FULFILLED",
  "FULFILMENT_RECORDED",
  "GOVERNANCE_BLOCKED",
  "CONCURRENCY_BLOCKED",
  "READINESS_CHANGED",
  "EVIDENCE_SUBMITTED",
  "RECONCILIATION_COMPLETED",
  "FULFILMENT_EXCEPTION_RECORDED",
  "DISPUTE_LINKED",
  "SHORTFALL_DECLARED",
] as const;
export type CoordinationEventType = (typeof COORDINATION_EVENT_TYPES)[number];

// -----------------------------------------------------------------------------
// 1.1 PHASE 3.11: FULFILMENT, RECONCILIATION & EVIDENCE ENUMS
// -----------------------------------------------------------------------------

export const COMMITMENT_READINESS_STATUSES = [
  "NOT_READY",
  "READY_FOR_AGGREGATION",
  "READY_FOR_PROCESSING",
  "READY_FOR_LOGISTICS",
  "IN_FULFILMENT",
  "FULFILLED",
  "PARTIALLY_FULFILLED",
  "FAILED",
  "CANCELLED",
] as const;
export type CommitmentReadinessStatus = (typeof COMMITMENT_READINESS_STATUSES)[number];

export const QUANTITY_RECONCILIATION_STATUSES = [
  "PENDING",
  "EXACT",
  "UNDER_FULFILLED",
  "OVER_FULFILLED_BLOCKED",
  "NO_FULFILMENT",
  "INSUFFICIENT_DATA",
] as const;
export type QuantityReconciliationStatus = (typeof QUANTITY_RECONCILIATION_STATUSES)[number];

export const COMMITMENT_FAILURE_REASONS = [
  "SUPPLY_UNAVAILABLE",
  "QUANTITY_SHORTFALL",
  "TIMING_FAILURE",
  "PROCESSING_CONSTRAINT",
  "LOGISTICS_CONSTRAINT",
  "SECURITY_DISRUPTION",
  "QUALITY_REQUIREMENT_UNMET",
  "PARTICIPANT_WITHDRAWAL",
  "EXPIRED_COMMITMENT",
  "INSUFFICIENT_EVIDENCE",
  "OTHER",
] as const;
export type CommitmentFailureReason = (typeof COMMITMENT_FAILURE_REASONS)[number];

export const EVIDENCE_CATEGORIES = [
  "PRODUCER_CONFIRMATION",
  "QUANTITY_CONFIRMATION",
  "AVAILABILITY_CONFIRMATION",
  "AGGREGATION_CONFIRMATION",
  "PROCESSING_CONFIRMATION",
  "LOGISTICS_HANDOFF",
  "DELIVERY_CONFIRMATION",
] as const;
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

export const EVIDENCE_PROVENANCES = [
  "SELF_REPORTED",
  "SYSTEM_DERIVED",
  "TRANSACTION_OBSERVED",
  "AUTHORIZED_REVIEW",
  "EXTERNAL_SOURCE",
] as const;
export type EvidenceProvenance = (typeof EVIDENCE_PROVENANCES)[number];

export const EVIDENCE_REFERENCE_TYPES = [
  "DELIVERY",
  "DELIVERY_EVENT",
  "PROCESSING_EVENT",
  "AGGREGATION_POOL",
  "DISPUTE",
  "MANUAL_INSPECTION",
] as const;
export type EvidenceReferenceType = (typeof EVIDENCE_REFERENCE_TYPES)[number];

// -----------------------------------------------------------------------------
// 2. CORE DOMAIN INTERFACES
// -----------------------------------------------------------------------------

export interface CoordinationOpportunity {
  id: string;
  creatorId: string;
  b2bDemandId?: string | null;
  title: string;
  commodity: string;
  requiredQuantity: number;
  unit: string;
  canonicalQuantityKg: number;
  acceptedQuantity: number;
  fulfilledQuantity: number;
  targetState: NigerianState | string;
  targetLga: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  qualityGrade: string;
  processingRequired: boolean;
  processingFacilityId?: string | null;
  logisticsRequired: boolean;
  status: CoordinationOpportunityStatus;
  coverageStatus: CoordinationCoverageStatus;
  governanceDecision: GovernanceDecision;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CoordinationRequirement {
  id: string;
  opportunityId: string;
  requirementType: CoordinationRequirementType;
  title: string;
  description?: string | null;
  isMandatory: boolean;
  parameters: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CoordinationParticipant {
  id: string;
  opportunityId: string;
  userId: string;
  actorRole: CoordinationParticipantRole;
  status: CoordinationParticipantStatus;
  joinedAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  // Presentation profile hints (sanitized)
  displayName?: string;
  isVerified?: boolean;
}

export interface SupplyCommitment {
  id: string;
  opportunityId: string;
  participantId: string;
  productionOutputId?: string | null;
  commodity: string;
  committedQuantity: number;
  unit: string;
  canonicalQuantityKg: number;
  qualityGrade: string;
  availabilityDate: string;
  locationState: NigerianState | string;
  locationLga: string;
  status: SupplyCommitmentStatus;
  rejectionReason?: string | null;
  notes?: string | null;
  governanceDecision: GovernanceDecision;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Phase 3.11: Fulfilment, Reconciliation & Readiness
  readinessStatus: CommitmentReadinessStatus;
  confirmedQuantity?: number | null;
  fulfilledQuantity: number;
  remainingQuantity: number;
  reconciliationStatus: QuantityReconciliationStatus;
  reconciledAt?: string | null;
  reconciledBy?: string | null;
  failureReason?: CommitmentFailureReason | null;
  disputeId?: string | null;
  // Presentation fields (privacy sanitized)
  participantDisplayName?: string;
}

export interface CommitmentEvidence {
  id: string;
  commitmentId: string;
  opportunityId: string;
  submittedBy: string;
  evidenceCategory: EvidenceCategory;
  provenance: EvidenceProvenance;
  quantityObserved?: number | null;
  unit?: string | null;
  referenceId?: string | null;
  referenceType?: EvidenceReferenceType | null;
  notes?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  submitterDisplayName?: string;
}

export interface CoordinationEvent {
  id: string;
  opportunityId: string;
  commitmentId?: string | null;
  actorId: string;
  eventType: CoordinationEventType;
  title: string;
  details: Record<string, unknown>;
  occurredAt: string;
  recordedAt: string;
}

// -----------------------------------------------------------------------------
// 3. COMPUTED COVERAGE, RECONCILIATION & SHORTFALL ACCOUNTING
// -----------------------------------------------------------------------------

export interface CoordinationCoverageSummary {
  opportunityId: string;
  requiredQuantityKg: number;
  acceptedQuantityKg: number;
  fulfilledQuantityKg: number;
  coveragePercentage: number;
  remainingCapacityKg: number;
  coverageStatus: CoordinationCoverageStatus;
  acceptedCommitmentsCount: number;
  pendingOffersCount: number;
}

export interface QuantityReconciliationResult {
  commitmentId: string;
  committedQuantity: number;
  confirmedQuantity: number | null;
  fulfilledQuantity: number;
  receivedQuantity: number | null;
  varianceQuantity: number;
  variancePercentage: number;
  outcome: QuantityReconciliationStatus;
  isPartial: boolean;
  remainingQuantity: number;
  unit: string;
  reconciledAt: string;
}

export interface CoordinationShortfallSummary {
  opportunityId: string;
  requiredQuantity: number;
  fulfilledQuantity: number;
  shortfallQuantity: number;
  hasShortfall: boolean;
  unit: string;
}

export interface ParticipantReliabilityMetrics {
  participantId: string;
  totalCommitments: number;
  fulfilledCommitments: number;
  partiallyFulfilledCommitments: number;
  failedCommitments: number;
  fulfilmentRate: number | null; // null if INSUFFICIENT_DATA
  onTimeRate: number | null;
  averageVariancePercentage: number | null;
  status: "ADEQUATE_HISTORY" | "INSUFFICIENT_DATA";
  minimumSampleSizeThreshold: number;
  advisoryOnly: true;
}

// -----------------------------------------------------------------------------
// 4. ACTION INPUT CONTRACTS
// -----------------------------------------------------------------------------

export interface CreateCoordinationOpportunityInput {
  b2bDemandId?: string | null;
  title: string;
  commodity: string;
  requiredQuantity: number;
  unit: string;
  targetState: string;
  targetLga: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  qualityGrade?: string;
  processingRequired?: boolean;
  processingFacilityId?: string | null;
  logisticsRequired?: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface OfferSupplyCommitmentInput {
  opportunityId: string;
  productionOutputId?: string | null;
  commodity: string;
  committedQuantity: number;
  unit: string;
  qualityGrade?: string;
  availabilityDate: string;
  locationState: string;
  locationLga: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AcceptSupplyCommitmentInput {
  commitmentId: string;
  justification?: string;
}

export interface WithdrawSupplyCommitmentInput {
  commitmentId: string;
  reason: string;
}

export interface ConfirmSupplyCommitmentInput {
  commitmentId: string;
  notes?: string;
}

export interface RecordFulfilmentInput {
  commitmentId: string;
  fulfilledQuantity: number;
  fulfilledUnit: string;
  notes?: string;
}

export interface CancelCoordinationOpportunityInput {
  opportunityId: string;
  reason: string;
}

// Phase 3.11: Fulfilment Actions
export interface ConfirmCommitmentQuantityInput {
  commitmentId: string;
  confirmedQuantity: number;
  notes?: string;
}

export interface UpdateFulfilmentReadinessInput {
  commitmentId: string;
  readinessStatus: CommitmentReadinessStatus;
  notes?: string;
}

export interface SubmitFulfilmentEvidenceInput {
  commitmentId: string;
  evidenceCategory: EvidenceCategory;
  provenance: EvidenceProvenance;
  quantityObserved?: number;
  unit?: string;
  referenceId?: string;
  referenceType?: EvidenceReferenceType;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordCommitmentFulfilmentInput {
  commitmentId: string;
  fulfilledQuantity: number;
  unit: string;
  evidenceCategory: EvidenceCategory;
  provenance: EvidenceProvenance;
  notes?: string;
  referenceId?: string;
  referenceType?: EvidenceReferenceType;
  failureReason?: CommitmentFailureReason;
}

export interface RecordCommitmentFailureInput {
  commitmentId: string;
  failureReason: CommitmentFailureReason;
  notes: string;
}

export interface LinkCommitmentDisputeInput {
  commitmentId: string;
  disputeId: string;
  notes?: string;
}
