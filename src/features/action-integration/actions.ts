"use server";

/**
 * AgroMarket Phase 3.3: Action Integration Server Actions
 * Governed server-side mutations for action initiation, revalidation, and lifecycle tracking.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createActionIntegrationSchema,
  revalidationCheckSchema,
  updateActionIntegrationStatusSchema,
  assertNoProhibitedProduce,
} from "./validation";
import {
  recordActionIntegration,
  updateActionIntegrationStatus,
  calculateIntelligenceEffectivenessMetrics,
} from "./data-layer";
import { revalidateActionDestination } from "./revalidation";
import { ActionIntegrationItem, IntelligenceEffectivenessMetrics, RevalidationResult } from "./types";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Records user initiation of an action integration from an intelligence recommendation
 */
export async function createActionIntegrationAction(
  rawInput: unknown
): Promise<ActionResult<ActionIntegrationItem>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to initiate action integrations." };
    }

    assertNoProhibitedProduce(rawInput, "Action Integration Initiation");

    const parsed = createActionIntegrationSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const {
      recommendationId,
      decisionId,
      actionId,
      actionIntent,
      destinationType,
      destinationUrl,
      contextPayload,
      metadata,
    } = parsed.data;

    const integration = await recordActionIntegration({
      userId: user.id,
      recommendationId,
      decisionId,
      actionId,
      actionIntent,
      destinationType,
      destinationUrl,
      contextPayload,
      status: "ACTION_INITIATED",
      revalidationStatus: "VALID",
      metadata,
    });

    revalidatePath("/my-intelligence");
    revalidatePath("/intelligence");

    return { success: true, data: integration };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record action integration.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Updates the outcome status of an action integration
 */
export async function updateActionIntegrationStatusAction(
  rawInput: unknown
): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const parsed = updateActionIntegrationStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const { integrationId, status, revalidationStatus, revalidationDetails, metadata } =
      parsed.data;

    const ok = await updateActionIntegrationStatus(integrationId, status, {
      revalidationStatus,
      revalidationDetails,
      metadata,
    });

    revalidatePath("/my-intelligence");
    return { success: ok, data: ok };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update action integration status.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Runs live revalidation on an action destination
 */
export async function revalidateActionDestinationAction(
  rawInput: unknown
): Promise<ActionResult<RevalidationResult>> {
  try {
    const parsed = revalidationCheckSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const result = await revalidateActionDestination(parsed.data);
    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revalidate destination.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Calculates current intelligence effectiveness metrics
 */
export async function calculateIntelligenceEffectivenessMetricsAction(): Promise<
  ActionResult<IntelligenceEffectivenessMetrics>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const metrics = await calculateIntelligenceEffectivenessMetrics(user?.id);
    return { success: true, data: metrics };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to calculate effectiveness metrics.";
    return { success: false, error: message };
  }
}
