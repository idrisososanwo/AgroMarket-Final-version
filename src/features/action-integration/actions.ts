"use server";

/**
 * AgroMarket Phase 3.3: Action Integration Server Actions
 * Governed server-side mutations for action initiation, revalidation, and lifecycle tracking.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { evaluateActionGovernanceGate } from "@/features/intelligence-governance/action-gate";
import { getCurrentUser } from "@/lib/auth/server";
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

    // Phase 3.8: Server-Side Governance Gate Enforcement
    const currentUser = await getCurrentUser();
    const actorRole = currentUser?.roles?.[0] || "BUYER";

    const gateResult = await evaluateActionGovernanceGate({
      recommendationId,
      actionIntent,
      actorRole,
      domain: destinationType,
      commodity: (contextPayload as Record<string, unknown>)?.commodity as string | undefined,
      contextPayload: contextPayload as Record<string, unknown>,
      userId: user.id,
    });

    if (!gateResult.isPermitted) {
      return {
        success: false,
        error: `Governance Policy Block: ${gateResult.message}${
          gateResult.blockingReason ? ` (${gateResult.blockingReason})` : ""
        }`,
      };
    }

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

/**
 * Server Action: Queries the deterministic governance gate status for an action intent.
 */
export async function checkActionGovernanceGateAction(params: {
  recommendationId: string;
  actionIntent: string;
  destinationType: string;
  commodity?: string | null;
  state?: string | null;
}): Promise<
  ActionResult<{
    isPermitted: boolean;
    decision: string;
    message: string;
    blockingReason?: string;
  }>
> {
  try {
    const user = await getCurrentUser();
    const actorRole = user?.roles?.[0] || "BUYER";

    const gateResult = await evaluateActionGovernanceGate({
      recommendationId: params.recommendationId,
      actionIntent: params.actionIntent,
      actorRole,
      domain: params.destinationType,
      commodity: params.commodity || undefined,
      contextPayload: { commodity: params.commodity, state: params.state },
      userId: user?.id,
    });

    return {
      success: true,
      data: {
        isPermitted: gateResult.isPermitted,
        decision: gateResult.evaluation.decision,
        message: gateResult.message,
        blockingReason: gateResult.blockingReason ?? undefined,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to evaluate governance gate.";
    return { success: false, error: message };
  }
}
