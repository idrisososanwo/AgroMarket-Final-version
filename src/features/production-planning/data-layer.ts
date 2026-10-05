/**
 * AgroMarket Phase 2.4: Production Intelligence Data Access Layer
 *
 * Provides typed, server-side data loading over existing tables:
 * - production_units
 * - production_outputs
 * - processing_facilities & processing_events
 * - agricultural_security_incidents
 * - agricultural_intelligence_signals (disease risk, logistics)
 * - equipment listings & service availability
 *
 * STRICT INTEGRITY:
 * - Does not invent fake production records or synthetic farm units.
 * - Enforces zero-tolerance anti-pork checks.
 * - Anonymizes sensitive producer IDs and exact farm street coordinates.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  ProductionDomain,
  ProductionContextSummary,
  ProductionConstraintsSummary,
} from "./types";
import { inferProductionDomain, evaluateSeasonalAlignment } from "./calculations";

export interface LoadedProductionEvidence {
  commodity: string;
  state: string;
  domain: ProductionDomain;
  productionContext: ProductionContextSummary;
  constraints: ProductionConstraintsSummary;
  activeSignals: Array<{
    id: string;
    signalType: string;
    magnitude: number;
    confidence: number;
    description: string;
  }>;
}

/**
 * Loads empirical production context and ecosystem constraints
 */
export async function loadProductionEvidence(
  commodity: string,
  state: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any
): Promise<LoadedProductionEvidence> {
  assertNoProhibitedProduce(commodity, "Evidence commodity");

  const domain = inferProductionDomain(commodity);

  let supabase = supabaseClient;
  if (!supabase) {
    try {
      supabase = await createClient();
    } catch {
      supabase = null;
    }
  }

  if (!supabase) {
    const seasonal = evaluateSeasonalAlignment(commodity);
    return {
      commodity,
      state,
      domain,
      productionContext: {
        commodity,
        state,
        domain,
        activeProductionUnitsCount: 0,
        totalCapacityReported: 0,
        capacityUnit: "HA",
        availableHarvestQuantity: 0,
        harvestUnit: "KG",
        outputBatchesCount: 0,
        lastHarvestDate: null,
        hasSufficientProductionRecords: false,
      },
      constraints: {
        commodity,
        state,
        inputConstraintLevel: "INSUFFICIENT_DATA",
        processingConstraintLevel: "NONE",
        processingFacilityCount: 0,
        totalDailyProcessingCapacity: 0,
        logisticsDelayEventsCount: 0,
        securityIncidentsCount: 0,
        diseaseSignalsCount: 0,
        seasonalAlignment: seasonal.alignment,
        seasonalRationale: seasonal.rationale,
      },
      activeSignals: [],
    };
  }

  // 1. Query production_units for commodity in target state
  const { data: rawUnits } = await supabase
    .from("production_units")
    .select("id, capacity_value, capacity_unit, status")
    .contains("commodities", [commodity])
    .eq("state", state)
    .eq("status", "ACTIVE")
    .limit(30);

  interface RawUnitRow {
    id: string;
    capacity_value: number | string | null;
    capacity_unit: string | null;
    status: string;
  }

  const activeUnits = (rawUnits || []) as unknown as RawUnitRow[];
  const totalCapacity = activeUnits.reduce(
    (sum, u) => sum + (u.capacity_value ? Number(u.capacity_value) : 0),
    0
  );
  const capacityUnit = activeUnits[0]?.capacity_unit || "HECTARES";

  // 2. Query production_outputs for available harvests
  const { data: rawOutputs } = await supabase
    .from("production_outputs")
    .select("id, quantity, unit, harvest_date, status")
    .ilike("commodity_name", `%${commodity}%`)
    .eq("state", state)
    .in("status", ["AVAILABLE", "IN_TRANSIT"])
    .order("harvest_date", { ascending: false })
    .limit(30);

  interface RawOutputRow {
    id: string;
    quantity: number | string | null;
    unit: string | null;
    harvest_date: string;
    status: string;
  }

  const availableOutputs = (rawOutputs || []) as unknown as RawOutputRow[];
  const totalAvailableHarvest = availableOutputs.reduce(
    (sum, o) => sum + (o.quantity ? Number(o.quantity) : 0),
    0
  );
  const harvestUnit = availableOutputs[0]?.unit || "KG";
  const lastHarvestDate = availableOutputs[0]?.harvest_date || null;

  const hasSufficientProductionRecords =
    activeUnits.length > 0 || availableOutputs.length > 0;

  const productionContext: ProductionContextSummary = {
    commodity,
    state,
    domain,
    activeProductionUnitsCount: activeUnits.length,
    totalCapacityReported: totalCapacity,
    capacityUnit,
    availableHarvestQuantity: totalAvailableHarvest,
    harvestUnit,
    outputBatchesCount: availableOutputs.length,
    lastHarvestDate,
    hasSufficientProductionRecords,
  };

  // 3. Downstream Processing Capacity
  const { data: facilities } = await supabase
    .from("processing_facilities")
    .select("id, processing_capacity, capacity_unit")
    .contains("supported_commodities", [commodity])
    .eq("state", state)
    .eq("is_active", true);

  interface RawFacilityRow {
    id: string;
    processing_capacity: number | string | null;
    capacity_unit: string | null;
  }

  const activeFacilities = (facilities || []) as unknown as RawFacilityRow[];
  const totalProcessingCapacity = activeFacilities.reduce(
    (sum, f) => sum + (f.processing_capacity ? Number(f.processing_capacity) : 0),
    0
  );

  let processingConstraintLevel: ProductionConstraintsSummary["processingConstraintLevel"] = "NONE";
  if (activeFacilities.length === 0 && domain === "CROPS") {
    // If raw tubers/grains but no localized processing
    processingConstraintLevel = "MODERATE";
  } else if (totalAvailableHarvest > totalProcessingCapacity && totalProcessingCapacity > 0) {
    processingConstraintLevel = "BOTTLENECK";
  }

  // 4. Input constraints (check active equipment & services availability)
  const { data: equipmentListings } = await supabase
    .from("equipment")
    .select("id, is_available")
    .eq("location_state", state)
    .eq("is_available", true)
    .limit(10);

  const availableEquipmentCount = equipmentListings?.length || 0;
  const inputConstraintLevel: ProductionConstraintsSummary["inputConstraintLevel"] =
    availableEquipmentCount > 0 ? "NONE" : "MODERATE";

  // 5. Disruptions & Disease Signals
  const { data: securityIncidents } = await supabase
    .from("agricultural_security_incidents")
    .select("id, title, severity")
    .eq("status", "PUBLISHED")
    .eq("state", state)
    .limit(5);

  const { data: delayEvents } = await supabase
    .from("delivery_events")
    .select("id, event_type")
    .in("event_type", ["EXCEPTION", "FAILED", "DELAYED"])
    .limit(5);

  const { data: diseaseSignals } = await supabase
    .from("agricultural_intelligence_signals")
    .select("id, signal_type, magnitude, confidence, evidence")
    .eq("signal_type", "DISEASE_RISK")
    .eq("state", state)
    .gte("expires_at", new Date().toISOString())
    .limit(5);

  const seasonal = evaluateSeasonalAlignment(commodity);

  const constraints: ProductionConstraintsSummary = {
    commodity,
    state,
    inputConstraintLevel,
    inputNotes:
      availableEquipmentCount > 0
        ? `${availableEquipmentCount} shared equipment units available in ${state}.`
        : `Limited mechanized equipment inventory currently recorded in ${state}.`,
    processingConstraintLevel,
    processingFacilityCount: activeFacilities.length,
    totalDailyProcessingCapacity: totalProcessingCapacity,
    logisticsDelayEventsCount: delayEvents?.length || 0,
    securityIncidentsCount: securityIncidents?.length || 0,
    diseaseSignalsCount: diseaseSignals?.length || 0,
    seasonalAlignment: seasonal.alignment,
    seasonalRationale: seasonal.rationale,
  };

  const activeSignals: LoadedProductionEvidence["activeSignals"] = (diseaseSignals || []).map(
    (d: { id: string; signal_type: string; magnitude: number; confidence: number }) => ({
      id: d.id,
      signalType: d.signal_type,
      magnitude: Number(d.magnitude),
      confidence: Number(d.confidence),
      description: `Reported regional disease risk signal in ${state} (non-diagnostic advisory).`,
    })
  );

  return {
    commodity,
    state,
    domain,
    productionContext,
    constraints,
    activeSignals,
  };
}
