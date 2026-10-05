/**
 * AgroMarket Phase 2.0: Agricultural Ecosystem Server Queries
 * Provides clean, safe read models respecting multi-tenant and RLS boundaries.
 */

import { createClient } from "@/lib/supabase/server";
import {
  EcosystemActor,
  ProductionUnit,
  ProductionOutput,
  AggregationPool,
  AggregationPoolContribution,
  ProcessingFacility,
  ProcessingEvent,
  ValueChainEvent,
  B2BDemand,
  ValueChainMatchResult,
  MatchingCandidateSupply,
  MatchingCandidateFacility,
  MatchingCandidateLogistics,
} from "./types";
import { matchSupplyDemand } from "./matching";

// ------------------------------------------------------------------------------
// 1. ECOSYSTEM ACTORS QUERIES
// ------------------------------------------------------------------------------
export async function getEcosystemActors(filters?: {
  actorType?: string;
  state?: string;
  limit?: number;
}): Promise<EcosystemActor[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("ecosystem_actors")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (filters?.actorType && filters.actorType !== "ALL") {
      query = query.eq("actor_type", filters.actorType);
    }
    if (filters?.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      businessProfileId: row.business_profile_id,
      actorType: row.actor_type as EcosystemActor["actorType"],
      displayName: row.display_name,
      description: row.description,
      capabilities: row.capabilities || [],
      state: row.state,
      lga: row.lga,
      verificationStatus: row.verification_status,
      isActive: row.is_active,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error("Error fetching ecosystem actors:", err);
    return [];
  }
}

// ------------------------------------------------------------------------------
// 2. PRODUCTION UNITS QUERIES
// ------------------------------------------------------------------------------
export async function getProductionUnits(filters?: {
  unitType?: string;
  state?: string;
  limit?: number;
}): Promise<ProductionUnit[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("production_units")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (filters?.unitType && filters.unitType !== "ALL") {
      query = query.eq("unit_type", filters.unitType);
    }
    if (filters?.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      businessProfileId: row.business_profile_id,
      name: row.name,
      unitType: row.unit_type as ProductionUnit["unitType"],
      state: row.state,
      lga: row.lga,
      generalArea: row.general_area,
      commodities: row.commodities || [],
      capacityValue: row.capacity_value ? Number(row.capacity_value) : null,
      capacityUnit: row.capacity_unit,
      status: row.status,
      verificationStatus: row.verification_status,
      isPublic: row.is_public,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error("Error fetching production units:", err);
    return [];
  }
}

// ------------------------------------------------------------------------------
// 3. PRODUCTION OUTPUTS QUERIES
// ------------------------------------------------------------------------------
export async function getProductionOutputs(filters?: {
  status?: string;
  state?: string;
  outputType?: string;
  commodity?: string;
  limit?: number;
}): Promise<ProductionOutput[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("production_outputs")
      .select("*")
      .order("harvest_date", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    } else {
      query = query.in("status", ["AVAILABLE", "ALLOCATED", "PROCESSED"]);
    }
    if (filters?.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters?.outputType && filters.outputType !== "ALL") {
      query = query.eq("output_type", filters.outputType);
    }
    if (filters?.commodity) {
      query = query.ilike("commodity_name", `%${filters.commodity}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      productionUnitId: row.production_unit_id,
      producerId: row.producer_id,
      commodityName: row.commodity_name,
      outputType: row.output_type as ProductionOutput["outputType"],
      batchNumber: row.batch_number,
      quantity: Number(row.quantity),
      unit: row.unit,
      harvestDate: row.harvest_date,
      qualityGrade: row.quality_grade,
      status: row.status,
      state: row.state,
      lga: row.lga,
      notes: row.notes,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error("Error fetching production outputs:", err);
    return [];
  }
}

// ------------------------------------------------------------------------------
// 4. AGGREGATION POOLS QUERIES
// ------------------------------------------------------------------------------
export async function getAggregationPools(filters?: {
  status?: string;
  state?: string;
  commodity?: string;
  limit?: number;
}): Promise<AggregationPool[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("aggregation_pools")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    } else {
      query = query.in("status", ["OPEN", "AGGREGATING", "FULFILLED"]);
    }
    if (filters?.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters?.commodity) {
      query = query.ilike("commodity", `%${filters.commodity}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      aggregatorId: row.aggregator_id,
      title: row.title,
      commodity: row.commodity,
      targetQuantity: Number(row.target_quantity),
      currentQuantity: Number(row.current_quantity),
      unit: row.unit,
      state: row.state,
      lga: row.lga,
      collectionCenterName: row.collection_center_name,
      expectedAvailabilityDate: row.expected_availability_date,
      targetBuyerId: row.target_buyer_id,
      targetProcessorId: row.target_processor_id,
      status: row.status,
      notes: row.notes,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error("Error fetching aggregation pools:", err);
    return [];
  }
}

export async function getAggregationPoolById(
  id: string
): Promise<{ pool: AggregationPool | null; contributions: AggregationPoolContribution[] }> {
  try {
    const supabase = await createClient();
    const { data: poolRow, error: poolError } = await supabase
      .from("aggregation_pools")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (poolError || !poolRow) {
      return { pool: null, contributions: [] };
    }

    const { data: contribRows } = await supabase
      .from("aggregation_pool_contributions")
      .select("*")
      .eq("pool_id", id)
      .order("created_at", { ascending: true });

    const pool: AggregationPool = {
      id: poolRow.id,
      aggregatorId: poolRow.aggregator_id,
      title: poolRow.title,
      commodity: poolRow.commodity,
      targetQuantity: Number(poolRow.target_quantity),
      currentQuantity: Number(poolRow.current_quantity),
      unit: poolRow.unit,
      state: poolRow.state,
      lga: poolRow.lga,
      collectionCenterName: poolRow.collection_center_name,
      expectedAvailabilityDate: poolRow.expected_availability_date,
      targetBuyerId: poolRow.target_buyer_id,
      targetProcessorId: poolRow.target_processor_id,
      status: poolRow.status,
      notes: poolRow.notes,
      metadata: poolRow.metadata as Record<string, unknown>,
      createdAt: poolRow.created_at,
      updatedAt: poolRow.updated_at,
    };

    const contributions: AggregationPoolContribution[] = (contribRows || []).map((c) => ({
      id: c.id,
      poolId: c.pool_id,
      supplierId: c.supplier_id,
      productionOutputId: c.production_output_id,
      quantity: Number(c.quantity),
      unit: c.unit,
      status: c.status,
      notes: c.notes,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return { pool, contributions };
  } catch (err) {
    console.error("Error fetching aggregation pool details:", err);
    return { pool: null, contributions: [] };
  }
}

// ------------------------------------------------------------------------------
// 5. PROCESSING FACILITIES QUERIES
// ------------------------------------------------------------------------------
export async function getProcessingFacilities(filters?: {
  facilityType?: string;
  state?: string;
  commodity?: string;
  limit?: number;
}): Promise<ProcessingFacility[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("processing_facilities")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (filters?.facilityType && filters.facilityType !== "ALL") {
      query = query.eq("facility_type", filters.facilityType);
    }
    if (filters?.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters?.commodity) {
      query = query.contains("supported_commodities", [filters.commodity]);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      operatorId: row.operator_id,
      businessProfileId: row.business_profile_id,
      name: row.name,
      facilityType: row.facility_type as ProcessingFacility["facilityType"],
      servicesOffered: row.services_offered || [],
      processingCapacityValue: row.processing_capacity_value ? Number(row.processing_capacity_value) : null,
      processingCapacityUnit: row.processing_capacity_unit,
      minimumBatchSize: row.minimum_batch_size ? Number(row.minimum_batch_size) : null,
      supportedCommodities: row.supported_commodities || [],
      state: row.state,
      lga: row.lga,
      generalLocation: row.general_location,
      verificationStatus: row.verification_status,
      isActive: row.is_active,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error("Error fetching processing facilities:", err);
    return [];
  }
}

// ------------------------------------------------------------------------------
// 6. PROCESSING EVENTS QUERIES
// ------------------------------------------------------------------------------
export async function getProcessingEvents(filters?: {
  facilityId?: string;
  processType?: string;
  limit?: number;
}): Promise<ProcessingEvent[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("processing_events")
      .select("*")
      .order("started_at", { ascending: false });

    if (filters?.facilityId) {
      query = query.eq("facility_id", filters.facilityId);
    }
    if (filters?.processType && filters.processType !== "ALL") {
      query = query.eq("process_type", filters.processType);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      facilityId: row.facility_id,
      processorId: row.processor_id,
      processType: row.process_type as ProcessingEvent["processType"],
      inputDescription: row.input_description,
      inputQuantity: Number(row.input_quantity),
      inputUnit: row.input_unit,
      inputSourceOutputId: row.input_source_output_id,
      outputDescription: row.output_description,
      outputQuantity: Number(row.output_quantity),
      outputUnit: row.output_unit,
      yieldPercentage: row.yield_percentage ? Number(row.yield_percentage) : null,
      batchReference: row.batch_reference,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status,
      resultingOutputId: row.resulting_output_id,
      resultingListingId: row.resulting_listing_id,
      notes: row.notes,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error("Error fetching processing events:", err);
    return [];
  }
}

// ------------------------------------------------------------------------------
// 7. VALUE-CHAIN EVENTS QUERIES (Append-Only Event Ledger)
// ------------------------------------------------------------------------------
export async function getValueChainEvents(
  entityType?: string,
  entityId?: string,
  limit: number = 50
): Promise<ValueChainEvent[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("value_chain_events")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }
    if (entityId) {
      query = query.eq("entity_id", entityId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      eventType: row.event_type as ValueChainEvent["eventType"],
      entityType: row.entity_type as ValueChainEvent["entityType"],
      entityId: row.entity_id,
      actorId: row.actor_id,
      eventTitle: row.event_title,
      eventDetails: row.event_details as Record<string, unknown>,
      state: row.state,
      lga: row.lga,
      occurredAt: row.occurred_at,
      recordedAt: row.recorded_at,
    }));
  } catch (err) {
    console.error("Error fetching value chain events:", err);
    return [];
  }
}

// ------------------------------------------------------------------------------
// 8. B2B DEMAND QUERIES
// ------------------------------------------------------------------------------
export async function getB2BDemands(filters?: {
  status?: string;
  state?: string;
  commodity?: string;
  limit?: number;
}): Promise<B2BDemand[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("b2b_demands")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    } else {
      query = query.in("status", ["ACTIVE", "MATCHED", "PARTIALLY_MATCHED"]);
    }
    if (filters?.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters?.commodity) {
      query = query.ilike("commodity_or_product", `%${filters.commodity}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      buyerId: row.buyer_id,
      businessProfileId: row.business_profile_id,
      title: row.title,
      commodityOrProduct: row.commodity_or_product,
      quantity: Number(row.quantity),
      unit: row.unit,
      specifications: row.specifications as Record<string, unknown>,
      targetPricePerUnit: row.target_price_per_unit ? Number(row.target_price_per_unit) : null,
      state: row.state,
      lga: row.lga,
      desiredDeliveryDate: row.desired_delivery_date,
      frequency: row.frequency,
      status: row.status,
      notes: row.notes,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error("Error fetching B2B demands:", err);
    return [];
  }
}

export async function getB2BDemandById(id: string): Promise<B2BDemand | null> {
  try {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("b2b_demands")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !row) return null;

    return {
      id: row.id,
      buyerId: row.buyer_id,
      businessProfileId: row.business_profile_id,
      title: row.title,
      commodityOrProduct: row.commodity_or_product,
      quantity: Number(row.quantity),
      unit: row.unit,
      specifications: row.specifications as Record<string, unknown>,
      targetPricePerUnit: row.target_price_per_unit ? Number(row.target_price_per_unit) : null,
      state: row.state,
      lga: row.lga,
      desiredDeliveryDate: row.desired_delivery_date,
      frequency: row.frequency,
      status: row.status,
      notes: row.notes,
      metadata: row.metadata as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error("Error fetching B2B demand by ID:", err);
    return null;
  }
}

// ------------------------------------------------------------------------------
// 9. SUPPLY / DEMAND MATCHING QUERY (Core Domain 9)
// ------------------------------------------------------------------------------
export async function getValueChainMatchForDemand(
  demandId: string
): Promise<ValueChainMatchResult | null> {
  try {
    const demand = await getB2BDemandById(demandId);
    if (!demand) return null;

    const supabase = await createClient();

    // 1. Fetch Candidate Supplies from Production Outputs and Aggregation Pools
    const [outputsRes, poolsRes, facilitiesRes, logisticsRes] = await Promise.all([
      supabase
        .from("production_outputs")
        .select("id, commodity_name, quantity, unit, state, lga, quality_grade, harvest_date, profiles(full_name)")
        .eq("status", "AVAILABLE")
        .limit(30),
      supabase
        .from("aggregation_pools")
        .select("id, commodity, current_quantity, unit, state, lga, expected_availability_date, title")
        .in("status", ["OPEN", "AGGREGATING"])
        .limit(30),
      supabase
        .from("processing_facilities")
        .select("id, name, facility_type, services_offered, processing_capacity_value, processing_capacity_unit, minimum_batch_size, supported_commodities, state, lga")
        .eq("is_active", true)
        .limit(30),
      supabase
        .from("logistics_providers")
        .select("id, business_name, vehicle_types, states_covered, is_active")
        .eq("is_active", true)
        .limit(30),
    ]);

    const candidateSupplies: MatchingCandidateSupply[] = [];

    if (outputsRes.data) {
      for (const o of outputsRes.data) {
        // Safe extraction
        const producerProfile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
        const producerName = (producerProfile as { full_name?: string } | null)?.full_name || "Registered Producer";
        candidateSupplies.push({
          id: o.id,
          sourceType: "PRODUCTION_OUTPUT",
          commodity: o.commodity_name,
          availableQuantity: Number(o.quantity),
          unit: o.unit,
          state: o.state,
          lga: o.lga,
          producerOrAggregatorName: producerName,
          qualityGrade: o.quality_grade,
          readyDate: o.harvest_date,
        });
      }
    }

    if (poolsRes.data) {
      for (const p of poolsRes.data) {
        candidateSupplies.push({
          id: p.id,
          sourceType: "AGGREGATION_POOL",
          commodity: p.commodity,
          availableQuantity: Number(p.current_quantity),
          unit: p.unit,
          state: p.state,
          lga: p.lga,
          producerOrAggregatorName: p.title,
          readyDate: p.expected_availability_date,
        });
      }
    }

    const candidateFacilities: MatchingCandidateFacility[] = (facilitiesRes.data || []).map((f) => ({
      id: f.id,
      name: f.name,
      facilityType: f.facility_type as ProcessingFacility["facilityType"],
      servicesOffered: f.services_offered || [],
      capacityValue: f.processing_capacity_value ? Number(f.processing_capacity_value) : null,
      capacityUnit: f.processing_capacity_unit,
      minimumBatchSize: f.minimum_batch_size ? Number(f.minimum_batch_size) : null,
      supportedCommodities: f.supported_commodities || [],
      state: f.state,
      lga: f.lga,
    }));

    const candidateLogistics: MatchingCandidateLogistics[] = (logisticsRes.data || []).map((l) => ({
      id: l.id,
      companyName: l.business_name,
      vehicleTypes: l.vehicle_types || [],
      coverageStates: l.states_covered || [],
      maxWeightKg: 10000,
      hasRefrigeration: (l.vehicle_types || []).some((v: string) => /cold|refrig/i.test(v)),
    }));

    return matchSupplyDemand(demand, candidateSupplies, candidateFacilities, candidateLogistics);
  } catch (err) {
    console.error("Error executing value chain match:", err);
    return null;
  }
}

// ------------------------------------------------------------------------------
// 10. CANONICAL VALUE-CHAIN STAGE TEMPLATES (Discovery Visualizations)
// ------------------------------------------------------------------------------
export { getCanonicalValueChainTemplates } from "./templates";

