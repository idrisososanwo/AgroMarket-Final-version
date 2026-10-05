"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit";
import {
  ReasoningObjective,
  reasoningObjectiveSchema,
} from "./reasoning-contracts";
import { assertNoProhibitedProduce, validateNigerianState } from "./validation";
import { getIntelligenceSignals, getIntelligenceObservations } from "./queries";
import { runAgentReasoning, OrchestrationResult } from "./orchestrator";
import { ActionResult } from "./actions";

export interface RequestReasoningInput {
  agentId?: string;
  objective: ReasoningObjective;
  commodity: string;
  state: string;
  lga?: string;
  corridor?: string;
  constraints?: string[];
}

/**
 * Server action to initiate an evidence-grounded AI reasoning run
 */
export async function requestAgentReasoningAction(
  rawInput: RequestReasoningInput
): Promise<ActionResult<OrchestrationResult>> {
  try {
    const user = await requireAuth();

    // 1. Validate objective
    const parsedObjective = reasoningObjectiveSchema.safeParse(rawInput.objective);
    if (!parsedObjective.success) {
      return { success: false, error: "Invalid reasoning objective requested." };
    }

    // 2. Validate commodity & Anti-pork
    assertNoProhibitedProduce(rawInput.commodity, "Reasoning commodity");

    // 3. Validate state
    const normalizedState = validateNigerianState(rawInput.state);

    // 4. Fetch real signals and observations from Phase 2.1 intelligence data layer
    const [signals, observations] = await Promise.all([
      getIntelligenceSignals({
        commodity: rawInput.commodity,
        state: normalizedState,
        limit: 10,
      }),
      getIntelligenceObservations({
        commodity: rawInput.commodity,
        state: normalizedState,
        limit: 10,
      }),
    ]);

    // 5. Invoke orchestrator
    const result = await runAgentReasoning({
      agentId: rawInput.agentId || "AGRICULTURAL_INTELLIGENCE",
      objective: parsedObjective.data,
      commodity: rawInput.commodity,
      location: {
        state: normalizedState,
        lga: rawInput.lga,
        corridor: rawInput.corridor,
      },
      signals,
      observations,
      constraints: rawInput.constraints,
      userId: user.id,
    });

    // 6. Record security audit log
    await recordAuditLog({
      actorId: user.id,
      action: "AI_REASONING_EXECUTED",
      resourceType: "AI_REASONING_RUN",
      resourceId: result.runId || "pending",
      metadata: {
        objective: rawInput.objective,
        commodity: rawInput.commodity,
        state: normalizedState,
        status: result.status,
        provider: result.provider,
        model: result.model,
        hasRecommendation: Boolean(result.recommendationId),
      },
    });

    revalidatePath("/admin/intelligence");

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Reasoning pipeline failed.",
        data: result,
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error during reasoning execution.",
    };
  }
}
