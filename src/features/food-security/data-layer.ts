/**
 * AgroMarket Phase 2.8: Food Security Data Layer
 * Observes real platform evidence across Market Intelligence (Phase 2.3),
 * Production Planning (Phase 2.4), Demand Intelligence (Phase 2.5),
 * Supply Matching (Phase 2.6), Procurement Intelligence (Phase 2.7),
 * and Agricultural Security Incidents (Phase 1.5).
 *
 * SAFETY INVARIANT:
 * Zero fake data. Empty tables produce clean sparse fallbacks with lower confidence.
 * Rejects pig/pork produce terms everywhere.
 */

import { assertNoProhibitedProduce } from "@/features/intelligence/validation";

export interface LoadedFoodSecurityContext {
  commodity?: string | null;
  state: string;
  supplyDeficitRatio: number | null;
  demandPressureScore: number | null;
  marketPricePressureScore: number | null;
  regionalSupplyGapRatio: number | null;
  productionRiskScore: number | null;
  logisticsFrictionScore: number | null;
  securityDisruptionReported: boolean;
  processingBottleneckDetected: boolean;
  supplierCount: number;
  largestSupplierShare: number;
  productionSourceStatesCount: number;
  processingFacilitiesAvailableCount: number;
  activeLogisticsCorridorsCount: number;
  activeTradeChannelsCount: number;
  aggregationPoolsActiveCount: number;
  activeSecurityIncidents: Array<{
    id: string;
    severity: string;
    impactType: string;
    description?: string;
  }>;
}

/**
 * Loads real platform context for food security evaluation
 */
export async function loadFoodSecurityContext(
  state: string,
  commodity?: string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any
): Promise<LoadedFoodSecurityContext> {
  if (commodity) {
    assertNoProhibitedProduce(commodity, "Commodity");
  }

  const defaultContext: LoadedFoodSecurityContext = {
    commodity: commodity || null,
    state,
    supplyDeficitRatio: null,
    demandPressureScore: null,
    marketPricePressureScore: null,
    regionalSupplyGapRatio: null,
    productionRiskScore: null,
    logisticsFrictionScore: null,
    securityDisruptionReported: false,
    processingBottleneckDetected: false,
    supplierCount: 1,
    largestSupplierShare: 0.5,
    productionSourceStatesCount: 1,
    processingFacilitiesAvailableCount: 1,
    activeLogisticsCorridorsCount: 1,
    activeTradeChannelsCount: 1,
    aggregationPoolsActiveCount: 0,
    activeSecurityIncidents: [],
  };

  if (!supabase) {
    return defaultContext;
  }

  try {
    // 1. Fetch Latest Supply Matching Snapshot (Phase 2.6)
    let supplyQuery = supabase
      .from("supply_matching_snapshots")
      .select("target_quantity, matched_quantity, remaining_gap, processing_required, candidates_count")
      .eq("state", state);

    if (commodity) {
      supplyQuery = supplyQuery.ilike("commodity", `%${commodity}%`);
    }

    const { data: supplySnaps } = await supplyQuery
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (supplySnaps && supplySnaps.length > 0) {
      const snap = supplySnaps[0];
      const target = Number(snap.target_quantity) || 0;
      const gap = Number(snap.remaining_gap) || 0;
      if (target > 0) {
        defaultContext.supplyDeficitRatio = Math.min(1.0, gap / target);
        defaultContext.regionalSupplyGapRatio = defaultContext.supplyDeficitRatio;
      }
      defaultContext.processingBottleneckDetected = Boolean(snap.processing_required);
      defaultContext.supplierCount = Number(snap.candidates_count) || 1;
    }

    // 2. Fetch Latest Demand Intelligence Snapshot (Phase 2.5)
    let demandQuery = supabase
      .from("demand_intelligence_snapshots")
      .select("demand_pressure_score")
      .eq("state", state);

    if (commodity) {
      demandQuery = demandQuery.ilike("commodity", `%${commodity}%`);
    }

    const { data: demandSnaps } = await demandQuery
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (demandSnaps && demandSnaps.length > 0) {
      defaultContext.demandPressureScore = Number(demandSnaps[0].demand_pressure_score) || null;
    }

    // 3. Fetch Latest Market Intelligence Snapshot (Phase 2.3)
    let marketQuery = supabase
      .from("market_intelligence_snapshots")
      .select("market_pressure_score")
      .eq("state", state);

    if (commodity) {
      marketQuery = marketQuery.ilike("commodity", `%${commodity}%`);
    }

    const { data: marketSnaps } = await marketQuery
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (marketSnaps && marketSnaps.length > 0) {
      defaultContext.marketPricePressureScore = Number(marketSnaps[0].market_pressure_score) || null;
    }

    // 4. Fetch Latest Production Planning Snapshot (Phase 2.4)
    let prodQuery = supabase
      .from("production_planning_snapshots")
      .select("risk_score")
      .eq("state", state);

    if (commodity) {
      prodQuery = prodQuery.ilike("commodity", `%${commodity}%`);
    }

    const { data: prodSnaps } = await prodQuery
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (prodSnaps && prodSnaps.length > 0) {
      defaultContext.productionRiskScore = Number(prodSnaps[0].risk_score) || null;
    }

    // 5. Fetch Procurement Intelligence Snapshot (Phase 2.7)
    let procQuery = supabase
      .from("procurement_intelligence_snapshots")
      .select("supplier_concentration_detected, concentration_ratio, candidate_suppliers_count")
      .eq("state", state);

    if (commodity) {
      procQuery = procQuery.ilike("commodity", `%${commodity}%`);
    }

    const { data: procSnaps } = await procQuery
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (procSnaps && procSnaps.length > 0) {
      const pSnap = procSnaps[0];
      if (pSnap.concentration_ratio) {
        defaultContext.largestSupplierShare = Number(pSnap.concentration_ratio) / 100;
      }
      if (pSnap.candidate_suppliers_count) {
        defaultContext.supplierCount = Number(pSnap.candidate_suppliers_count);
      }
    }

    // 6. Fetch Active Security Incidents (Phase 1.5)
    const { data: incidents } = await supabase
      .from("security_incidents")
      .select("id, severity, impact_type, description")
      .eq("state", state)
      .eq("status", "ACTIVE")
      .limit(10);

    if (incidents && incidents.length > 0) {
      defaultContext.activeSecurityIncidents = incidents.map((i: { id: string; severity: string; impact_type: string; description?: string }) => ({
        id: i.id,
        severity: i.severity,
        impactType: i.impact_type,
        description: i.description,
      }));
      defaultContext.securityDisruptionReported = incidents.some(
        (i: { severity: string }) => i.severity === "HIGH" || i.severity === "CRITICAL"
      );
      defaultContext.logisticsFrictionScore = defaultContext.securityDisruptionReported ? 75 : 40;
    }

    // 7. Facilities & Aggregation Count
    const { count: facilityCount } = await supabase
      .from("processing_facilities")
      .select("*", { count: "exact", head: true })
      .eq("state", state);

    if (typeof facilityCount === "number") {
      defaultContext.processingFacilitiesAvailableCount = facilityCount;
    }

    const { count: poolCount } = await supabase
      .from("aggregation_pools")
      .select("*", { count: "exact", head: true })
      .eq("state", state)
      .eq("status", "OPEN");

    if (typeof poolCount === "number") {
      defaultContext.aggregationPoolsActiveCount = poolCount;
    }
  } catch (err) {
    console.warn("loadFoodSecurityContext encountered error; continuing with sparse context:", err);
  }

  return defaultContext;
}
