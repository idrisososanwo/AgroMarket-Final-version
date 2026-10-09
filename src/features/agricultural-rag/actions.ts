"use server";

/**
 * AgroMarket Phase 3.15: Agricultural RAG Server Actions
 * Governed server actions for evidence-grounded agricultural Q&A.
 *
 * SAFETY INVARIANTS:
 * - Governed: Evaluates governance policies at action boundaries.
 * - Anti-Pork Zero Tolerance: Rejects queries containing prohibited porcine terms.
 * - Non-autonomous: Actions provide advisory explanations; never execute transactions.
 */

import { getCurrentUser } from "@/lib/auth/server";
import { EvidenceGroundedAnswer, RagQueryOptions } from "./types";
import { ragQueryInputSchema, assertNoProhibitedProduceRag } from "./validation";
import { askAgriculturalAssistant } from "./queries";
import { evaluateGovernancePolicy } from "@/features/intelligence-governance/policy-engine";

export interface RagActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Governed server action to submit a question to the Agricultural Assistant.
 */
export async function askAgriculturalAssistantAction(
  question: string,
  options: RagQueryOptions = {}
): Promise<RagActionResult<EvidenceGroundedAnswer>> {
  // 1. Zod input validation
  const parsed = ragQueryInputSchema.safeParse({
    question,
    category: options.category || "GENERAL_AGRONOMIC",
    state: options.state,
    lga: options.lga,
    commodity: options.commodity,
    includeHistorical: options.includeHistorical || false,
    maxEvidenceCount: options.maxEvidenceCount || 8,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_FAILED",
    };
  }

  // 2. Anti-Pork zero tolerance assertion
  try {
    assertNoProhibitedProduceRag(parsed.data.question, "Agricultural Question Action");
    if (parsed.data.commodity) {
      assertNoProhibitedProduceRag(parsed.data.commodity, "Commodity Action Filter");
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Prohibited produce detected.",
      code: "ANTI_PORK_VIOLATION",
    };
  }

  // 3. User session & Governance evaluation
  const user = await getCurrentUser();
  const actorRole = user?.roles.includes("ADMIN") ? "ADMIN" : user?.roles[0] || "USER";

  const govResult = evaluateGovernancePolicy({
    actorRole,
    actionIntent: "VIEW_MARKETPLACE",
    agentId: "AGRICULTURAL_ORCHESTRATION_AGENT",
    domain: "KNOWLEDGE_RETRIEVAL",
    confidenceScore: 0.95,
  });

  if (govResult.decision === "DENY") {
    return {
      success: false,
      error: `Governance Denied: ${govResult.reasons.join(", ")}`,
      code: "GOVERNANCE_DENIED",
    };
  }

  // 4. Execute question pipeline
  try {
    const answer = await askAgriculturalAssistant(parsed.data.question, parsed.data);
    return { success: true, data: answer };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to synthesize agricultural answer.",
      code: "RAG_EXECUTION_FAILED",
    };
  }
}
