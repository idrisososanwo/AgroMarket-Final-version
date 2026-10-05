/**
 * AgroMarket Phase 2.1: Deterministic Confidence Model
 *
 * Confidence is explicitly grounded in evidence quality rather than subjective probabilistic feelings.
 * Factors evaluated:
 * 1. Source Reliability (platform transactions, official feeds vs self-reported)
 * 2. Observation Sample Size (statistical support)
 * 3. Recency Decay (staleness over days)
 * 4. Data Consistency (variance / agreement among multiple reports)
 * 5. Verification Status & Geographic Resolution
 */

export interface ConfidenceFactors {
  sourceType?: string;
  sourceReliability?: number; // 0.0 to 1.0
  sampleCount?: number; // Number of supporting data points
  recencyDays?: number; // Days since oldest relevant evidence
  varianceRatio?: number; // Relative spread (stdDev / mean), 0.0 = perfect agreement
  isVerified?: boolean;
  geographicScope?: "EXACT_LGA" | "SAME_STATE" | "CORRIDOR" | "NATIONAL";
}

export type ConfidenceTier = "VERY_LOW" | "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";

/**
 * Standard baseline reliability lookup by evidence source
 */
export const SOURCE_RELIABILITY_MAP: Record<string, number> = {
  PLATFORM_TRANSACTION: 1.0,
  DELIVERY_EVENT: 0.95,
  SECURITY_INCIDENT: 0.9,
  PROCESSING_EVENT: 0.9,
  OFFICIAL_MONITOR: 0.9,
  GOVERNMENT_SOURCE: 0.88,
  ORDER_HISTORY: 0.85,
  B2B_DEMAND: 0.85,
  ENUMERATOR: 0.8,
  PARTNER_FEED: 0.75,
  SHARED_PURCHASE: 0.75,
  EQUIPMENT_ACTIVITY: 0.7,
  PRICE_OBSERVATION: 0.65,
  FARMER_REPORTED: 0.6,
  BUYER_REPORTED: 0.6,
  MARKET_SURVEY: 0.6,
  SEASONAL_CALENDAR: 0.65,
  KNOWLEDGE_BULLETIN: 0.6,
  COMMUNITY_REPORT: 0.45,
  SELF_REPORTED: 0.4,
  UNVERIFIED: 0.3,
  OTHER: 0.3,
};

/**
 * Deterministically computes confidence score in range [0.05, 0.99]
 */
export function calculateEvidenceConfidence(factors: ConfidenceFactors): number {
  // 1. Source Reliability
  let reliability = factors.sourceReliability ?? 0.5;
  if (factors.sourceType && SOURCE_RELIABILITY_MAP[factors.sourceType] !== undefined) {
    reliability = SOURCE_RELIABILITY_MAP[factors.sourceType];
  }

  // Verification multiplier
  const verificationMultiplier = factors.isVerified ? 1.0 : 0.85;

  // 2. Sample count weight
  const samples = Math.max(1, factors.sampleCount ?? 1);
  // Logarithmic scaling: 1 sample = 0.60, 3 samples = 0.75, 7 samples = 0.90, 15+ = 1.0
  const sampleWeight = Math.min(1.0, 0.45 + 0.18 * Math.log2(samples + 1));

  // 3. Recency decay over a 30-day half-life curve
  const recency = Math.max(0, factors.recencyDays ?? 0);
  // e.g. 0-2 days = 1.0, 7 days = 0.86, 14 days = 0.72, 30 days = 0.40, floor at 0.15
  const recencyDecay = Math.max(0.15, 1.0 - (recency / 35) * 0.7);

  // 4. Variance / Agreement penalty
  const variance = Math.max(0, factors.varianceRatio ?? 0);
  const consistencyModifier = Math.max(0.5, 1.0 - Math.min(0.5, variance * 0.5));

  // 5. Geographic scope precision
  let geoMultiplier = 1.0;
  if (factors.geographicScope === "EXACT_LGA") geoMultiplier = 1.0;
  else if (factors.geographicScope === "SAME_STATE") geoMultiplier = 0.92;
  else if (factors.geographicScope === "CORRIDOR") geoMultiplier = 0.85;
  else if (factors.geographicScope === "NATIONAL") geoMultiplier = 0.7;

  // Composite calculation
  const composite =
    reliability *
    verificationMultiplier *
    sampleWeight *
    recencyDecay *
    consistencyModifier *
    geoMultiplier;

  // Bound strictly between 0.05 and 0.99 with 3 decimal precision
  const bounded = Math.max(0.05, Math.min(0.99, composite));
  return Math.round(bounded * 1000) / 1000;
}

export function getConfidenceTier(score: number): ConfidenceTier {
  if (score >= 0.85) return "VERY_HIGH";
  if (score >= 0.7) return "HIGH";
  if (score >= 0.5) return "MODERATE";
  if (score >= 0.3) return "LOW";
  return "VERY_LOW";
}
