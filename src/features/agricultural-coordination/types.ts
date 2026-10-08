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
] as const;
export type CoordinationEventType = (typeof COORDINATION_EVENT_TYPES)[number];

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
  // Presentation fields (privacy sanitized)
  participantDisplayName?: string;
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
// 3. COMPUTED COVERAGE & ACCOUNTING
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
