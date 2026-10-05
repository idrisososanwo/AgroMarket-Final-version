/**
 * AgroMarket Phase 2.5: Demand Intelligence Server Queries
 *
 * Typed server-side queries for Demand Intelligence dashboards and buyer/farmer views.
 * Anonymizes private buyer details, enforces anti-pork checks, and handles empty states.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  DemandPressureLevel,
  DemandTrendDirection,
  DemandVolatilityLevel,
} from "./types";

export interface DemandIntelligenceSummary {
  id: string;
  commodity: string;
  state: string;
  demandPressureScore: number;
  demandPressureLevel: DemandPressureLevel;
  forecastDirection: DemandTrendDirection;
  forecastConfidence: number;
  forecastHorizonDays: number;
  predictedDemandVolume: number;
  volumeUnit: string;
  b2bDemandVolume: number;
  consumerOrdersCount: number;
  consumerOrdersVolume: number;
  sharedPurchaseDemandVolume: number;
  volatilityLevel: DemandVolatilityLevel;
  unmetDemandDetected: boolean;
  demandConcentration: string;
  confidence: number;
  drivers: string[];
  risks: string[];
  evidenceCount: number;
  calculatedAt: string;
}

/**
 * Fetches recent demand intelligence snapshots
 */
export async function getDemandIntelligenceSnapshots(filters?: {
  commodity?: string;
  state?: string;
  limit?: number;
}): Promise<DemandIntelligenceSummary[]> {
  try {
    if (filters?.commodity) {
      assertNoProhibitedProduce(filters.commodity, "Commodity query");
    }

    const supabase = await createClient();
    let query = supabase
      .from("demand_intelligence_snapshots")
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
      commodity: row.commodity,
      state: row.state,
      demandPressureScore: Number(row.demand_pressure_score),
      demandPressureLevel: row.demand_pressure_level as DemandPressureLevel,
      forecastDirection: row.forecast_direction as DemandTrendDirection,
      forecastConfidence: Number(row.forecast_confidence),
      forecastHorizonDays: row.forecast_horizon_days,
      predictedDemandVolume: Number(row.predicted_demand_volume),
      volumeUnit: row.volume_unit,
      b2bDemandVolume: Number(row.b2b_demand_volume),
      consumerOrdersCount: row.consumer_orders_count,
      consumerOrdersVolume: Number(row.consumer_orders_volume),
      sharedPurchaseDemandVolume: Number(row.shared_purchase_demand_volume),
      volatilityLevel: row.volatility_level as DemandVolatilityLevel,
      unmetDemandDetected: row.unmet_demand_detected,
      demandConcentration: row.demand_concentration,
      confidence: Number(row.confidence),
      drivers: row.drivers || [],
      risks: row.risks || [],
      evidenceCount: row.evidence_count,
      calculatedAt: row.calculated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches the latest snapshot for a specific commodity and state
 */
export async function getLatestDemandSnapshot(
  commodity: string,
  state: string
): Promise<DemandIntelligenceSummary | null> {
  assertNoProhibitedProduce(commodity, "Commodity query");
  const snapshots = await getDemandIntelligenceSnapshots({ commodity, state, limit: 1 });
  return snapshots[0] || null;
}
