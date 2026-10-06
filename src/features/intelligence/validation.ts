import { z } from "zod";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
export { NIGERIAN_STATES };

/**
 * Strict Anti-Pork content validator for Agricultural Intelligence.
 * Rejects pig/pork terms across all commodities, titles, recommendations, summaries, and inputs.
 */
export const PORK_PROHIBITED_REGEX =
  /\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b/i;

export function containsProhibitedProduce(text: string): boolean {
  if (!text) return false;
  return PORK_PROHIBITED_REGEX.test(text);
}

export function assertNoProhibitedProduce(text: string, fieldName = "Field"): void {
  if (containsProhibitedProduce(text)) {
    throw new Error(
      `${fieldName} contains prohibited produce terms. AgroMarket strictly forbids pig/pork/swine commodities throughout the entire ecosystem.`
    );
  }
}

export function validateNigerianState(state: string): string {
  const match = (NIGERIAN_STATES as readonly string[]).find(
    (s) => s.toLowerCase() === state.trim().toLowerCase()
  );
  if (!match) {
    throw new Error(`'${state}' is not a recognized Nigerian state.`);
  }
  return match;
}

export const evidenceSourceTypeSchema = z.enum([
  "PLATFORM_TRANSACTION",
  "PRICE_OBSERVATION",
  "ORDER_HISTORY",
  "B2B_DEMAND",
  "SHARED_PURCHASE",
  "PRODUCTION_OUTPUT",
  "PROCESSING_EVENT",
  "DELIVERY_EVENT",
  "DELIVERY_RECORD",
  "LOGISTICS_PROVIDER",
  "MOVEMENT_OBSERVATION",
  "CORRIDOR_OBSERVATION",
  "SECURITY_INCIDENT",
  "KNOWLEDGE_BULLETIN",
  "EQUIPMENT_ACTIVITY",
  "SEASONAL_CALENDAR",
  "FOOD_SECURITY_SNAPSHOT",
  "RESILIENCE_ASSESSMENT",
  "DISEASE_OBSERVATION",
  "BIOSECURITY_ADVISORY",
  "VETERINARY_REPORT",
  "SURVEILLANCE_NOTICE",
]);

export const intelligenceEvidenceSchema = z.object({
  sourceType: evidenceSourceTypeSchema,
  sourceId: z.string().min(1, "sourceId is required"),
  description: z
    .string()
    .min(3, "Description must be at least 3 characters")
    .max(500, "Description must not exceed 500 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Evidence description must not contain prohibited pig/pork produce terms.",
    }),
  observedAt: z.string().datetime({ message: "observedAt must be ISO-8601 string" }),
  relevance: z.number().min(0.0).max(1.0),
  metadata: z.record(z.unknown()).optional(),
});

export const intelligenceSignalTypeSchema = z.enum([
  "PRICE_INCREASE",
  "PRICE_DECREASE",
  "DEMAND_INCREASE",
  "DEMAND_DECREASE",
  "SUPPLY_SHORTAGE",
  "SUPPLY_SURPLUS",
  "PROCESSING_BOTTLENECK",
  "LOGISTICS_DISRUPTION",
  "SECURITY_DISRUPTION",
  "DISEASE_RISK",
  "SEASONAL_DEMAND",
  "DEMAND_VOLATILITY",
  "UNMET_DEMAND",
  "B2B_DEMAND_INCREASE",
  "FOOD_SECURITY_PRESSURE_INCREASE",
  "FOOD_SECURITY_PRESSURE_DECREASE",
  "REGIONAL_SUPPLY_STRESS",
  "COMMODITY_SUPPLY_STRESS",
  "FOOD_AFFORDABILITY_PRESSURE",
  "FOOD_AVAILABILITY_PRESSURE",
  "FOOD_ACCESS_PRESSURE",
  "FOOD_STABILITY_RISK",
  "AGRICULTURAL_RESILIENCE_RISK",
  "CRITICAL_DEPENDENCY",
  "SUPPLY_CORRIDOR_DEPENDENCY",
  "FOOD_SECURITY_ALERT",
  "LOGISTICS_PRESSURE_INCREASE",
  "LOGISTICS_PRESSURE_DECREASE",
  "MOVEMENT_CAPACITY_SHORTAGE",
  "DELIVERY_DELAY_INCREASE",
  "CORRIDOR_DISRUPTION",
  "CORRIDOR_DEPENDENCY",
  "PROVIDER_DEPENDENCY",
  "LOGISTICS_BOTTLENECK",
  "REGIONAL_LOGISTICS_SCARCITY",
  "PROCESSING_MOVEMENT_BOTTLENECK",
  "MOVEMENT_ALTERNATIVE_AVAILABLE",
  "LOGISTICS_RESILIENCE_DECREASE",
  "LOGISTICS_RESILIENCE_INCREASE",
  "LOGISTICS_FOOD_SECURITY_RISK",
  "DISEASE_RISK_INCREASE",
  "DISEASE_RISK_DECREASE",
  "REGIONAL_DISEASE_SIGNAL",
  "COMMODITY_DISEASE_SIGNAL",
  "PRODUCTION_HEALTH_DISRUPTION",
  "MORTALITY_SIGNAL",
  "CROP_HEALTH_DISRUPTION",
  "AQUACULTURE_HEALTH_SIGNAL",
  "BIOSECURITY_RESTRICTION",
  "MOVEMENT_HEALTH_RESTRICTION",
  "DISEASE_SURVEILLANCE_GAP",
  "DISEASE_SIGNAL_CONVERGENCE",
  "DISEASE_RISK_UNCERTAINTY",
  "DISEASE_SUPPLY_IMPACT",
  "DISEASE_FOOD_SECURITY_RISK",
]);

export const intelligenceSignalSchema = z.object({
  agentId: z.string().min(1, "agentId is required"),
  signalType: intelligenceSignalTypeSchema,
  commodity: z
    .string()
    .min(2, "Commodity name is required")
    .max(100, "Commodity must not exceed 100 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Commodity must not contain prohibited pig/pork terms.",
    }),
  category: z.string().max(50).optional().nullable(),
  state: z
    .string()
    .min(2, "State is required")
    .refine((val) => (NIGERIAN_STATES as readonly string[]).includes(val), {
      message: "Must be a valid Nigerian state.",
    }),
  lga: z.string().max(50).optional().nullable(),
  corridor: z.string().max(100).optional().nullable(),
  magnitude: z.number().finite("Magnitude must be a finite number"),
  confidence: z
    .number()
    .min(0.0, "Confidence minimum is 0.0")
    .max(1.0, "Confidence maximum is 1.0"),
  source: z.string().min(2, "Source is required"),
  evidence: z.array(intelligenceEvidenceSchema).min(1, "At least one evidence item is required"),
  supportingObservationIds: z.array(z.string().uuid()).optional(),
  observedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime(),
});

export const observationDomainSourceSchema = z.enum([
  "MARKET",
  "SUPPLY",
  "DEMAND",
  "PROCESSING",
  "LOGISTICS",
  "SECURITY",
  "KNOWLEDGE",
  "EQUIPMENT",
  "VALUE_CHAIN",
  "FOOD_SECURITY",
  "RESILIENCE",
]);

export const intelligenceObservationSchema = z.object({
  agentId: z.string().min(1, "agentId is required"),
  domainSource: observationDomainSourceSchema,
  sourceId: z.string().max(100).optional().nullable(),
  commodity: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .refine((val) => !val || !containsProhibitedProduce(val), {
      message: "Observation commodity must not contain prohibited pig/pork terms.",
    }),
  category: z.string().max(50).optional().nullable(),
  state: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || (NIGERIAN_STATES as readonly string[]).includes(val), {
      message: "Must be a valid Nigerian state if provided.",
    }),
  lga: z.string().max(50).optional().nullable(),
  corridor: z.string().max(100).optional().nullable(),
  summary: z
    .string()
    .min(5, "Summary must be at least 5 characters")
    .max(1000, "Summary must not exceed 1000 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Summary must not contain prohibited pig/pork terms.",
    }),
  details: z.record(z.unknown()).optional(),
  observedValue: z.number().optional().nullable(),
  baselineValue: z.number().optional().nullable(),
  unit: z.string().max(30).optional().nullable(),
  confidence: z.number().min(0.0).max(1.0),
  evidence: z.array(intelligenceEvidenceSchema).default([]),
  observedAt: z.string().datetime().optional(),
});

export const recommendationObjectiveSchema = z.enum([
  "STABILIZE_SUPPLY",
  "PREVENT_SPOILAGE",
  "OPTIMIZE_PRICING",
  "REROUTE_LOGISTICS",
  "RISK_MITIGATION",
  "FACILITY_OFFTAKE",
  "DEMAND_FULFILLMENT",
  "SECURITY_ADVISORY",
  "SUPPLY_COORDINATION",
  "AGGREGATION_COORDINATION",
  "PROCESSING_COORDINATION",
  "PROCUREMENT_COORDINATION",
  "PROCUREMENT_STRATEGY",
  "SUPPLIER_DIVERSIFICATION",
  "PROCUREMENT_RISK",
  "B2B_PROCUREMENT",
  "FOOD_SECURITY_INTERVENTION",
  "RESILIENCE_STRENGTHENING",
  "CORRIDOR_PROTECTION",
  "SUPPLY_RESERVE_RELEASE",
  "CRITICAL_DEPENDENCY_MITIGATION",
  "DIRECT_MOVEMENT",
  "MULTI_PROVIDER_MOVEMENT",
  "ALTERNATIVE_CORRIDOR_REVIEW",
  "REGIONAL_SOURCE_ALTERNATIVE",
  "PROCESSING_LOCATION_REVIEW",
  "LOGISTICS_BOTTLENECK_INVESTIGATION",
  "CORRIDOR_CAPACITY_STRENGTHENING",
  "BIOSECURITY_ISOLATION_ADVISORY",
  "VETERINARY_CONSULTATION_REFERRAL",
  "MOVEMENT_HEALTH_CAUTION",
  "REGIONAL_SOURCE_DIVERSIFICATION",
  "FEED_WATER_QUALITY_INSPECTION",
  "HARVEST_QUARANTINE_MONITORING",
  "DISEASE_SURVEILLANCE_VERIFICATION",
]);

export const recommendationStatusSchema = z.enum([
  "PROPOSED",
  "REVIEWED",
  "APPROVED",
  "REJECTED",
  "EXECUTED",
  "EXPIRED",
]);

export const expectedImpactSchema = z.object({
  primaryMetric: z.string().min(2),
  estimatedChange: z.string().min(1),
  timeframeDays: z.number().int().positive(),
  qualitativeSummary: z.string().min(5),
});

export const intelligenceRecommendationSchema = z.object({
  agentId: z.string().min(1, "agentId is required"),
  objective: recommendationObjectiveSchema,
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(255, "Title must not exceed 255 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Title must not contain prohibited pig/pork produce terms.",
    }),
  recommendation: z
    .string()
    .min(10, "Recommendation must be at least 10 characters")
    .max(3000, "Recommendation must not exceed 3000 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Recommendation must not contain prohibited pig/pork terms.",
    }),
  evidence: z.array(intelligenceEvidenceSchema).min(1, "At least one evidence reference is required"),
  confidence: z.number().min(0.0).max(1.0),
  expectedImpact: expectedImpactSchema,
  affectedActors: z.array(z.string()).min(1, "At least one affected actor role required"),
  affectedCommodities: z
    .array(z.string())
    .refine((items) => items.every((c) => !containsProhibitedProduce(c)), {
      message: "Affected commodities must not contain prohibited pig/pork terms.",
    }),
  affectedLocations: z.array(z.string()),
  status: recommendationStatusSchema.default("PROPOSED"),
  expiresAt: z.string().datetime(),
});

export const recommendationReviewSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendation ID"),
  decision: z.enum(["APPROVED", "REJECTED", "DEFERRED"]),
  reviewNotes: z.string().max(1000).optional(),
});

export const intelligencePredictionSchema = z.object({
  agentId: z.string().min(1),
  recommendationId: z.string().uuid().optional().nullable(),
  commodity: z
    .string()
    .min(2)
    .max(100)
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Prediction commodity must not contain prohibited pig/pork terms.",
    }),
  state: z
    .string()
    .min(2)
    .refine((val) => (NIGERIAN_STATES as readonly string[]).includes(val), {
      message: "Must be a valid Nigerian state.",
    }),
  lga: z.string().max(50).optional().nullable(),
  metricName: z.string().min(2).max(100),
  baselineValue: z.number(),
  predictedValue: z.number(),
  predictedRangeLow: z.number().optional().nullable(),
  predictedRangeHigh: z.number().optional().nullable(),
  confidence: z.number().min(0.0).max(1.0),
  targetDate: z.string().datetime(),
});

export const intelligenceOutcomeSchema = z.object({
  predictionId: z.string().uuid("Invalid prediction ID"),
  actualValue: z.number(),
  observedAt: z.string().datetime().optional(),
  sourceDomain: z.string().min(2),
  sourceId: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const intelligenceEvaluationInputSchema = z.object({
  predictionId: z.string().uuid(),
  outcomeId: z.string().uuid(),
  predictedValue: z.number(),
  actualValue: z.number(),
  predictedRangeLow: z.number().optional().nullable(),
  predictedRangeHigh: z.number().optional().nullable(),
  baselineValue: z.number().optional(),
});
