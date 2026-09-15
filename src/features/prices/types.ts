import { z } from "zod";
import { NIGERIAN_STATES, PRODUCE_UNITS } from "@/features/marketplace/constants";

export type PriceSourceType =
  | "PLATFORM_TRANSACTION"
  | "FARMER_REPORTED"
  | "BUYER_REPORTED"
  | "MARKET_SURVEY"
  | "PARTNER_FEED"
  | "GOVERNMENT_SOURCE"
  | "COMMUNITY"
  | "OFFICIAL_MONITOR"
  | "ENUMERATOR"
  | "COOPERATIVE"
  | "OTHER";

export type PriceVerificationStatus =
  | "UNVERIFIED"
  | "SELF_REPORTED"
  | "VERIFIED"
  | "SYSTEM_DERIVED"
  | "REJECTED";

export type NormalizationStatus = "EXACT" | "NORMALIZED" | "UNAVAILABLE";

export type DataQualityLabel = "OBSERVED" | "VERIFIED" | "ESTIMATED" | "SIMULATED";

export type PriceTrendDirection = "RISING" | "FALLING" | "STABLE" | "INSUFFICIENT_DATA";

export type DataSufficiency = "LOW_DATA" | "MODERATE" | "HIGHER_CONFIDENCE";

export interface PriceObservation {
  id: string;
  productId: string;
  productName?: string;
  marketName: string;
  state: string;
  lga: string | null;
  price: number;
  currency: string;
  unit: string;
  normalizedPrice: number | null;
  normalizedUnit: string | null;
  normalizationStatus: NormalizationStatus;
  sourceType: PriceSourceType;
  reportedBy: string | null;
  reporterName?: string;
  verificationStatus: PriceVerificationStatus;
  confidenceScore: number | null;
  dataQualityLabel: DataQualityLabel;
  observedAt: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PriceNormalizationResult {
  normalizedPrice: number | null;
  normalizedUnit: string | null;
  status: NormalizationStatus;
  conversionFactor?: number;
}

export interface PriceTrendResult {
  productId: string;
  state?: string;
  trend: PriceTrendDirection;
  percentageChange: number | null;
  periodDays: number;
  currentPeriodAvg: number | null;
  previousPeriodAvg: number | null;
  observationCount: number;
  lastObservedAt: string | null;
  dataSufficiency: DataSufficiency;
  unit: string;
  currency: string;
}

export interface StatePriceSummary {
  state: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  observationCount: number;
  lastObservedAt: string;
  dataSufficiency: DataSufficiency;
  unit: string;
}

export interface RegionalPriceComparison {
  productId: string;
  productName: string;
  canonicalUnit: string;
  nationalAverage: number | null;
  lowestObserved: {
    state: string;
    price: number;
    marketName: string;
    wording: string;
  } | null;
  highestObserved: {
    state: string;
    price: number;
    marketName: string;
    wording: string;
  } | null;
  stateSummaries: StatePriceSummary[];
  totalObservations: number;
}

export interface PriceAggregation {
  productId: string;
  averagePrice: number | null;
  medianPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  observationCount: number;
  lastObservedAt: string | null;
  dataSufficiency: DataSufficiency;
  unit: string;
  currency: string;
}

// Zod Validation Schemas
export const createPriceObservationSchema = z.object({
  productId: z.string().uuid("Invalid canonical product ID"),
  marketName: z.string().min(2, "Market name must be at least 2 characters").max(150),
  state: z.enum(NIGERIAN_STATES, { errorMap: () => ({ message: "Invalid Nigerian state" }) }),
  lga: z.string().max(100).optional().nullable(),
  price: z.number().positive("Price must be strictly positive"),
  currency: z.literal("NGN").default("NGN"),
  unit: z.enum(PRODUCE_UNITS, { errorMap: () => ({ message: "Invalid produce unit" }) }),
  sourceType: z.enum([
    "PLATFORM_TRANSACTION",
    "FARMER_REPORTED",
    "BUYER_REPORTED",
    "MARKET_SURVEY",
    "PARTNER_FEED",
    "GOVERNMENT_SOURCE",
    "COMMUNITY",
    "OFFICIAL_MONITOR",
    "ENUMERATOR",
    "COOPERATIVE",
    "OTHER",
  ]).default("FARMER_REPORTED"),
  observedAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreatePriceObservationInput = z.infer<typeof createPriceObservationSchema>;

export const priceQueryFilterSchema = z.object({
  productId: z.string().uuid().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  sourceType: z.string().optional(),
  verificationStatus: z.string().optional(),
  dataQualityLabel: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export interface PriceQueryFilter {
  productId?: string;
  state?: string;
  lga?: string;
  sourceType?: string;
  verificationStatus?: string;
  dataQualityLabel?: string;
  limit?: number;
  offset?: number;
}

