/**
 * AgroMarket Phase 3.3: Agricultural Intelligence Action Integration
 * Core Types, Enums, Contracts, and Governance Models
 *
 * SAFETY INVARIANTS:
 * 1. ADVISORY ONLY: AgroMarket NEVER autonomously executes transactions or actions.
 * 2. REAL ROUTES ONLY: Validates action routes against actual existing AgroMarket pages.
 * 3. REAL-TIME REVALIDATION: Verifies active live state before consequential steps.
 * 4. STRICT DECISION-ACTION LINKAGE: Retains full audit correlation.
 * 5. ANTI-PORK ZERO TOLERANCE: Rejects any prohibited produce references.
 * 6. ZERO FAKE DATA & NON-CAUSAL METRICS: Measures association, never manufactures causal proof.
 */

import { ActorRole } from "@/features/decision-intelligence/types";

// -----------------------------------------------------------------------------
// 1. NORMALIZED ACTION INTENTS (26 Types)
// -----------------------------------------------------------------------------

export const ACTION_INTENTS = [
  "VIEW_MARKETPLACE",
  "VIEW_SUPPLY_OPTIONS",
  "VIEW_DEMAND_OPPORTUNITIES",
  "VIEW_PROCUREMENT_OPTIONS",
  "VIEW_ALTERNATIVE_SUPPLIERS",
  "VIEW_AGGREGATION_OPTIONS",
  "CREATE_B2B_DEMAND",
  "CREATE_LISTING",
  "JOIN_SHARED_PURCHASE",
  "REQUEST_EQUIPMENT",
  "REQUEST_SERVICE",
  "VIEW_LOGISTICS_OPTIONS",
  "VIEW_MARKET_INTELLIGENCE",
  "VIEW_PRODUCTION_INTELLIGENCE",
  "VIEW_DEMAND_INTELLIGENCE",
  "VIEW_SUPPLY_INTELLIGENCE",
  "VIEW_PROCUREMENT_INTELLIGENCE",
  "VIEW_FOOD_SECURITY",
  "VIEW_DISEASE_INTELLIGENCE",
  "VIEW_AGRICULTURAL_SECURITY",
  "VIEW_EXPERT_ADVICE",
  "SEEK_EXPERT",
  "VIEW_FOOD_HEALTH",
  "REVIEW_RECOMMENDATION",
  "VIEW_COORDINATION_OPPORTUNITY",
  "REVIEW_FULFILMENT",
  "SUBMIT_FULFILMENT_EVIDENCE",
  "REVIEW_SHORTFALL",
  "REVIEW_EXCEPTION",
  "CONTINUE_MONITORING",
  "INSUFFICIENT_DATA",
] as const;

export type ActionIntent = (typeof ACTION_INTENTS)[number];

// -----------------------------------------------------------------------------
// 2. DESTINATION DOMAIN TYPES
// -----------------------------------------------------------------------------

export const DESTINATION_TYPES = [
  "MARKETPLACE",
  "SUPPLY_INTELLIGENCE",
  "DEMAND_INTELLIGENCE",
  "PROCUREMENT_INTELLIGENCE",
  "SHARED_PURCHASE",
  "COORDINATION",
  "EQUIPMENT",
  "SERVICES",
  "LOGISTICS",
  "KNOWLEDGE",
  "FOOD_HEALTH",
  "SECURITY",
  "PRODUCTION_INTELLIGENCE",
  "MARKET_INTELLIGENCE",
  "FOOD_SECURITY",
  "DISEASE_BIOSECURITY",
  "MY_INTELLIGENCE",
] as const;

export type DestinationType = (typeof DESTINATION_TYPES)[number];

// -----------------------------------------------------------------------------
// 3. ACTION OUTCOME STATES
// -----------------------------------------------------------------------------

export const ACTION_OUTCOME_STATUSES = [
  "NOT_STARTED",
  "VIEWED",
  "ACTION_INITIATED",
  "ACTION_COMPLETED",
  "ACTION_CANCELLED",
  "ACTION_FAILED",
  "EXPIRED",
  "UNKNOWN",
] as const;

export type ActionOutcomeStatus = (typeof ACTION_OUTCOME_STATUSES)[number];

// -----------------------------------------------------------------------------
// 4. REVALIDATION STATUSES
// -----------------------------------------------------------------------------

export const REVALIDATION_STATUSES = [
  "PENDING",
  "VALID",
  "STALE",
  "UNAVAILABLE",
  "FAILED",
] as const;

export type RevalidationStatus = (typeof REVALIDATION_STATUSES)[number];

// -----------------------------------------------------------------------------
// 5. ACTION CONTEXT PAYLOAD (Non-private Deep Link & State Preservation)
// -----------------------------------------------------------------------------

export interface ActionContextPayload {
  recommendationId: string;
  decisionId?: string | null;
  originatingDomain?: string;
  commodity?: string | null;
  category?: string | null;
  state?: string | null;
  lga?: string | null;
  quantity?: number | null;
  urgency?: string;
  contextBannerText?: string;
  filters?: Record<string, string | number | boolean>;
}

// -----------------------------------------------------------------------------
// 6. ACTION INTEGRATION ENTITY MODEL
// -----------------------------------------------------------------------------

export interface ActionIntegrationItem {
  id: string;
  userId: string;
  recommendationId: string;
  decisionId?: string | null;
  actionId?: string | null;
  actionIntent: ActionIntent;
  destinationType: DestinationType;
  destinationUrl: string;
  contextPayload: ActionContextPayload;
  status: ActionOutcomeStatus;
  revalidationStatus: RevalidationStatus;
  revalidationDetails: Record<string, unknown>;
  revalidatedAt?: string | null;
  completedAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 7. REVALIDATION CONTRACTS
// -----------------------------------------------------------------------------

export interface RevalidationCheckParams {
  destinationType: DestinationType;
  commodity?: string | null;
  state?: string | null;
  targetId?: string | null; // e.g. listingId, equipmentId, serviceId, poolId
}

export interface RevalidationResult {
  status: RevalidationStatus;
  destinationType: DestinationType;
  isAvailable: boolean;
  activeCount?: number;
  currentPrice?: number | null;
  currentQuantity?: number | null;
  checkedAt: string;
  message: string;
  details?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// 8. RECOMMENDATION-TO-ACTION MAPPING CONFIGURATION
// -----------------------------------------------------------------------------

export interface ActionMappingDefinition {
  intent: ActionIntent;
  destinationType: DestinationType;
  baseRoute: string;
  buttonLabel: string;
  guidanceText: string;
  requiresRevalidation: boolean;
  allowedRoles?: ActorRole[];
}

export interface ActionResolvedRoute {
  intent: ActionIntent;
  destinationType: DestinationType;
  url: string;
  buttonLabel: string;
  guidanceText: string;
  requiresRevalidation: boolean;
  contextBannerText: string;
}

// -----------------------------------------------------------------------------
// 9. CONVERSION & EFFECTIVENESS METRICS (Non-Causal Association)
// -----------------------------------------------------------------------------

export interface IntelligenceEffectivenessMetrics {
  totalRecommendationsGenerated: number;
  recommendationsViewed: number;
  recommendationsDecided: number;
  actionsInitiated: number;
  actionsCompleted: number;
  actionsCancelled: number;
  actionsFailed: number;

  // Rates (0.0 to 1.0 or percentage strings)
  recommendationViewRate: number;
  decisionRate: number;
  actionInitiationRate: number;
  actionCompletionRate: number;
  recommendationToActionConversionRate: number;
  actionSuccessRate: number;
  dismissalRate: number;
  deferralRate: number;

  // Operational metrics
  avgMinutesToDecision: number;
  avgMinutesToAction: number;

  // Governed Disclaimers
  governanceNote: string;
}
