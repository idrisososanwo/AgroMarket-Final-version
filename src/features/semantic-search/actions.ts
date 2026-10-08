"use server";

/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search Server Actions
 * Governed server actions for indexing, re-indexing, visibility management, and search execution.
 *
 * SAFETY INVARIANTS:
 * - Governed: Mutating actions evaluate governance policies before execution.
 * - Anti-Pork Zero Tolerance: Asserts policy at action boundaries.
 * - Advisory-only: Search never executes autonomous financial or physical commitments.
 */

import { getCurrentUser } from "@/lib/auth/server";
import {
  AgriculturalSearchDocument,
  AgriculturalSearchResponse,
  StructuredSearchFilters,
  SearchVisibilityStatus,
  SearchPublicationStatus,
} from "./types";
import {
  searchQueryInputSchema,
  indexDocumentInputSchema,
  assertNoProhibitedProduceSearch,
} from "./validation";
import {
  indexSearchDocument,
  updateSearchVisibility,
} from "./indexing";
import { executeAgriculturalSearch } from "./retrieval";
import { evaluateGovernancePolicy } from "@/features/intelligence-governance/policy-engine";

export interface SearchActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Governed action to index a new agricultural knowledge or intelligence document.
 */
export async function indexKnowledgeDocumentAction(
  rawInput: unknown
): Promise<SearchActionResult<AgriculturalSearchDocument>> {
  // 1. Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required to index search documents." };
  }

  // 2. Validate input schema
  const parsed = indexDocumentInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_FAILED",
    };
  }

  // 3. Anti-Pork policy
  assertNoProhibitedProduceSearch(parsed.data.title, "Index Knowledge Document Action Title");
  assertNoProhibitedProduceSearch(parsed.data.searchableText, "Index Knowledge Document Action Body");

  // 4. Governance evaluation
  const govResult = evaluateGovernancePolicy({
    actorRole: user.roles.includes("ADMIN") ? "ADMIN" : (user.roles[0] || "USER"),
    actionIntent: "EXECUTE_COORDINATED_FULFILMENT",
    agentId: "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
    domain: "AGRICULTURAL_COORDINATION",
    confidenceScore: 0.95,
  });

  if (govResult.decision === "DENY") {
    return {
      success: false,
      error: `Governance Denied: ${govResult.reasons.join(", ")}`,
      code: "GOVERNANCE_DENIED",
    };
  }

  try {
    const doc = await indexSearchDocument(parsed.data, user.id);
    return { success: true, data: doc };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to index search document.",
      code: "INDEXING_FAILED",
    };
  }
}

/**
 * Governed action to update document search visibility and publication status.
 */
export async function updateSearchVisibilityAction(
  documentId: string,
  visibilityStatus: SearchVisibilityStatus,
  publicationStatus?: SearchPublicationStatus
): Promise<SearchActionResult<AgriculturalSearchDocument>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required to change search visibility." };
  }

  const govResult = evaluateGovernancePolicy({
    actorRole: user.roles.includes("ADMIN") ? "ADMIN" : (user.roles[0] || "USER"),
    actionIntent: "EXECUTE_COORDINATED_FULFILMENT",
    agentId: "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
    domain: "AGRICULTURAL_COORDINATION",
    confidenceScore: 0.95,
  });

  if (govResult.decision === "DENY") {
    return {
      success: false,
      error: `Governance Denied: ${govResult.reasons.join(", ")}`,
      code: "GOVERNANCE_DENIED",
    };
  }

  const updated = await updateSearchVisibility(
    documentId,
    visibilityStatus,
    publicationStatus,
    user.id
  );

  if (!updated) {
    return { success: false, error: "Search document not found.", code: "NOT_FOUND" };
  }

  return { success: true, data: updated };
}

/**
 * Executes an agricultural search query from client or server component.
 */
export async function executeAgriculturalSearchAction(
  query: string,
  filters: StructuredSearchFilters = {}
): Promise<SearchActionResult<AgriculturalSearchResponse>> {
  const parsed = searchQueryInputSchema.safeParse({ query, ...filters });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_FAILED",
    };
  }

  try {
    const response = await executeAgriculturalSearch(parsed.data.query, filters);
    return { success: true, data: response };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Search execution failed.",
      code: "SEARCH_FAILED",
    };
  }
}
