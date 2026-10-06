/**
 * AgroMarket Phase 2.9: Logistics Intelligence Server Queries
 * Provides privacy-preserving, verified, and aggregate data access for movement dashboards.
 */

import { createClient } from "@/lib/supabase/server";
import {
  LogisticsIntelligenceSnapshotRecord,
  LogisticsCorridorDependencyItem,
  LogisticsBottleneckItem,
  LogisticsRecommendationRecord,
  LogisticsOverviewStats,
} from "./types";

/**
 * Fetches recent logistics intelligence snapshots
 */
export async function getLogisticsSnapshots(
  options: {
    limit?: number;
    state?: string;
    corridor?: string;
    commodity?: string;
  } = {}
): Promise<LogisticsIntelligenceSnapshotRecord[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("logistics_intelligence_snapshots")
      .select("*")
      .order("calculated_at", { ascending: false })
      .limit(options.limit || 30);

    if (options.state) {
      query = query.eq("state", options.state);
    }
    if (options.corridor) {
      query = query.ilike("corridor", `%${options.corridor}%`);
    }
    if (options.commodity) {
      query = query.ilike("commodity", `%${options.commodity}%`);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      pressure_score: Number(row.pressure_score),
      resilience_score: Number(row.resilience_score),
      confidence: Number(row.confidence),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches critical corridor dependencies
 */
export async function getLogisticsDependencies(
  options: {
    limit?: number;
    state?: string;
    corridor?: string;
  } = {}
): Promise<LogisticsCorridorDependencyItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("logistics_corridor_dependencies")
      .select("*")
      .order("observed_at", { ascending: false })
      .limit(options.limit || 30);

    if (options.state) {
      query = query.eq("state", options.state);
    }
    if (options.corridor) {
      query = query.ilike("corridor", `%${options.corridor}%`);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      movementShare: Number(row.movement_share),
      thresholdExceeded: Number(row.threshold_exceeded),
      alternativeOptionsAvailable: Number(row.alternative_options_available),
      confidence: Number(row.confidence),
      dominantEntity: row.dominant_entity,
      dependencyType: row.dependency_type,
      riskAssessment: row.risk_assessment,
      observedAt: row.observed_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches detected logistics bottlenecks
 */
export async function getLogisticsBottlenecks(
  options: {
    limit?: number;
    state?: string;
    corridor?: string;
  } = {}
): Promise<LogisticsBottleneckItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("logistics_bottlenecks")
      .select("*")
      .order("last_observed_at", { ascending: false })
      .limit(options.limit || 30);

    if (options.state) {
      query = query.eq("state", options.state);
    }
    if (options.corridor) {
      query = query.ilike("corridor", `%${options.corridor}%`);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      bottleneckType: row.bottleneck_type,
      affectedScope: row.affected_scope,
      alternativeAvailable: Boolean(row.alternative_available),
      recommendedAction: row.recommended_action,
      confidence: Number(row.confidence),
      firstObservedAt: row.first_observed_at,
      lastObservedAt: row.last_observed_at,
      resolvedAt: row.resolved_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches logistics recommendations
 */
export async function getLogisticsRecommendations(
  options: {
    limit?: number;
    state?: string;
    status?: string;
  } = {}
): Promise<LogisticsRecommendationRecord[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("logistics_recommendations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(options.limit || 30);

    if (options.state) {
      query = query.eq("state", options.state);
    }
    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      confidence: Number(row.confidence),
      evidenceCitations: Array.isArray(row.evidence_citations)
        ? (row.evidence_citations as Array<{
            sourceType: string;
            description: string;
            relevance: number;
          }>)
        : [],
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      actionedBy: row.actioned_by,
      actionedAt: row.actioned_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Computes high-level aggregated statistics for the executive dashboard
 */
export async function getLogisticsOverviewStats(): Promise<LogisticsOverviewStats> {
  const defaultStats: LogisticsOverviewStats = {
    averagePressureScore: 0,
    averageResilienceScore: 0,
    activeBottlenecksCount: 0,
    criticalDependenciesCount: 0,
    pendingRecommendationsCount: 0,
    activeDeliveriesCount: 0,
    activeProvidersCount: 0,
    evaluatedCorridorsCount: 0,
  };

  try {
    const supabase = await createClient();

    // 1. Snapshots aggregates
    const { data: snapshots } = await supabase
      .from("logistics_intelligence_snapshots")
      .select("pressure_score, resilience_score, corridor")
      .limit(50);

    if (snapshots && snapshots.length > 0) {
      const totalPressure = snapshots.reduce(
        (sum, s) => sum + (Number(s.pressure_score) || 0),
        0
      );
      const totalResilience = snapshots.reduce(
        (sum, s) => sum + (Number(s.resilience_score) || 0),
        0
      );
      defaultStats.averagePressureScore =
        Math.round((totalPressure / snapshots.length) * 10) / 10;
      defaultStats.averageResilienceScore =
        Math.round((totalResilience / snapshots.length) * 10) / 10;

      const uniqueCorridors = new Set(
        snapshots.map((s) => s.corridor).filter(Boolean)
      );
      defaultStats.evaluatedCorridorsCount = uniqueCorridors.size;
    }

    // 2. Active Bottlenecks count
    const { count: bottlenecksCount } = await supabase
      .from("logistics_bottlenecks")
      .select("*", { count: "exact", head: true })
      .in("status", ["IDENTIFIED", "INVESTIGATING"]);

    if (typeof bottlenecksCount === "number") {
      defaultStats.activeBottlenecksCount = bottlenecksCount;
    }

    // 3. Dependencies count
    const { count: depsCount } = await supabase
      .from("logistics_corridor_dependencies")
      .select("*", { count: "exact", head: true })
      .eq("status", "ACTIVE");

    if (typeof depsCount === "number") {
      defaultStats.criticalDependenciesCount = depsCount;
    }

    // 4. Pending Recommendations count
    const { count: recsCount } = await supabase
      .from("logistics_recommendations")
      .select("*", { count: "exact", head: true })
      .eq("status", "PROPOSED");

    if (typeof recsCount === "number") {
      defaultStats.pendingRecommendationsCount = recsCount;
    }

    // 5. Active Deliveries count
    const { count: deliveriesCount } = await supabase
      .from("deliveries")
      .select("*", { count: "exact", head: true })
      .in("status", ["IN_TRANSIT", "OUT_FOR_DELIVERY", "PICKED_UP"]);

    if (typeof deliveriesCount === "number") {
      defaultStats.activeDeliveriesCount = deliveriesCount;
    }

    // 6. Active Providers count
    const { count: providersCount } = await supabase
      .from("logistics_providers")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (typeof providersCount === "number") {
      defaultStats.activeProvidersCount = providersCount;
    }

    return defaultStats;
  } catch {
    return defaultStats;
  }
}
