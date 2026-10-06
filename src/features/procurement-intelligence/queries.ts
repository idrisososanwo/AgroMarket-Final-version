/**
 * AgroMarket Phase 2.7: Procurement Intelligence Server Queries
 * Privacy-preserving data access for procurement consoles and dashboards.
 */

import { createClient } from "@/lib/supabase/server";
import {
  ProcurementIntelligenceSnapshot,
  ProcurementOpportunityRecord,
  ProcurementRecommendationRecord,
  ProcurementOverviewStats,
} from "./types";

/**
 * Fetches recent procurement intelligence snapshots
 */
export async function getProcurementSnapshots(
  options: {
    limit?: number;
    commodity?: string;
    state?: string;
  } = {}
): Promise<ProcurementIntelligenceSnapshot[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("procurement_intelligence_snapshots")
      .select("*")
      .order("calculated_at", { ascending: false })
      .limit(options.limit || 20);

    if (options.commodity) {
      query = query.ilike("commodity", `%${options.commodity}%`);
    }
    if (options.state) {
      query = query.eq("state", options.state);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      target_quantity: Number(row.target_quantity),
      matched_quantity: Number(row.matched_quantity),
      supply_gap: Number(row.supply_gap),
      fulfillment_percentage: Number(row.fulfillment_percentage),
      procurement_priority_score: Number(row.procurement_priority_score),
      confidence: Number(row.confidence),
      concentration_ratio: row.concentration_ratio ? Number(row.concentration_ratio) : null,
      observed_price_min: row.observed_price_min ? Number(row.observed_price_min) : null,
      observed_price_max: row.observed_price_max ? Number(row.observed_price_max) : null,
      observed_price_median: row.observed_price_median ? Number(row.observed_price_median) : null,
      estimated_procurement_cost: row.estimated_procurement_cost ? Number(row.estimated_procurement_cost) : null,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches procurement opportunities
 */
export async function getProcurementOpportunities(
  options: {
    limit?: number;
    status?: string;
  } = {}
): Promise<ProcurementOpportunityRecord[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("procurement_opportunities")
      .select("*")
      .order("priority_score", { ascending: false })
      .limit(options.limit || 20);

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      required_quantity: Number(row.required_quantity),
      matched_quantity: Number(row.matched_quantity),
      unmatched_gap: Number(row.unmatched_gap),
      priority_score: Number(row.priority_score),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches advisory procurement recommendations
 */
export async function getProcurementRecommendations(
  options: {
    limit?: number;
    status?: string;
  } = {}
): Promise<ProcurementRecommendationRecord[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("procurement_recommendations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(options.limit || 20);

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      confidence: Number(row.confidence),
    }));
  } catch {
    return [];
  }
}

/**
 * Calculates high-level aggregate procurement statistics
 */
export async function getProcurementOverviewStats(): Promise<ProcurementOverviewStats> {
  const defaultStats: ProcurementOverviewStats = {
    openOpportunitiesCount: 0,
    highPriorityCount: 0,
    partiallySourcedCount: 0,
    fullySourcedCount: 0,
    totalVolumeRequired: 0,
    totalVolumeSourced: 0,
    totalVolumeGap: 0,
    highRiskCount: 0,
    concentrationRiskCount: 0,
    processingConstrainedCount: 0,
    securityConstrainedCount: 0,
  };

  try {
    const supabase = await createClient();
    const { data: snapshots, error } = await supabase
      .from("procurement_intelligence_snapshots")
      .select("*")
      .order("calculated_at", { ascending: false })
      .limit(100);

    if (error || !snapshots || snapshots.length === 0) {
      return defaultStats;
    }

    let openOpportunitiesCount = 0;
    let highPriorityCount = 0;
    let partiallySourcedCount = 0;
    let fullySourcedCount = 0;
    let totalVolumeRequired = 0;
    let totalVolumeSourced = 0;
    let totalVolumeGap = 0;
    let highRiskCount = 0;
    let concentrationRiskCount = 0;
    let processingConstrainedCount = 0;
    let securityConstrainedCount = 0;

    for (const snap of snapshots) {
      if (snap.opportunity_status === "OPEN") openOpportunitiesCount++;
      if (snap.opportunity_status === "PARTIALLY_SOURCED") partiallySourcedCount++;
      if (snap.opportunity_status === "SOURCED") fullySourcedCount++;

      const priorityScore = Number(snap.procurement_priority_score) || 0;
      if (priorityScore >= 60) highPriorityCount++;

      totalVolumeRequired += Number(snap.target_quantity) || 0;
      totalVolumeSourced += Number(snap.matched_quantity) || 0;
      totalVolumeGap += Number(snap.supply_gap) || 0;

      if (snap.procurement_risk_level === "HIGH" || snap.procurement_risk_level === "CRITICAL") {
        highRiskCount++;
      }
      if (snap.supplier_concentration_detected) {
        concentrationRiskCount++;
      }
      if (snap.processing_required) {
        processingConstrainedCount++;
      }
      if (snap.security_disruption_flag) {
        securityConstrainedCount++;
      }
    }

    return {
      openOpportunitiesCount,
      highPriorityCount,
      partiallySourcedCount,
      fullySourcedCount,
      totalVolumeRequired: Math.round(totalVolumeRequired * 10) / 10,
      totalVolumeSourced: Math.round(totalVolumeSourced * 10) / 10,
      totalVolumeGap: Math.round(totalVolumeGap * 10) / 10,
      highRiskCount,
      concentrationRiskCount,
      processingConstrainedCount,
      securityConstrainedCount,
    };
  } catch {
    return defaultStats;
  }
}
