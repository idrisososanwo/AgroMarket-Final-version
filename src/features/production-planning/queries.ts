/**
 * AgroMarket Phase 2.4: Production Intelligence Server Queries
 *
 * Typed server-side queries for Production Planning dashboards and farmer views.
 * Anonymizes private producer details, enforces anti-pork checks, and handles empty states.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { ProductionDomain } from "./types";

export interface ProductionPlanningSummary {
  id: string;
  commodity: string;
  state: string;
  domain: ProductionDomain;
  opportunityScore: number;
  riskScore: number;
  opportunityLevel: "LOW" | "MODERATE" | "ATTRACTIVE" | "HIGH_OPPORTUNITY";
  riskLevel: "LOW" | "MODERATE" | "ELEVATED" | "HIGH_RISK";
  marketDemandStatus: string;
  supplyBalanceStatus: string;
  seasonalAlignment: "PEAK_WINDOW" | "ACTIVE_SEASON" | "OFF_SEASON" | "INSUFFICIENT_DATA";
  inputConstraintLevel: "NONE" | "MODERATE" | "SEVERE" | "INSUFFICIENT_DATA";
  processingConstraintLevel: "NONE" | "MODERATE" | "BOTTLENECK" | "INSUFFICIENT_DATA";
  confidence: number;
  opportunities: string[];
  risks: string[];
  constraints: string[];
  evidenceCount: number;
  calculatedAt: string;
}

/**
 * Fetches recent production planning snapshots
 */
export async function getProductionPlanningSnapshots(filters?: {
  commodity?: string;
  state?: string;
  domain?: string;
  limit?: number;
}): Promise<ProductionPlanningSummary[]> {
  try {
    if (filters?.commodity) {
      assertNoProhibitedProduce(filters.commodity, "Commodity query");
    }

    const supabase = await createClient();
    let query = supabase
      .from("production_planning_snapshots")
      .select("*")
      .order("calculated_at", { ascending: false });

    if (filters?.commodity && filters.commodity !== "ALL") {
      query = query.ilike("commodity", `%${filters.commodity}%`);
    }
    if (filters?.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters?.domain && filters.domain !== "ALL") {
      query = query.eq("domain", filters.domain);
    }
    query = query.limit(filters?.limit || 30);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      commodity: row.commodity,
      state: row.state,
      domain: row.domain as ProductionDomain,
      opportunityScore: Number(row.opportunity_score),
      riskScore: Number(row.risk_score),
      opportunityLevel: row.opportunity_level as ProductionPlanningSummary["opportunityLevel"],
      riskLevel: row.risk_level as ProductionPlanningSummary["riskLevel"],
      marketDemandStatus: row.market_demand_status,
      supplyBalanceStatus: row.supply_balance_status,
      seasonalAlignment: row.seasonal_alignment as ProductionPlanningSummary["seasonalAlignment"],
      inputConstraintLevel: row.input_constraint_level as ProductionPlanningSummary["inputConstraintLevel"],
      processingConstraintLevel: row.processing_constraint_level as ProductionPlanningSummary["processingConstraintLevel"],
      confidence: Number(row.confidence),
      opportunities: row.opportunities || [],
      risks: row.risks || [],
      constraints: row.constraints || [],
      evidenceCount: row.evidence_count,
      calculatedAt: row.calculated_at,
    }));
  } catch {
    return [];
  }
}
