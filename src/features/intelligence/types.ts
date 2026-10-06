/**
 * AgroMarket Phase 2.1: Agricultural Intelligence Foundation
 * Core Domain Types & Data Contracts
 *
 * Implements the deterministic intelligence architecture:
 * DATA -> DETERMINISTIC ENGINE -> SIGNALS -> EVIDENCE -> RECOMMENDATION -> HUMAN REVIEW -> OUTCOME -> EVALUATION
 */

export type IntelligenceSignalType =
  | "PRICE_INCREASE"
  | "PRICE_DECREASE"
  | "DEMAND_INCREASE"
  | "DEMAND_DECREASE"
  | "SUPPLY_SHORTAGE"
  | "SUPPLY_SURPLUS"
  | "PROCESSING_BOTTLENECK"
  | "LOGISTICS_DISRUPTION"
  | "SECURITY_DISRUPTION"
  | "DISEASE_RISK"
  | "SEASONAL_DEMAND"
  | "DEMAND_VOLATILITY"
  | "UNMET_DEMAND"
  | "B2B_DEMAND_INCREASE"
  | "FOOD_SECURITY_PRESSURE_INCREASE"
  | "FOOD_SECURITY_PRESSURE_DECREASE"
  | "REGIONAL_SUPPLY_STRESS"
  | "COMMODITY_SUPPLY_STRESS"
  | "FOOD_AFFORDABILITY_PRESSURE"
  | "FOOD_AVAILABILITY_PRESSURE"
  | "FOOD_ACCESS_PRESSURE"
  | "FOOD_STABILITY_RISK"
  | "AGRICULTURAL_RESILIENCE_RISK"
  | "CRITICAL_DEPENDENCY"
  | "SUPPLY_CORRIDOR_DEPENDENCY"
  | "FOOD_SECURITY_ALERT"
  | "LOGISTICS_PRESSURE_INCREASE"
  | "LOGISTICS_PRESSURE_DECREASE"
  | "MOVEMENT_CAPACITY_SHORTAGE"
  | "DELIVERY_DELAY_INCREASE"
  | "CORRIDOR_DISRUPTION"
  | "CORRIDOR_DEPENDENCY"
  | "PROVIDER_DEPENDENCY"
  | "LOGISTICS_BOTTLENECK"
  | "REGIONAL_LOGISTICS_SCARCITY"
  | "PROCESSING_MOVEMENT_BOTTLENECK"
  | "MOVEMENT_ALTERNATIVE_AVAILABLE"
  | "LOGISTICS_RESILIENCE_DECREASE"
  | "LOGISTICS_RESILIENCE_INCREASE"
  | "LOGISTICS_FOOD_SECURITY_RISK";

export type ObservationDomainSource =
  | "MARKET"
  | "SUPPLY"
  | "DEMAND"
  | "PROCESSING"
  | "LOGISTICS"
  | "SECURITY"
  | "KNOWLEDGE"
  | "EQUIPMENT"
  | "VALUE_CHAIN"
  | "FOOD_SECURITY"
  | "RESILIENCE";

export type EvidenceSourceType =
  | "PLATFORM_TRANSACTION"
  | "PRICE_OBSERVATION"
  | "ORDER_HISTORY"
  | "B2B_DEMAND"
  | "SHARED_PURCHASE"
  | "PRODUCTION_OUTPUT"
  | "PROCESSING_EVENT"
  | "DELIVERY_EVENT"
  | "DELIVERY_RECORD"
  | "LOGISTICS_PROVIDER"
  | "MOVEMENT_OBSERVATION"
  | "CORRIDOR_OBSERVATION"
  | "SECURITY_INCIDENT"
  | "KNOWLEDGE_BULLETIN"
  | "EQUIPMENT_ACTIVITY"
  | "SEASONAL_CALENDAR"
  | "FOOD_SECURITY_SNAPSHOT"
  | "RESILIENCE_ASSESSMENT";

export type RecommendationObjective =
  | "STABILIZE_SUPPLY"
  | "PREVENT_SPOILAGE"
  | "OPTIMIZE_PRICING"
  | "REROUTE_LOGISTICS"
  | "RISK_MITIGATION"
  | "FACILITY_OFFTAKE"
  | "DEMAND_FULFILLMENT"
  | "SECURITY_ADVISORY"
  | "SUPPLY_COORDINATION"
  | "AGGREGATION_COORDINATION"
  | "PROCESSING_COORDINATION"
  | "PROCUREMENT_COORDINATION"
  | "PROCUREMENT_STRATEGY"
  | "SUPPLIER_DIVERSIFICATION"
  | "PROCUREMENT_RISK"
  | "B2B_PROCUREMENT"
  | "FOOD_SECURITY_INTERVENTION"
  | "RESILIENCE_STRENGTHENING"
  | "CORRIDOR_PROTECTION"
  | "SUPPLY_RESERVE_RELEASE"
  | "CRITICAL_DEPENDENCY_MITIGATION"
  | "DIRECT_MOVEMENT"
  | "MULTI_PROVIDER_MOVEMENT"
  | "ALTERNATIVE_CORRIDOR_REVIEW"
  | "REGIONAL_SOURCE_ALTERNATIVE"
  | "PROCESSING_LOCATION_REVIEW"
  | "LOGISTICS_BOTTLENECK_INVESTIGATION"
  | "CORRIDOR_CAPACITY_STRENGTHENING";

export type RecommendationStatus =
  | "PROPOSED"
  | "REVIEWED"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTED"
  | "EXPIRED";

export type PredictionStatus =
  | "PENDING"
  | "EVALUATED"
  | "CANCELLED"
  | "EXPIRED";

export type AgentStatus = "ACTIVE" | "MAINTENANCE" | "DEPRECATED";

export interface IntelligenceEvidence {
  sourceType: EvidenceSourceType;
  sourceId: string;
  description: string;
  observedAt: string;
  relevance: number; // 0.0 to 1.0
  metadata?: Record<string, unknown>;
}

export interface IntelligenceAgent {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  status: AgentStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IntelligenceObservation {
  id: string;
  agentId: string;
  domainSource: ObservationDomainSource;
  sourceId?: string | null;
  commodity?: string | null;
  category?: string | null;
  state?: string | null;
  lga?: string | null;
  corridor?: string | null;
  summary: string;
  details?: Record<string, unknown>;
  observedValue?: number | null;
  baselineValue?: number | null;
  unit?: string | null;
  confidence: number;
  evidence: IntelligenceEvidence[];
  observedAt: string;
  createdAt: string;
}

export interface IntelligenceSignal {
  id: string;
  agentId: string;
  signalType: IntelligenceSignalType;
  commodity: string;
  category?: string | null;
  state: string;
  lga?: string | null;
  corridor?: string | null;
  magnitude: number; // e.g. percentage change (+18.5) or scale index
  confidence: number; // 0.0 to 1.0
  source: string;
  evidence: IntelligenceEvidence[];
  supportingObservationIds?: string[];
  observedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface ExpectedImpact {
  primaryMetric: string;
  estimatedChange: string;
  timeframeDays: number;
  qualitativeSummary: string;
}

export interface IntelligenceRecommendation {
  id: string;
  agentId: string;
  objective: RecommendationObjective;
  title: string;
  recommendation: string;
  evidence: IntelligenceEvidence[];
  confidence: number;
  expectedImpact: ExpectedImpact;
  affectedActors: string[]; // e.g. ['FARMER', 'AGGREGATOR']
  affectedCommodities: string[];
  affectedLocations: string[]; // State or State:LGA
  status: RecommendationStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewDecision?: "APPROVED" | "REJECTED" | "DEFERRED" | null;
  reviewNotes?: string | null;
  executedAt?: string | null;
  executionNotes?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntelligencePrediction {
  id: string;
  agentId: string;
  recommendationId?: string | null;
  commodity: string;
  state: string;
  lga?: string | null;
  metricName: string;
  baselineValue: number;
  predictedValue: number;
  predictedRangeLow?: number | null;
  predictedRangeHigh?: number | null;
  confidence: number;
  targetDate: string;
  status: PredictionStatus;
  createdAt: string;
}

export interface IntelligenceOutcome {
  id: string;
  predictionId: string;
  actualValue: number;
  observedAt: string;
  sourceDomain: string;
  sourceId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface IntelligenceEvaluation {
  id: string;
  predictionId: string;
  outcomeId: string;
  predictedValue: number;
  actualValue: number;
  absoluteError: number;
  percentageError: number;
  directionAccurate: boolean;
  withinPredictedRange: boolean;
  evaluationScore: number; // 0.0 (poor) to 1.0 (exact)
  evaluatedAt: string;
  createdAt: string;
}

/**
 * Deterministic Intelligence Query Inputs from Existing Domains
 */
export interface MarketDomainInput {
  commodity: string;
  state: string;
  recentObservations: Array<{
    price: number;
    unit: string;
    observedAt: string;
    sourceType: string;
    isVerified: boolean;
  }>;
  historicalBaselinePrice?: number;
}

export interface SupplyDomainInput {
  commodity: string;
  state: string;
  availableOutputs: Array<{
    id: string;
    quantity: number;
    unit: string;
    outputType: string;
    producedAt: string;
  }>;
  activePools: Array<{
    id: string;
    currentQuantity: number;
    targetQuantity: number;
    unit: string;
  }>;
}

export interface DemandDomainInput {
  commodity: string;
  state: string;
  b2bDemands: Array<{
    id: string;
    quantity: number;
    unit: string;
    deliveryDate: string;
    frequency: string;
  }>;
  orderVolumeTotal: number;
  sharedPurchaseDemand: number;
}

export interface ProcessingDomainInput {
  commodity: string;
  state: string;
  totalFacilities: number;
  totalCapacity: number;
  queuedOutputVolume: number;
  activeBatchTurnaroundDays: number;
}

export interface LogisticsDomainInput {
  corridor: string;
  state: string;
  transitDelayIncidents: number;
  totalActiveDeliveries: number;
  recentDisruptions: Array<{
    id: string;
    type: string;
    reportedAt: string;
    description: string;
  }>;
}

export interface SecurityDomainInput {
  state: string;
  lga?: string;
  corridor?: string;
  recentIncidents: Array<{
    id: string;
    title: string;
    severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    affectedCommodities: string[];
    movementImpact: string | null;
    publishedAt: string;
  }>;
}

export interface ConfidenceEvaluationFactors {
  sourceReliability: number; // 0.0 - 1.0
  sampleSize: number; // Count of independent data points
  recencyDays: number; // Days since oldest relevant data point
  varianceRatio: number; // Ratio of standard deviation to mean (0 = perfect agreement)
  isOfficialOrVerified: boolean;
}
