/**
 * AgroMarket Phase 3.12: Agricultural Dependency Graph Constants
 *
 * Establishes analytical limits, concentration thresholds, and advisory standards:
 * - Traversal limits to protect against unbounded recursion
 * - Concentration thresholds aligned with Phase 2.8 Food Security & 2.9 Logistics
 * - Sample size thresholds to enforce INSUFFICIENT_DATA protections
 */

// -----------------------------------------------------------------------------
// 1. TRAVERSAL & CIRCUIT BREAKER LIMITS
// -----------------------------------------------------------------------------
export const DEFAULT_MAX_TRAVERSAL_DEPTH = 3;
export const ABSOLUTE_MAX_TRAVERSAL_DEPTH = 5;
export const MAX_TRAVERSAL_NODES = 100;
export const MAX_TRAVERSAL_EDGES = 250;

// -----------------------------------------------------------------------------
// 2. CONCENTRATION & BOTTLENECK THRESHOLDS
// Reused from Phase 2.8 (Food Security) and Phase 2.9 (Logistics)
// -----------------------------------------------------------------------------
export const CONCENTRATION_THRESHOLDS = {
  NORMAL_MAX: 29.99,
  CONCENTRATED_MIN: 30.0,
  CONCENTRATED_MAX: 49.99,
  HIGH_DEPENDENCY_MIN: 50.0,
  HIGH_DEPENDENCY_MAX: 74.99,
  CRITICAL_DEPENDENCY_MIN: 75.0,
} as const;

export const MIN_OBSERVATION_SAMPLE_SIZE = 3;

// -----------------------------------------------------------------------------
// 3. ADVISORY DISCLAIMERS
// -----------------------------------------------------------------------------
export const DEPENDENCY_ADVISORY_DISCLAIMER =
  "Advisory Network Intelligence: Dependency graph connections, concentration ratios, and cascade paths represent correlated systemic exposures, not guaranteed physical causality. No autonomous actions or re-routings are executed.";

export const ALTERNATIVE_PATH_CAVEAT =
  "ALTERNATIVE != GUARANTEED_CAPACITY: Identified alternative facilities, suppliers, or corridors are structural candidates. Operational availability, throughput capacity, and logistics feasibility must be verified before rerouting.";
