/**
 * AgroMarket Phase 2.7: Procurement Intelligence Data Layer
 * Observes real platform evidence across B2B demands, historical orders,
 * supply matches (Phase 2.6), market intelligence (Phase 2.3), production
 * planning (Phase 2.4), demand forecasts (Phase 2.5), and security notices (Phase 1.5).
 *
 * SAFETY INVARIANT:
 * Zero fake records. Returns clean empty arrays and sparse states when tables
 * have no matching data. Enforces strict anti-pork produce rejection.
 */

import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { RawPriceObservation } from "./calculations";
import { SupplierCandidateAllocation } from "./calculations";

export interface LoadedProcurementContext {
  commodity: string;
  state: string;
  targetDemand: {
    id: string;
    buyerId?: string;
    title: string;
    quantity: number;
    unit: string;
    desiredDeliveryDate?: string | null;
    targetPricePerUnit?: number | null;
    requiresProcessing?: boolean;
    specifications?: Record<string, unknown>;
    notes?: string | null;
  } | null;
  matchedSupply: {
    matchedQuantity: number;
    remainingGap: number;
    matchScore: number;
    candidateCount: number;
    candidates: SupplierCandidateAllocation[];
    isAggregatedPoolPresent: boolean;
    requiresProcessing: boolean;
    processingFacilityAvailable: boolean;
    alternativeRegionalSupplyAvailable: boolean;
    logisticsCorridor?: string | null;
    constraints: string[];
  };
  marketIntelligence: {
    marketPressureScore: number | null;
    marketPressureLevel: string | null;
    priceObservations: RawPriceObservation[];
    priceTrend: string | null;
  };
  demandIntelligence: {
    demandPressureScore: number | null;
    demandTrendDirection: string | null;
    demandVolatilityLevel: string | null;
  };
  productionPlanning: {
    opportunityScore: number | null;
    riskScore: number | null;
    seasonalFit: string | null;
    upcomingHarvestForecastQuantity: number;
  };
  securityStatus: {
    securityDisruptionReported: boolean;
    corridorDisruptionReported: boolean;
    activeIncidentCount: number;
  };
}

/**
 * Loads real platform data for procurement intelligence evaluation
 */
export async function loadProcurementContext(
  commodity: string,
  state: string,
  demandId?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
): Promise<LoadedProcurementContext> {
  assertNoProhibitedProduce(commodity, "Commodity");

  const defaultContext: LoadedProcurementContext = {
    commodity,
    state,
    targetDemand: null,
    matchedSupply: {
      matchedQuantity: 0,
      remainingGap: 0,
      matchScore: 0,
      candidateCount: 0,
      candidates: [],
      isAggregatedPoolPresent: false,
      requiresProcessing: false,
      processingFacilityAvailable: false,
      alternativeRegionalSupplyAvailable: false,
      constraints: [],
    },
    marketIntelligence: {
      marketPressureScore: null,
      marketPressureLevel: null,
      priceObservations: [],
      priceTrend: null,
    },
    demandIntelligence: {
      demandPressureScore: null,
      demandTrendDirection: null,
      demandVolatilityLevel: null,
    },
    productionPlanning: {
      opportunityScore: null,
      riskScore: null,
      seasonalFit: null,
      upcomingHarvestForecastQuantity: 0,
    },
    securityStatus: {
      securityDisruptionReported: false,
      corridorDisruptionReported: false,
      activeIncidentCount: 0,
    },
  };

  if (!supabase) {
    return defaultContext;
  }

  try {
    // 1. Fetch Target B2B Demand
    if (demandId) {
      const { data: demandData } = await supabase
        .from("b2b_demands")
        .select("id, buyer_id, title, commodity_or_product, quantity, unit, desired_delivery_date, target_price_per_unit, specifications, notes")
        .eq("id", demandId)
        .maybeSingle();

      if (demandData) {
        defaultContext.targetDemand = {
          id: demandData.id,
          buyerId: demandData.buyer_id,
          title: demandData.title,
          quantity: Number(demandData.quantity) || 0,
          unit: demandData.unit || "KG",
          desiredDeliveryDate: demandData.desired_delivery_date || null,
          targetPricePerUnit: demandData.target_price_per_unit ? Number(demandData.target_price_per_unit) : null,
          specifications: demandData.specifications || {},
          notes: demandData.notes || null,
        };
      }
    } else {
      // Find latest active B2B demand for this commodity and state
      const { data: recentDemands } = await supabase
        .from("b2b_demands")
        .select("id, buyer_id, title, commodity_or_product, quantity, unit, desired_delivery_date, target_price_per_unit, specifications, notes")
        .ilike("commodity_or_product", `%${commodity}%`)
        .eq("state", state)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentDemands && recentDemands.length > 0) {
        const d = recentDemands[0];
        defaultContext.targetDemand = {
          id: d.id,
          buyerId: d.buyer_id,
          title: d.title,
          quantity: Number(d.quantity) || 0,
          unit: d.unit || "KG",
          desiredDeliveryDate: d.desired_delivery_date || null,
          targetPricePerUnit: d.target_price_per_unit ? Number(d.target_price_per_unit) : null,
          specifications: d.specifications || {},
          notes: d.notes || null,
        };
      }
    }

    // 2. Fetch Latest Supply Matching Snapshot (Phase 2.6)
    const { data: matchingSnapshots } = await supabase
      .from("supply_matching_snapshots")
      .select("id, matched_quantity, remaining_gap, match_score, candidates_count, processing_required, logistics_corridor, constraints")
      .ilike("commodity", `%${commodity}%`)
      .eq("state", state)
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (matchingSnapshots && matchingSnapshots.length > 0) {
      const ms = matchingSnapshots[0];
      defaultContext.matchedSupply.matchedQuantity = Number(ms.matched_quantity) || 0;
      defaultContext.matchedSupply.remainingGap = Number(ms.remaining_gap) || 0;
      defaultContext.matchedSupply.matchScore = Number(ms.match_score) || 0;
      defaultContext.matchedSupply.candidateCount = Number(ms.candidates_count) || 0;
      defaultContext.matchedSupply.requiresProcessing = Boolean(ms.processing_required);
      defaultContext.matchedSupply.logisticsCorridor = ms.logistics_corridor || null;
      defaultContext.matchedSupply.constraints = Array.isArray(ms.constraints) ? ms.constraints : [];

      // Fetch candidates if snapshot id exists
      if (ms.id) {
        const { data: candidateRecords } = await supabase
          .from("supply_match_candidates")
          .select("supply_id, supplier_name, allocated_quantity")
          .eq("snapshot_id", ms.id)
          .limit(10);

        if (candidateRecords && candidateRecords.length > 0) {
          defaultContext.matchedSupply.candidates = candidateRecords.map(
            (c: { supply_id: string; supplier_name: string; allocated_quantity: number }) => ({
              supplierId: c.supply_id,
              supplierName: c.supplier_name,
              allocatedQuantity: Number(c.allocated_quantity) || 0,
            })
          );
        }
      }
    }

    // 3. Fetch Real Price Observations (Phase 0.9 / 2.3)
    const { data: priceObs } = await supabase
      .from("price_observations")
      .select("price_per_unit, observed_at")
      .ilike("commodity_or_product", `%${commodity}%`)
      .eq("state", state)
      .order("observed_at", { ascending: false })
      .limit(15);

    if (priceObs && priceObs.length > 0) {
      defaultContext.marketIntelligence.priceObservations = priceObs.map(
        (p: { price_per_unit: number; observed_at: string }) => ({
          pricePerUnit: Number(p.price_per_unit),
          observedAt: p.observed_at,
        })
      );
    }

    // 4. Fetch Market Intelligence Snapshot (Phase 2.3)
    const { data: marketSnapshots } = await supabase
      .from("market_intelligence_snapshots")
      .select("market_pressure_score, market_pressure_level, price_trend")
      .ilike("commodity", `%${commodity}%`)
      .eq("state", state)
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (marketSnapshots && marketSnapshots.length > 0) {
      defaultContext.marketIntelligence.marketPressureScore = Number(marketSnapshots[0].market_pressure_score) || null;
      defaultContext.marketIntelligence.marketPressureLevel = marketSnapshots[0].market_pressure_level || null;
      defaultContext.marketIntelligence.priceTrend = marketSnapshots[0].price_trend || null;
    }

    // 5. Fetch Demand Intelligence Snapshot (Phase 2.5)
    const { data: demandSnapshots } = await supabase
      .from("demand_intelligence_snapshots")
      .select("demand_pressure_score, demand_trend_direction, demand_volatility_level")
      .ilike("commodity", `%${commodity}%`)
      .eq("state", state)
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (demandSnapshots && demandSnapshots.length > 0) {
      defaultContext.demandIntelligence.demandPressureScore = Number(demandSnapshots[0].demand_pressure_score) || null;
      defaultContext.demandIntelligence.demandTrendDirection = demandSnapshots[0].demand_trend_direction || null;
      defaultContext.demandIntelligence.demandVolatilityLevel = demandSnapshots[0].demand_volatility_level || null;
    }

    // 6. Fetch Production Planning Snapshot (Phase 2.4)
    const { data: productionSnapshots } = await supabase
      .from("production_planning_snapshots")
      .select("opportunity_score, risk_score, seasonal_fit, metadata")
      .ilike("commodity", `%${commodity}%`)
      .eq("state", state)
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (productionSnapshots && productionSnapshots.length > 0) {
      const ps = productionSnapshots[0];
      defaultContext.productionPlanning.opportunityScore = Number(ps.opportunity_score) || null;
      defaultContext.productionPlanning.riskScore = Number(ps.risk_score) || null;
      defaultContext.productionPlanning.seasonalFit = ps.seasonal_fit || null;
      if (ps.metadata && typeof ps.metadata.expected_volume === "number") {
        defaultContext.productionPlanning.upcomingHarvestForecastQuantity = ps.metadata.expected_volume;
      }
    }

    // 7. Fetch Security Incidents (Phase 1.5)
    const { data: incidents } = await supabase
      .from("security_incidents")
      .select("id, severity, impact_type")
      .eq("state", state)
      .eq("status", "ACTIVE")
      .limit(5);

    if (incidents && incidents.length > 0) {
      defaultContext.securityStatus.activeIncidentCount = incidents.length;
      defaultContext.securityStatus.securityDisruptionReported = incidents.some(
        (i: { severity: string }) => i.severity === "HIGH" || i.severity === "CRITICAL"
      );
      defaultContext.securityStatus.corridorDisruptionReported = true;
    }
  } catch (err) {
    // Log softly and return fallback context
    console.warn("loadProcurementContext encountered error; continuing with sparse context:", err);
  }

  return defaultContext;
}
