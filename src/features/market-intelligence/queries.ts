/**
 * AgroMarket Phase 2.3: Market Intelligence UI Queries
 *
 * Typed server-side queries for Market Intelligence dashboard and admin views.
 * Anonymizes private information, rejects prohibited produce, and handles empty states gracefully.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";

export interface MarketPressureSummary {
  id: string;
  commodity: string;
  state: string;
  pressureScore: number;
  pressureLevel: "LOW" | "MODERATE" | "ELEVATED" | "ACUTE" | "CRITICAL";
  pricePressure: number;
  supplyPressure: number;
  demandPressure: number;
  disruptionPressure: number;
  confidence: number;
  drivers: string[];
  risks: string[];
  evidenceCount: number;
  calculatedAt: string;
}

/**
 * Fetches recent market pressure snapshots
 */
export async function getMarketPressureSnapshots(filters?: {
  commodity?: string;
  state?: string;
  limit?: number;
}): Promise<MarketPressureSummary[]> {
  try {
    if (filters?.commodity) {
      assertNoProhibitedProduce(filters.commodity, "Commodity query");
    }

    const supabase = await createClient();
    let query = supabase
      .from("market_pressure_snapshots")
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
      pressureScore: Number(row.pressure_score),
      pressureLevel: row.pressure_level as MarketPressureSummary["pressureLevel"],
      pricePressure: Number(row.price_pressure),
      supplyPressure: Number(row.supply_pressure),
      demandPressure: Number(row.demand_pressure),
      disruptionPressure: Number(row.disruption_pressure),
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
 * Gets distinct commodities currently having price observations
 */
export async function getObservedCommodities(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("price_observations")
      .select("product_id")
      .limit(100);

    if (error || !data) return [];

    const distinct = Array.from(new Set(data.map((d) => d.product_id).filter(Boolean)));
    return distinct;
  } catch {
    return [];
  }
}
