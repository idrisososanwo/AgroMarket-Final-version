/**
 * AgroMarket Phase 2.0: Agricultural Ecosystem & Value-Chain Coordination Types
 *
 * Establishes reusable ecosystem primitives for:
 * 1. Ecosystem Actors
 * 2. Production Units
 * 3. Production Outputs
 * 4. Aggregation Pools & Contributions
 * 5. Processing Facilities
 * 6. Processing Events (Input -> Process -> Output)
 * 7. Value-Chain Events (Append-only Ledger)
 * 8. B2B Demand
 * 9. Supply/Demand Matching Foundation
 * 10. Value-Chain Stage Graph Definition
 */

import { NIGERIAN_STATES } from "@/features/marketplace/constants";

export type NigerianState = (typeof NIGERIAN_STATES)[number];

// ------------------------------------------------------------------------------
// 1. ECOSYSTEM ACTORS
// ------------------------------------------------------------------------------
export const ECOSYSTEM_ACTOR_TYPES = [
  "FARMER",
  "AGGREGATOR",
  "PROCESSOR",
  "PACKAGING_PROVIDER",
  "LOGISTICS_PROVIDER",
  "COLD_CHAIN_PROVIDER",
  "VETERINARY_PROVIDER",
  "INPUT_SUPPLIER",
  "EQUIPMENT_PROVIDER",
  "WHOLESALER",
  "RETAILER",
  "RESTAURANT",
  "HOTEL",
  "FOOD_PROCESSOR",
  "INSTITUTIONAL_BUYER",
  "COOPERATIVE",
  "MARKET_OPERATOR",
] as const;

export type EcosystemActorType = (typeof ECOSYSTEM_ACTOR_TYPES)[number];

export interface EcosystemActor {
  id: string;
  userId: string;
  businessProfileId?: string | null;
  actorType: EcosystemActorType;
  displayName: string;
  description?: string | null;
  capabilities: string[];
  state: NigerianState | string;
  lga: string;
  verificationStatus: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "OFFICIAL";
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// 2. PRODUCTION UNITS
// ------------------------------------------------------------------------------
export const PRODUCTION_UNIT_TYPES = [
  "FARM",
  "RANCH",
  "POULTRY_FARM",
  "FISH_FARM",
  "DAIRY_OPERATION",
  "GREENHOUSE",
  "APIARY",
  "SNAIL_FARM",
  "OTHER_PERMITTED_PRODUCTION_UNIT",
] as const;

export type ProductionUnitType = (typeof PRODUCTION_UNIT_TYPES)[number];

export interface ProductionUnit {
  id: string;
  ownerId: string;
  businessProfileId?: string | null;
  name: string;
  unitType: ProductionUnitType;
  state: NigerianState | string;
  lga: string;
  generalArea?: string | null;
  commodities: string[];
  capacityValue?: number | null;
  capacityUnit?: string | null;
  status: "ACTIVE" | "INACTIVE" | "FALLOW" | "MAINTENANCE" | "DECOMMISSIONED";
  verificationStatus: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "INSPECTED";
  isPublic: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// 3. PRODUCTION OUTPUTS (animal != final product; crop != packaged retail)
// ------------------------------------------------------------------------------
export const PRODUCTION_OUTPUT_TYPES = [
  "RAW_HARVEST",
  "LIVE_ANIMALS",
  "CARCASS",
  "RAW_MILK",
  "RAW_TUBERS",
  "GRAIN",
  "EGGS",
  "HONEY",
  "FISH_CATCH",
  "BYPRODUCT",
  "OTHER_PERMITTED_OUTPUT",
] as const;

export type ProductionOutputType = (typeof PRODUCTION_OUTPUT_TYPES)[number];

export interface ProductionOutput {
  id: string;
  productionUnitId?: string | null;
  producerId: string;
  commodityName: string;
  outputType: ProductionOutputType;
  batchNumber?: string | null;
  quantity: number;
  unit: string;
  harvestDate: string;
  qualityGrade: "STANDARD" | "PREMIUM" | "GRADE_A" | "GRADE_B" | "COMMERCIAL";
  status: "AVAILABLE" | "ALLOCATED" | "IN_TRANSIT" | "PROCESSED" | "DEPLETED";
  state: NigerianState | string;
  lga: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// 4. AGGREGATION POOLS & CONTRIBUTIONS
// ------------------------------------------------------------------------------
export interface AggregationPool {
  id: string;
  aggregatorId: string;
  title: string;
  commodity: string;
  targetQuantity: number;
  currentQuantity: number;
  unit: string;
  state: NigerianState | string;
  lga: string;
  collectionCenterName?: string | null;
  expectedAvailabilityDate: string;
  targetBuyerId?: string | null;
  targetProcessorId?: string | null;
  status: "OPEN" | "AGGREGATING" | "FULFILLED" | "DISPATCHED" | "CANCELLED" | "CLOSED";
  notes?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AggregationPoolContribution {
  id: string;
  poolId: string;
  supplierId: string;
  productionOutputId?: string | null;
  quantity: number;
  unit: string;
  status: "COMMITTED" | "DELIVERED" | "INSPECTED" | "REJECTED" | "SETTLED";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// 5. PROCESSING FACILITIES
// ------------------------------------------------------------------------------
export const PROCESSING_FACILITY_TYPES = [
  "POULTRY_PROCESSOR",
  "ABATTOIR",
  "FISH_PROCESSOR",
  "DAIRY_PROCESSOR",
  "CROP_PROCESSOR",
  "GRAIN_MILL",
  "FEED_MILL",
  "COLD_STORAGE_PROCESSING",
  "PACKAGING_FACILITY",
  "OTHER_PERMITTED_PROCESSOR",
] as const;

export type ProcessingFacilityType = (typeof PROCESSING_FACILITY_TYPES)[number];

export interface ProcessingFacility {
  id: string;
  operatorId: string;
  businessProfileId?: string | null;
  name: string;
  facilityType: ProcessingFacilityType;
  servicesOffered: string[];
  processingCapacityValue?: number | null;
  processingCapacityUnit?: string | null;
  minimumBatchSize?: number | null;
  supportedCommodities: string[];
  state: NigerianState | string;
  lga: string;
  generalLocation?: string | null;
  verificationStatus: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "INSPECTED";
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// 6. PROCESSING EVENTS (Transformation: Input -> Process -> Output)
// ------------------------------------------------------------------------------
export const PROCESS_TYPES = [
  "SLAUGHTER_AND_DRESS",
  "PORTIONING",
  "MILLING",
  "DRYING",
  "FERMENTATION",
  "PASTEURIZATION",
  "EXTRACTION",
  "PACKAGING_PROCESSING",
  "CLEANING_AND_GRADING",
  "OTHER_PERMITTED_PROCESS",
] as const;

export type ProcessType = (typeof PROCESS_TYPES)[number];

export interface ProcessingEvent {
  id: string;
  facilityId?: string | null;
  processorId: string;
  processType: ProcessType;
  inputDescription: string;
  inputQuantity: number;
  inputUnit: string;
  inputSourceOutputId?: string | null;
  outputDescription: string;
  outputQuantity: number;
  outputUnit: string;
  yieldPercentage?: number | null;
  batchReference?: string | null;
  startedAt: string;
  completedAt?: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "HALTED" | "REJECTED";
  resultingOutputId?: string | null;
  resultingListingId?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// 7. VALUE-CHAIN EVENTS (Append-Only Event Ledger)
// ------------------------------------------------------------------------------
export const VALUE_CHAIN_EVENT_TYPES = [
  "PRODUCED",
  "HARVESTED",
  "AGGREGATED",
  "TRANSPORTED",
  "RECEIVED",
  "PROCESSED",
  "INSPECTED",
  "PACKAGED",
  "STORED",
  "DISPATCHED",
  "DELIVERED",
] as const;

export type ValueChainEventType = (typeof VALUE_CHAIN_EVENT_TYPES)[number];

export type ValueChainEntityType =
  | "PRODUCTION_OUTPUT"
  | "AGGREGATION_POOL"
  | "PROCESSING_EVENT"
  | "B2B_DEMAND"
  | "MARKETPLACE_LISTING";

export interface ValueChainEvent {
  id: string;
  eventType: ValueChainEventType;
  entityType: ValueChainEntityType;
  entityId: string;
  actorId: string;
  eventTitle: string;
  eventDetails: Record<string, unknown>;
  state: NigerianState | string;
  lga?: string | null;
  occurredAt: string;
  recordedAt: string;
}

// ------------------------------------------------------------------------------
// 8. B2B DEMAND
// ------------------------------------------------------------------------------
export type B2BDemandFrequency =
  | "ONE_TIME"
  | "DAILY"
  | "WEEKLY"
  | "BI_WEEKLY"
  | "MONTHLY"
  | "QUARTERLY";

export type B2BDemandStatus =
  | "ACTIVE"
  | "MATCHED"
  | "PARTIALLY_MATCHED"
  | "FULFILLED"
  | "EXPIRED"
  | "CANCELLED";

export interface B2BDemand {
  id: string;
  buyerId: string;
  businessProfileId?: string | null;
  title: string;
  commodityOrProduct: string;
  quantity: number;
  unit: string;
  specifications: Record<string, unknown>;
  targetPricePerUnit?: number | null;
  state: NigerianState | string;
  lga: string;
  desiredDeliveryDate: string;
  frequency: B2BDemandFrequency;
  status: B2BDemandStatus;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------------------
// 9. SUPPLY / DEMAND MATCHING FOUNDATION
// ------------------------------------------------------------------------------
export interface MatchingCandidateSupply {
  id: string;
  sourceType: "PRODUCTION_OUTPUT" | "AGGREGATION_POOL";
  commodity: string;
  availableQuantity: number;
  unit: string;
  state: string;
  lga: string;
  producerOrAggregatorName: string;
  qualityGrade?: string;
  readyDate: string;
}

export interface MatchingCandidateFacility {
  id: string;
  name: string;
  facilityType: ProcessingFacilityType;
  servicesOffered: string[];
  supportedCommodities: string[];
  capacityValue?: number | null;
  capacityUnit?: string | null;
  minimumBatchSize?: number | null;
  state: string;
  lga: string;
}

export interface MatchingCandidateLogistics {
  id: string;
  companyName: string;
  vehicleTypes: string[];
  coverageStates: string[];
  maxWeightKg: number;
  hasRefrigeration: boolean;
}

export interface ValueChainMatchResult {
  demandId: string;
  demandTitle: string;
  commodity: string;
  requiredQuantity: number;
  unit: string;
  demandState: string;
  totalMatchScore: number; // 0 to 100
  supplyMatches: Array<{
    supply: MatchingCandidateSupply;
    score: number;
    corridorProximity: "SAME_STATE" | "REGIONAL_CORRIDOR" | "NATIONAL";
    quantitySufficiencyRatio: number;
  }>;
  processingFacilityMatches: Array<{
    facility: MatchingCandidateFacility;
    score: number;
    supportsProcessing: boolean;
  }>;
  logisticsMatches: Array<{
    logistics: MatchingCandidateLogistics;
    score: number;
    routeFeasibility: "DIRECT" | "REGIONAL";
  }>;
  matchSummary: string;
}

// ------------------------------------------------------------------------------
// 10. VALUE-CHAIN STAGE VISUALIZATION
// ------------------------------------------------------------------------------
export interface ValueChainStageDefinition {
  id: string;
  label: string;
  description: string;
  actorRole: string;
  keyOutputs: string[];
  status: "COMPLETED" | "CURRENT" | "UPCOMING" | "OPTIONAL";
}

export interface ValueChainTemplate {
  id: string;
  name: string;
  category: "CROP" | "LIVESTOCK" | "AQUACULTURE" | "DAIRY";
  commodity: string;
  summary: string;
  stages: ValueChainStageDefinition[];
}
