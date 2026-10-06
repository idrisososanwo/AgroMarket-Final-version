/**
 * AgroMarket Phase 2.6: Supply Matching Server Queries
 *
 * Typed server-side queries for Supply Matching & Coordination Console.
 * Safe from unauthorized mutation, anti-pork verified, with clean empty state handling.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  SupplyMatchingSnapshot,
  SupplyMatchCandidateRecord,
  SupplyCoordinationRecommendationRecord,
  MatchClassification,
  CoordinationType,
  SupplyComponentScoresSummary,
  SupplyMatchingOverviewStats,
} from "./types";

/**
 * Fetches recent supply matching snapshots
 */
export async function getSupplyMatchingSnapshots(filters?: {
  commodity?: string;
  state?: string;
  limit?: number;
}): Promise<SupplyMatchingSnapshot[]> {
  try {
    if (filters?.commodity && filters.commodity !== "ALL") {
      assertNoProhibitedProduce(filters.commodity, "Commodity query");
    }

    const supabase = await createClient();
    let query = supabase
      .from("supply_matching_snapshots")
      .select("*")
      .order("calculated_at", { ascending: false });

    if (filters?.commodity && filters.commodity !== "ALL") {
      query = query.ilike("commodity", `%${filters.commodity}%`);
    }
    if (filters?.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    query = query.limit(filters?.limit || 30);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      demand_id: row.demand_id,
      commodity: row.commodity,
      state: row.state,
      lga: row.lga,
      target_quantity: Number(row.target_quantity),
      matched_quantity: Number(row.matched_quantity),
      remaining_gap: Number(row.remaining_gap),
      unit: row.unit,
      fulfillment_percentage: Number(row.fulfillment_percentage),
      match_classification: row.match_classification as MatchClassification,
      coordination_type: row.coordination_type as CoordinationType,
      match_score: Number(row.match_score),
      component_scores: (row.component_scores as unknown as SupplyComponentScoresSummary) || {
        commodityCompatibility: 0,
        quantityCompatibility: 0,
        locationCompatibility: 0,
        availabilityCompatibility: 0,
        specificationCompatibility: 0,
        processingAggregationFit: 0,
        logisticsCompatibility: 0,
      },
      candidates_count: row.candidates_count,
      aggregation_pool_count: row.aggregation_pool_count,
      processing_required: row.processing_required,
      processing_facility_id: row.processing_facility_id,
      logistics_corridor: row.logistics_corridor,
      constraints: row.constraints || [],
      missing_evidence: row.missing_evidence || [],
      confidence: Number(row.confidence),
      metadata: (row.metadata as Record<string, unknown>) || {},
      calculated_at: row.calculated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches candidates for a specific snapshot
 */
export async function getSupplyMatchCandidates(
  snapshotId: string
): Promise<SupplyMatchCandidateRecord[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("supply_match_candidates")
      .select("*")
      .eq("snapshot_id", snapshotId)
      .order("candidate_score", { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      snapshot_id: row.snapshot_id,
      supply_id: row.supply_id,
      supply_source_type: row.supply_source_type,
      supplier_name: row.supplier_name,
      state: row.state,
      lga: row.lga,
      available_quantity: Number(row.available_quantity),
      allocated_quantity: Number(row.allocated_quantity),
      unit: row.unit,
      candidate_score: Number(row.candidate_score),
      reliability_level: row.reliability_level,
      ready_date: row.ready_date,
      verification_status: row.verification_status,
      distance_tier: row.distance_tier,
      metadata: (row.metadata as Record<string, unknown>) || {},
      created_at: row.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches coordination recommendations
 */
export async function getSupplyCoordinationRecommendations(filters?: {
  status?: string;
  limit?: number;
}): Promise<SupplyCoordinationRecommendationRecord[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("supply_coordination_recommendations")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    query = query.limit(filters?.limit || 20);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      snapshot_id: row.snapshot_id,
      demand_id: row.demand_id,
      recommendation_type: row.recommendation_type,
      title: row.title,
      details: row.details,
      confidence: Number(row.confidence),
      status: row.status,
      actioned_by: row.actioned_by,
      actioned_at: row.actioned_at,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Calculates aggregated statistics for overview dashboard
 */
export async function getSupplyMatchingOverviewStats(): Promise<SupplyMatchingOverviewStats> {
  const snapshots = await getSupplyMatchingSnapshots({ limit: 100 });

  if (snapshots.length === 0) {
    return {
      totalSnapshotsCount: 0,
      activeDemandsCount: 0,
      totalMatchedVolume: 0,
      totalUnmatchedGap: 0,
      averageMatchScore: 0,
      multiSourceAggregationCount: 0,
      processingBottlenecksCount: 0,
      securityDisruptionsCount: 0,
    };
  }

  let totalMatched = 0;
  let totalGap = 0;
  let totalScore = 0;
  let aggCount = 0;
  let procBottlenecks = 0;
  let secDisruptions = 0;

  for (const s of snapshots) {
    totalMatched += s.matched_quantity;
    totalGap += s.remaining_gap;
    totalScore += s.match_score;
    if (s.coordination_type === "MULTI_SOURCE_AGGREGATION") aggCount++;
    if (s.constraints.some((c) => c.toLowerCase().includes("processing"))) procBottlenecks++;
    if (s.constraints.some((c) => c.toLowerCase().includes("security") || c.toLowerCase().includes("corridor"))) {
      secDisruptions++;
    }
  }

  return {
    totalSnapshotsCount: snapshots.length,
    activeDemandsCount: snapshots.filter((s) => s.target_quantity > 0).length,
    totalMatchedVolume: Number(totalMatched.toFixed(2)),
    totalUnmatchedGap: Number(totalGap.toFixed(2)),
    averageMatchScore: Math.round(totalScore / snapshots.length),
    multiSourceAggregationCount: aggCount,
    processingBottlenecksCount: procBottlenecks,
    securityDisruptionsCount: secDisruptions,
  };
}
