"use server";

/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Graph Server Actions
 * Governed server actions for mutating concepts, relationships, and entity links
 */

import { getCurrentUser } from "@/lib/auth/server";
import {
  CreateKnowledgeConceptInput,
  CreateKnowledgeRelationshipInput,
  CreateEntityLinkInput,
  KnowledgeConcept,
  KnowledgeRelationship,
  AgriculturalEntityLink,
  KnowledgeQualityStatus,
} from "./types";
import {
  createKnowledgeConceptInputSchema,
  createKnowledgeRelationshipInputSchema,
  createEntityLinkInputSchema,
  assertNoProhibitedProduceKnowledge,
} from "./validation";
import {
  saveKnowledgeConcept,
  saveKnowledgeRelationship,
  saveEntityLink,
  getKnowledgeConceptById,
  getKnowledgeConcepts,
} from "./data-layer";
import { detectHierarchyCycle } from "./hierarchy-engine";
import { evaluateGovernancePolicy } from "@/features/intelligence-governance/policy-engine";

export interface KnowledgeActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Governed action to create a new agricultural knowledge concept.
 */
export async function createKnowledgeConceptAction(
  input: CreateKnowledgeConceptInput
): Promise<KnowledgeActionResult<KnowledgeConcept>> {
  // 1. Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required to create knowledge concepts." };
  }

  // 2. Validate input schema
  const parsed = createKnowledgeConceptInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_FAILED",
    };
  }

  const data = parsed.data;

  // 3. Assert Anti-Pork policy
  assertNoProhibitedProduceKnowledge(data.canonicalName, "Create Concept Canonical Name");
  assertNoProhibitedProduceKnowledge(data.conceptKey, "Create Concept Key");

  // 4. Governance Evaluation (Advisory Knowledge Mutation)
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

  // 5. Hierarchy Cycle Check if parent is set
  const conceptId = crypto.randomUUID();
  if (data.parentConceptId) {
    const allConcepts = await getKnowledgeConcepts();
    const map = new Map<string, KnowledgeConcept>();
    for (const c of allConcepts) map.set(c.id, c);

    if (detectHierarchyCycle(conceptId, data.parentConceptId, map)) {
      return {
        success: false,
        error: "Hierarchy cycle detected: Proposed parent creates a circular dependency.",
        code: "CYCLE_DETECTED",
      };
    }
  }

  // 6. Construct domain concept
  const concept: KnowledgeConcept = {
    id: conceptId,
    conceptKey: data.conceptKey,
    canonicalName: data.canonicalName,
    displayName: data.displayName,
    conceptType: data.conceptType,
    description: data.description || null,
    parentConceptId: data.parentConceptId || null,
    status: data.status,
    provenance: data.provenance,
    confidence: data.confidence,
    geographicScope: data.geographicScope,
    sourceReference: data.sourceReference || null,
    metadata: {
      ...data.metadata,
      createdByUserId: user.id,
      createdByUserRole: user.roles.includes("ADMIN") ? "ADMIN" : (user.roles[0] || "USER"),
    },
    validFrom: data.validFrom || new Date().toISOString(),
    validUntil: data.validUntil || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await saveKnowledgeConcept(concept);
  return {
    success: true,
    data: saved,
  };
}

/**
 * Governed action to create an agricultural knowledge relationship.
 */
export async function createKnowledgeRelationshipAction(
  input: CreateKnowledgeRelationshipInput
): Promise<KnowledgeActionResult<KnowledgeRelationship>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = createKnowledgeRelationshipInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_FAILED",
    };
  }

  const data = parsed.data;

  // Verify both concepts exist
  const source = await getKnowledgeConceptById(data.sourceConceptId);
  const target = await getKnowledgeConceptById(data.targetConceptId);
  if (!source || !target) {
    return {
      success: false,
      error: "Both source and target concepts must exist in the knowledge graph.",
      code: "CONCEPT_NOT_FOUND",
    };
  }

  // Governance Evaluation
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

  const relId = crypto.randomUUID();
  const rel: KnowledgeRelationship = {
    id: relId,
    sourceConceptId: data.sourceConceptId,
    relationshipType: data.relationshipType,
    targetConceptId: data.targetConceptId,
    inverseRelationshipType: data.inverseRelationshipType || null,
    relationshipStrength: data.relationshipStrength,
    confidence: data.confidence,
    provenance: data.provenance,
    geographicScope: data.geographicScope,
    locationState: data.locationState || null,
    locationLga: data.locationLga || null,
    status: data.status,
    validFrom: data.validFrom || new Date().toISOString(),
    validUntil: data.validUntil || null,
    metadata: {
      ...data.metadata,
      createdByUserId: user.id,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await saveKnowledgeRelationship(rel);
  return {
    success: true,
    data: saved,
  };
}

/**
 * Governed action to bind a knowledge concept to an operational AgroMarket entity.
 */
export async function createEntityLinkAction(
  input: CreateEntityLinkInput
): Promise<KnowledgeActionResult<AgriculturalEntityLink>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = createEntityLinkInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_FAILED",
    };
  }

  const data = parsed.data;
  const concept = await getKnowledgeConceptById(data.conceptId);
  if (!concept) {
    return { success: false, error: "Referenced concept does not exist.", code: "CONCEPT_NOT_FOUND" };
  }

  // Governance Evaluation
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

  const linkId = crypto.randomUUID();
  const link: AgriculturalEntityLink = {
    id: linkId,
    conceptId: data.conceptId,
    entityType: data.entityType,
    entityId: data.entityId,
    linkNature: data.linkNature,
    confidence: data.confidence,
    provenance: data.provenance,
    metadata: {
      ...data.metadata,
      linkedByUserId: user.id,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await saveEntityLink(link);
  return {
    success: true,
    data: saved,
  };
}

/**
 * Governed action to promote quality lifecycle status (e.g. DRAFT -> REVIEW -> VERIFIED -> PUBLISHED).
 */
export async function promoteKnowledgeStatusAction(
  conceptId: string,
  targetStatus: KnowledgeQualityStatus
): Promise<KnowledgeActionResult<KnowledgeConcept>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const isAdmin = user.roles.includes("ADMIN");
  const isExpert = user.roles.includes("EXPERT");
  if (!isAdmin && !isExpert) {
    return { success: false, error: "Only admins or verified experts can promote knowledge status." };
  }

  const concept = await getKnowledgeConceptById(conceptId);
  if (!concept) {
    return { success: false, error: "Concept not found." };
  }

  const updated: KnowledgeConcept = {
    ...concept,
    status: targetStatus,
    metadata: {
      ...concept.metadata,
      promotedByUserId: user.id,
      promotedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  const saved = await saveKnowledgeConcept(updated);
  return {
    success: true,
    data: saved,
  };
}
