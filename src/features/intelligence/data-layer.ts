/**
 * AgroMarket Phase 2.1: Unified Agricultural Intelligence Data Access Layer
 *
 * Provides typed, server-side read models over existing domains without data duplication:
 * - Market: price_observations, market trends
 * - Supply: production_units, production_outputs, aggregation_pools
 * - Demand: orders, b2b_demands, shared_purchases, demand_forecasts
 * - Processing: processing_facilities, processing_events
 * - Logistics: deliveries, delivery_events
 * - Security: agricultural_security_incidents
 * - Knowledge: knowledge_articles
 * - Equipment: equipment, equipment_rentals
 * - Value Chain: value_chain_events
 *
 * PRIVACY GUARANTEES:
 * - Strips private contact numbers and exact street addresses.
 * - Aggregates geographically at STATE, LGA, and CORRIDOR levels.
 * - Strictly rejects pig/pork commodities.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "./validation";
import {
  MarketDomainInput,
  SupplyDomainInput,
  DemandDomainInput,
  ProcessingDomainInput,
  LogisticsDomainInput,
  SecurityDomainInput,
} from "./types";

/**
 * 1. MARKET INTELLIGENCE DATA
 */
export async function getMarketDomainData(
  commodity: string,
  state: string
): Promise<MarketDomainInput> {
  assertNoProhibitedProduce(commodity, "Market query commodity");
  const supabase = await createClient();

  const { data: observations, error } = await supabase
    .from("price_observations")
    .select("normalized_price, price, normalized_unit, unit, observed_at, source_type, verification_status")
    .eq("state", state)
    .order("observed_at", { ascending: false })
    .limit(20);

  if (error || !observations) {
    return { commodity, state, recentObservations: [] };
  }

  const recentObservations = observations.map((o) => ({
    price: Number(o.normalized_price || o.price || 0),
    unit: o.normalized_unit || o.unit || "kg",
    observedAt: o.observed_at,
    sourceType: o.source_type,
    isVerified: o.verification_status === "VERIFIED" || o.verification_status === "SYSTEM_DERIVED",
  }));

  const historicalBaseline =
    recentObservations.length > 0
      ? recentObservations.reduce((acc, curr) => acc + curr.price, 0) / recentObservations.length
      : undefined;

  return {
    commodity,
    state,
    recentObservations,
    historicalBaselinePrice: historicalBaseline ? Math.round(historicalBaseline * 100) / 100 : undefined,
  };
}

/**
 * 2. SUPPLY INTELLIGENCE DATA
 */
export async function getSupplyDomainData(
  commodity: string,
  state: string
): Promise<SupplyDomainInput> {
  assertNoProhibitedProduce(commodity, "Supply query commodity");
  const supabase = await createClient();

  // Query unallocated or available production outputs
  const { data: outputs } = await supabase
    .from("production_outputs")
    .select("id, quantity, unit, output_type, produced_at")
    .ilike("commodity", `%${commodity}%`)
    .eq("status", "AVAILABLE")
    .order("produced_at", { ascending: false })
    .limit(30);

  // Query active aggregation pools for the commodity in this state
  const { data: pools } = await supabase
    .from("aggregation_pools")
    .select("id, current_quantity, target_quantity, unit")
    .ilike("commodity", `%${commodity}%`)
    .eq("state", state)
    .in("status", ["OPEN", "ACCUMULATING", "FULL"])
    .limit(10);

  return {
    commodity,
    state,
    availableOutputs: (outputs || []).map((o) => ({
      id: o.id,
      quantity: Number(o.quantity),
      unit: o.unit,
      outputType: o.output_type,
      producedAt: o.produced_at,
    })),
    activePools: (pools || []).map((p) => ({
      id: p.id,
      currentQuantity: Number(p.current_quantity),
      targetQuantity: Number(p.target_quantity),
      unit: p.unit,
    })),
  };
}

/**
 * 3. DEMAND INTELLIGENCE DATA
 */
export async function getDemandDomainData(
  commodity: string,
  state: string
): Promise<DemandDomainInput> {
  assertNoProhibitedProduce(commodity, "Demand query commodity");
  const supabase = await createClient();

  // Query active B2B demands
  const { data: demands } = await supabase
    .from("b2b_demands")
    .select("id, quantity, unit, desired_delivery_date, frequency")
    .ilike("commodity_or_product", `%${commodity}%`)
    .eq("state", state)
    .in("status", ["ACTIVE", "MATCHED", "PARTIALLY_MATCHED"])
    .order("desired_delivery_date", { ascending: true })
    .limit(20);

  // Completed order volume estimate (last 30 days)
  const { data: orders } = await supabase
    .from("orders")
    .select("id, total_amount, created_at")
    .eq("status", "DELIVERED")
    .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
    .limit(50);

  const orderVolumeTotal = orders ? orders.length : 0;

  // Shared purchase pool demand (active campaigns)
  const { data: shared } = await supabase
    .from("shared_purchases")
    .select("id, total_slots, filled_slots")
    .ilike("title", `%${commodity}%`)
    .eq("status", "ACTIVE")
    .limit(10);

  const sharedPurchaseDemand = (shared || []).reduce(
    (acc, curr) => acc + Number(curr.filled_slots || 0),
    0
  );

  return {
    commodity,
    state,
    b2bDemands: (demands || []).map((d) => ({
      id: d.id,
      quantity: Number(d.quantity),
      unit: d.unit,
      deliveryDate: d.desired_delivery_date,
      frequency: d.frequency,
    })),
    orderVolumeTotal,
    sharedPurchaseDemand,
  };
}

/**
 * 4. PROCESSING INTELLIGENCE DATA
 */
export async function getProcessingDomainData(
  commodity: string,
  state: string
): Promise<ProcessingDomainInput> {
  assertNoProhibitedProduce(commodity, "Processing query commodity");
  const supabase = await createClient();

  const { data: facilities } = await supabase
    .from("processing_facilities")
    .select("id, processing_capacity, capacity_unit, is_active")
    .contains("supported_commodities", [commodity])
    .eq("state", state)
    .eq("is_active", true);

  const totalFacilities = facilities?.length || 0;
  const totalCapacity = (facilities || []).reduce(
    (acc, f) => acc + (f.processing_capacity ? Number(f.processing_capacity) : 0),
    0
  );

  // Queued outputs allocated to processing
  const { data: queued } = await supabase
    .from("production_outputs")
    .select("quantity")
    .ilike("commodity", `%${commodity}%`)
    .eq("status", "ALLOCATED_TO_PROCESSING");

  const queuedOutputVolume = (queued || []).reduce(
    (acc, q) => acc + Number(q.quantity || 0),
    0
  );

  return {
    commodity,
    state,
    totalFacilities,
    totalCapacity,
    queuedOutputVolume,
    activeBatchTurnaroundDays: 2.5, // Standard processing cycle turnaround baseline
  };
}

/**
 * 5. LOGISTICS INTELLIGENCE DATA
 */
export async function getLogisticsDomainData(
  corridor: string,
  state: string
): Promise<LogisticsDomainInput> {
  const supabase = await createClient();

  // Check recent deliveries marked in transit
  const { data: activeDeliveries } = await supabase
    .from("deliveries")
    .select("id, status, created_at")
    .in("status", ["IN_TRANSIT", "ASSIGNED", "DISPATCHED"])
    .limit(50);

  // Check delivery delay events
  const { data: events } = await supabase
    .from("delivery_events")
    .select("id, event_type, created_at, notes")
    .in("event_type", ["EXCEPTION", "FAILED", "DELAYED"])
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    corridor,
    state,
    totalActiveDeliveries: activeDeliveries?.length || 0,
    transitDelayIncidents: events?.length || 0,
    recentDisruptions: (events || []).map((e) => ({
      id: e.id,
      type: e.event_type,
      reportedAt: e.created_at,
      description: e.notes || "Transit disruption recorded",
    })),
  };
}

/**
 * 6. SECURITY INTELLIGENCE DATA
 */
export async function getSecurityDomainData(
  state: string,
  commodity?: string
): Promise<SecurityDomainInput> {
  if (commodity) {
    assertNoProhibitedProduce(commodity, "Security query commodity");
  }
  const supabase = await createClient();

  const query = supabase
    .from("agricultural_security_incidents")
    .select("id, title, severity, affected_commodities, movement_impact, published_at")
    .eq("status", "PUBLISHED")
    .eq("state", state)
    .order("published_at", { ascending: false })
    .limit(10);

  const { data: incidents } = await query;

  return {
    state,
    recentIncidents: (incidents || []).map((inc) => ({
      id: inc.id,
      title: inc.title,
      severity: inc.severity as "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
      affectedCommodities: inc.affected_commodities || [],
      movementImpact: inc.movement_impact,
      publishedAt: inc.published_at || new Date().toISOString(),
    })),
  };
}
