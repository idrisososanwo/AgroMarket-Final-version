"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit";
import { Json } from "@/types/database";
import { ValueChainMatchResult } from "./types";
import {
  ecosystemActorSchema,
  productionUnitSchema,
  productionOutputSchema,
  aggregationPoolSchema,
  aggregationContributionSchema,
  processingFacilitySchema,
  processingEventSchema,
  valueChainEventSchema,
  b2bDemandSchema,
} from "./validation";

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// ------------------------------------------------------------------------------
// 1. REGISTER ECOSYSTEM ACTOR
// ------------------------------------------------------------------------------
export async function registerEcosystemActorAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ actorId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    // Parse capabilities if stringified
    if (typeof raw.capabilities === "string") {
      try {
        raw.capabilities = JSON.parse(raw.capabilities);
      } catch {
        raw.capabilities = (raw.capabilities as string)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }

    const parsed = ecosystemActorSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify actor attributes and ensure no prohibited produce is referenced.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      actorType,
      displayName,
      description,
      capabilities,
      state,
      lga,
      businessProfileId,
      metadata,
    } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ecosystem_actors")
      .insert({
        user_id: user.id,
        business_profile_id: businessProfileId ?? null,
        actor_type: actorType,
        display_name: displayName,
        description: description ?? null,
        capabilities,
        state,
        lga,
        is_active: true,
        verification_status: "UNVERIFIED",
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to register ecosystem actor" };
    }

    await recordAuditLog({
      actorId: user.id,
      action: "ECOSYSTEM_ACTOR_REGISTERED",
      resourceType: "ecosystem_actors",
      resourceId: data.id,
      newValues: { actorType, displayName, state, lga },
    });

    revalidatePath("/ecosystem");
    return { success: true, data: { actorId: data.id } };
  } catch (err: unknown) {
    console.error("registerEcosystemActorAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ------------------------------------------------------------------------------
// 2. CREATE PRODUCTION UNIT
// ------------------------------------------------------------------------------
export async function createProductionUnitAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ unitId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    if (typeof raw.commodities === "string") {
      try {
        raw.commodities = JSON.parse(raw.commodities);
      } catch {
        raw.commodities = (raw.commodities as string)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }

    const parsed = productionUnitSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify production unit parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      unitType,
      state,
      lga,
      generalArea,
      commodities,
      capacityValue,
      capacityUnit,
      isPublic,
      businessProfileId,
      metadata,
    } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("production_units")
      .insert({
        owner_id: user.id,
        business_profile_id: businessProfileId ?? null,
        name,
        unit_type: unitType,
        state,
        lga,
        general_area: generalArea ?? null,
        commodities,
        capacity_value: capacityValue ?? null,
        capacity_unit: capacityUnit ?? null,
        status: "ACTIVE",
        verification_status: "UNVERIFIED",
        is_public: isPublic,
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to create production unit" };
    }

    await recordAuditLog({
      actorId: user.id,
      action: "PRODUCTION_UNIT_CREATED",
      resourceType: "production_units",
      resourceId: data.id,
      newValues: { name, unitType, state, lga },
    });

    revalidatePath("/ecosystem");
    return { success: true, data: { unitId: data.id } };
  } catch (err: unknown) {
    console.error("createProductionUnitAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ------------------------------------------------------------------------------
// 3. CREATE PRODUCTION OUTPUT
// ------------------------------------------------------------------------------
export async function createProductionOutputAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ outputId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = productionOutputSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify production output details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      productionUnitId,
      commodityName,
      outputType,
      batchNumber,
      quantity,
      unit,
      harvestDate,
      qualityGrade,
      state,
      lga,
      notes,
      metadata,
    } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("production_outputs")
      .insert({
        producer_id: user.id,
        production_unit_id: productionUnitId ?? null,
        commodity_name: commodityName,
        output_type: outputType,
        batch_number: batchNumber ?? null,
        quantity,
        unit,
        harvest_date: harvestDate,
        quality_grade: qualityGrade,
        status: "AVAILABLE",
        state,
        lga,
        notes: notes ?? null,
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to register production output" };
    }

    // Append initial value-chain event
    await supabase.from("value_chain_events").insert({
      event_type: "PRODUCED",
      entity_type: "PRODUCTION_OUTPUT",
      entity_id: data.id,
      actor_id: user.id,
      event_title: `Output registered: ${quantity} ${unit} of ${commodityName}`,
      event_details: { batchNumber, qualityGrade, outputType } as unknown as Json,
      state,
      lga,
    });

    await recordAuditLog({
      actorId: user.id,
      action: "PRODUCTION_OUTPUT_REGISTERED",
      resourceType: "production_outputs",
      resourceId: data.id,
      newValues: { commodityName, quantity, unit, outputType },
    });

    revalidatePath("/ecosystem");
    return { success: true, data: { outputId: data.id } };
  } catch (err: unknown) {
    console.error("createProductionOutputAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ------------------------------------------------------------------------------
// 4. CREATE AGGREGATION POOL & CONTRIBUTION
// ------------------------------------------------------------------------------
export async function createAggregationPoolAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ poolId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = aggregationPoolSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify aggregation pool details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      title,
      commodity,
      targetQuantity,
      unit,
      state,
      lga,
      collectionCenterName,
      expectedAvailabilityDate,
      targetBuyerId,
      targetProcessorId,
      notes,
      metadata,
    } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("aggregation_pools")
      .insert({
        aggregator_id: user.id,
        title,
        commodity,
        target_quantity: targetQuantity,
        current_quantity: 0,
        unit,
        state,
        lga,
        collection_center_name: collectionCenterName ?? null,
        expected_availability_date: expectedAvailabilityDate,
        target_buyer_id: targetBuyerId ?? null,
        target_processor_id: targetProcessorId ?? null,
        status: "OPEN",
        notes: notes ?? null,
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to create aggregation pool" };
    }

    await recordAuditLog({
      actorId: user.id,
      action: "AGGREGATION_POOL_CREATED",
      resourceType: "aggregation_pools",
      resourceId: data.id,
      newValues: { title, commodity, targetQuantity, unit, state },
    });

    revalidatePath("/ecosystem");
    return { success: true, data: { poolId: data.id } };
  } catch (err: unknown) {
    console.error("createAggregationPoolAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

export async function contributeToAggregationPoolAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ contributionId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = aggregationContributionSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed for pool contribution.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { poolId, productionOutputId, quantity, unit, notes } = parsed.data;
    const supabase = await createClient();

    // Verify pool is open
    const { data: pool, error: poolError } = await supabase
      .from("aggregation_pools")
      .select("id, status, current_quantity, target_quantity, unit")
      .eq("id", poolId)
      .single();

    if (poolError || !pool) {
      return { success: false, error: "Target aggregation pool not found." };
    }

    if (!["OPEN", "AGGREGATING"].includes(pool.status)) {
      return { success: false, error: "Aggregation pool is no longer accepting supply contributions." };
    }

    const { data: contrib, error: contribError } = await supabase
      .from("aggregation_pool_contributions")
      .insert({
        pool_id: poolId,
        supplier_id: user.id,
        production_output_id: productionOutputId ?? null,
        quantity,
        unit,
        status: "COMMITTED",
        notes: notes ?? null,
      })
      .select("id")
      .single();

    if (contribError || !contrib) {
      return { success: false, error: contribError?.message || "Failed to record contribution" };
    }

    // Increment current_quantity on pool
    const newQty = Number(pool.current_quantity) + quantity;
    const newStatus = newQty >= Number(pool.target_quantity) ? "FULFILLED" : "AGGREGATING";
    await supabase
      .from("aggregation_pools")
      .update({ current_quantity: newQty, status: newStatus })
      .eq("id", poolId);

    // If production_output was linked, update its status to ALLOCATED
    if (productionOutputId) {
      await supabase
        .from("production_outputs")
        .update({ status: "ALLOCATED" })
        .eq("id", productionOutputId)
        .eq("producer_id", user.id);
    }

    await recordAuditLog({
      actorId: user.id,
      action: "POOL_CONTRIBUTION_COMMITTED",
      resourceType: "aggregation_pool_contributions",
      resourceId: contrib.id,
      newValues: { poolId, quantity, unit },
    });

    revalidatePath("/ecosystem");
    return { success: true, data: { contributionId: contrib.id } };
  } catch (err: unknown) {
    console.error("contributeToAggregationPoolAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ------------------------------------------------------------------------------
// 5. REGISTER PROCESSING FACILITY
// ------------------------------------------------------------------------------
export async function createProcessingFacilityAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ facilityId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    if (typeof raw.servicesOffered === "string") {
      try {
        raw.servicesOffered = JSON.parse(raw.servicesOffered);
      } catch {
        raw.servicesOffered = (raw.servicesOffered as string)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }

    if (typeof raw.supportedCommodities === "string") {
      try {
        raw.supportedCommodities = JSON.parse(raw.supportedCommodities);
      } catch {
        raw.supportedCommodities = (raw.supportedCommodities as string)
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }

    const parsed = processingFacilitySchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify processing facility details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      facilityType,
      servicesOffered,
      processingCapacityValue,
      processingCapacityUnit,
      minimumBatchSize,
      supportedCommodities,
      state,
      lga,
      generalLocation,
      businessProfileId,
      metadata,
    } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("processing_facilities")
      .insert({
        operator_id: user.id,
        business_profile_id: businessProfileId ?? null,
        name,
        facility_type: facilityType,
        services_offered: servicesOffered,
        processing_capacity_value: processingCapacityValue ?? null,
        processing_capacity_unit: processingCapacityUnit ?? null,
        minimum_batch_size: minimumBatchSize ?? null,
        supported_commodities: supportedCommodities,
        state,
        lga,
        general_location: generalLocation ?? null,
        verification_status: "UNVERIFIED",
        is_active: true,
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to register processing facility" };
    }

    await recordAuditLog({
      actorId: user.id,
      action: "PROCESSING_FACILITY_REGISTERED",
      resourceType: "processing_facilities",
      resourceId: data.id,
      newValues: { name, facilityType, state, lga },
    });

    revalidatePath("/ecosystem");
    return { success: true, data: { facilityId: data.id } };
  } catch (err: unknown) {
    console.error("createProcessingFacilityAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ------------------------------------------------------------------------------
// 6. RECORD PROCESSING EVENT (Transformation: Input -> Process -> Output)
// ------------------------------------------------------------------------------
export async function recordProcessingEventAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ eventId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = processingEventSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify processing transformation event details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      facilityId,
      processType,
      inputDescription,
      inputQuantity,
      inputUnit,
      inputSourceOutputId,
      outputDescription,
      outputQuantity,
      outputUnit,
      yieldPercentage,
      batchReference,
      resultingOutputId,
      resultingListingId,
      notes,
      metadata,
    } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("processing_events")
      .insert({
        processor_id: user.id,
        facility_id: facilityId ?? null,
        process_type: processType,
        input_description: inputDescription,
        input_quantity: inputQuantity,
        input_unit: inputUnit,
        input_source_output_id: inputSourceOutputId ?? null,
        output_description: outputDescription,
        output_quantity: outputQuantity,
        output_unit: outputUnit,
        yield_percentage: yieldPercentage ?? null,
        batch_reference: batchReference ?? null,
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
        resulting_output_id: resultingOutputId ?? null,
        resulting_listing_id: resultingListingId ?? null,
        notes: notes ?? null,
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to record processing event" };
    }

    // Append value chain event
    await supabase.from("value_chain_events").insert({
      event_type: "PROCESSED",
      entity_type: "PROCESSING_EVENT",
      entity_id: data.id,
      actor_id: user.id,
      event_title: `Processed ${inputQuantity} ${inputUnit} (${inputDescription}) into ${outputQuantity} ${outputUnit} (${outputDescription})`,
      event_details: { processType, batchReference, yieldPercentage } as unknown as Json,
      state: "Lagos", // default or facility state
    });

    await recordAuditLog({
      actorId: user.id,
      action: "PROCESSING_EVENT_RECORDED",
      resourceType: "processing_events",
      resourceId: data.id,
      newValues: { processType, inputQuantity, inputUnit, outputQuantity, outputUnit },
    });

    revalidatePath("/ecosystem");
    return { success: true, data: { eventId: data.id } };
  } catch (err: unknown) {
    console.error("recordProcessingEventAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ------------------------------------------------------------------------------
// 7. APPEND VALUE-CHAIN EVENT (Append-Only Event Ledger)
// ------------------------------------------------------------------------------
export async function appendValueChainEventAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ eventId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = valueChainEventSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify value chain event fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { eventType, entityType, entityId, eventTitle, eventDetails, state, lga, occurredAt } =
      parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("value_chain_events")
      .insert({
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        actor_id: user.id,
        event_title: eventTitle,
        event_details: eventDetails as unknown as Json,
        state,
        lga: lga ?? null,
        occurred_at: occurredAt || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to append value chain event" };
    }

    revalidatePath("/ecosystem");
    return { success: true, data: { eventId: data.id } };
  } catch (err: unknown) {
    console.error("appendValueChainEventAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ------------------------------------------------------------------------------
// 8. CREATE B2B DEMAND
// ------------------------------------------------------------------------------
export async function createB2BDemandAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ demandId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    if (typeof raw.specifications === "string") {
      try {
        raw.specifications = JSON.parse(raw.specifications);
      } catch {
        raw.specifications = { rawSpec: raw.specifications };
      }
    }

    const parsed = b2bDemandSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify B2B demand parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      title,
      commodityOrProduct,
      quantity,
      unit,
      specifications,
      targetPricePerUnit,
      state,
      lga,
      desiredDeliveryDate,
      frequency,
      notes,
      businessProfileId,
      metadata,
    } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("b2b_demands")
      .insert({
        buyer_id: user.id,
        business_profile_id: businessProfileId ?? null,
        title,
        commodity_or_product: commodityOrProduct,
        quantity,
        unit,
        specifications: specifications as unknown as Json,
        target_price_per_unit: targetPricePerUnit ?? null,
        state,
        lga,
        desired_delivery_date: desiredDeliveryDate,
        frequency,
        status: "ACTIVE",
        notes: notes ?? null,
        metadata: metadata as unknown as Json,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to create B2B demand" };
    }

    await recordAuditLog({
      actorId: user.id,
      action: "B2B_DEMAND_CREATED",
      resourceType: "b2b_demands",
      resourceId: data.id,
      newValues: { title, commodityOrProduct, quantity, unit, state },
    });

    revalidatePath("/ecosystem");
    return { success: true, data: { demandId: data.id } };
  } catch (err: unknown) {
    console.error("createB2BDemandAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ------------------------------------------------------------------------------
// 9. EVALUATE COORDINATED MATCH (Server Action for Client UI)
// ------------------------------------------------------------------------------
export async function evaluateCoordinatedMatchAction(
  demandId: string
): Promise<ActionResponse<ValueChainMatchResult | null>> {
  try {
    const { getValueChainMatchForDemand } = await import("./queries");
    const result = await getValueChainMatchForDemand(demandId);
    return { success: true, data: result };
  } catch (err: unknown) {
    console.error("evaluateCoordinatedMatchAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

