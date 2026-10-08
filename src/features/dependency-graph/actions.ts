"use server";

/**
 * AgroMarket Phase 3.12: Agricultural Dependency Graph Server Actions
 *
 * Governed server-authoritative actions for:
 * - Creating strongly-typed dependency relationships
 * - Recording deterministic concentration assessments
 * - Executing cascade traversal queries
 */

import { getCurrentUser } from "@/lib/auth/server";
import {
  createDependencyRelationshipInputSchema,
  assessConcentrationInputSchema,
  assertNoProhibitedProduceDependency,
} from "./validation";
import {
  DependencyRelationship,
  DependencyAssessment,
  CreateDependencyRelationshipInput,
  AssessConcentrationInput,
  ConcentrationAnalysisResult,
  DependencyCascadeResult,
} from "./types";
import {
  saveDependencyRelationship,
  saveDependencyAssessment,
  executeDependencyCascadeQuery,
} from "./data-layer";
import { calculateConcentrationRisk } from "./concentration-engine";
import { evaluateGovernancePolicy } from "@/features/intelligence-governance/policy-engine";

export interface DependencyActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Governed action to create or record an agricultural dependency relationship.
 */
export async function createDependencyRelationshipAction(
  input: CreateDependencyRelationshipInput
): Promise<DependencyActionResult<DependencyRelationship>> {
  // 1. Authenticate user
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  // 2. Validate input schema
  const parsed = createDependencyRelationshipInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_FAILED",
    };
  }

  const data = parsed.data;

  // 3. Assert Anti-Pork policy
  assertNoProhibitedProduceDependency(data.commodity, "Create Dependency Edge");

  // 4. Governance Evaluation (Advisory Network Mutation)
  const govResult = evaluateGovernancePolicy({
    actorRole: user.roles.includes("ADMIN") ? "ADMIN" : (user.roles[0] || "USER"),
    actionIntent: "EXECUTE_COORDINATED_FULFILMENT",
    agentId: "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
    domain: "AGRICULTURAL_COORDINATION",
    commodity: data.commodity ?? undefined,
    state: data.locationState ?? undefined,
    lga: data.locationLga ?? undefined,
    confidenceScore: 0.95,
  });

  if (govResult.decision === "DENY") {
    return {
      success: false,
      error: `Governance Denied: ${govResult.reasons.join(", ")}`,
      code: "GOVERNANCE_DENIED",
    };
  }

  // 5. Construct domain relationship
  const relId = crypto.randomUUID();
  const relationship: DependencyRelationship = {
    id: relId,
    sourceNodeType: data.sourceNodeType,
    sourceNodeId: data.sourceNodeId,
    relationshipType: data.relationshipType,
    targetNodeType: data.targetNodeType,
    targetNodeId: data.targetNodeId,
    relationshipNature: data.relationshipNature,
    dependencyStrength: data.dependencyStrength,
    confidence: data.confidence,
    provenance: data.provenance,
    commodity: data.commodity || null,
    geographicScope: data.geographicScope,
    locationState: data.locationState || null,
    locationLga: data.locationLga || null,
    flowShare: data.flowShare != null ? data.flowShare : null,
    isActive: true,
    validFrom: data.validFrom || new Date().toISOString(),
    validUntil: data.validUntil || null,
    metadata: {
      ...data.metadata,
      createdByUserId: user.id,
      createdByUserRole: user.roles.includes("ADMIN") ? "ADMIN" : (user.roles[0] || "USER"),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await saveDependencyRelationship(relationship);
  return {
    success: true,
    data: saved,
  };
}

/**
 * Governed action to execute and record a concentration assessment.
 */
export async function assessAndRecordConcentrationAction(
  input: AssessConcentrationInput & {
    observations: Array<{ entityId: string; entityLabel?: string; sharePercentage?: number; absoluteQuantity?: number }>;
  }
): Promise<DependencyActionResult<ConcentrationAnalysisResult>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = assessConcentrationInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
      code: "VALIDATION_FAILED",
    };
  }

  const result = calculateConcentrationRisk({
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    concentrationType: input.concentrationType,
    observations: input.observations || [],
  });

  // If valid computation, persist assessment record
  if (result.status === "COMPUTED") {
    const assessmentId = crypto.randomUUID();
    const assessment: DependencyAssessment = {
      id: assessmentId,
      entityType: input.subjectType,
      entityId: input.subjectId,
      assessmentType:
        input.concentrationType === "SUPPLIER"
          ? "SUPPLIER_CONCENTRATION"
          : input.concentrationType === "PROCESSING"
          ? "PROCESSING_BOTTLENECK"
          : input.concentrationType === "CORRIDOR"
          ? "CORRIDOR_BOTTLENECK"
          : "REGIONAL_CONCENTRATION",
      classification: result.classification,
      concentrationRatio: result.concentrationRatio,
      dominantEntityType: null,
      dominantEntityId: result.dominantEntityId,
      dominantEntityLabel: result.dominantEntityLabel,
      affectedCommodity: input.commodity || null,
      locationState: input.locationState || null,
      riskSummary: result.advisoryGuidance,
      confidence: result.confidence,
      provenance: result.provenance,
      cascadeDepth: 1,
      metadata: {
        assessedByUserId: user.id,
        isSinglePointOfFailure: result.isSinglePointOfFailure,
      },
      assessedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await saveDependencyAssessment(assessment);
  }

  return {
    success: true,
    data: result,
  };
}

/**
 * Server action to run a bounded cascade traversal query.
 */
export async function runDependencyCascadeQueryAction(params: {
  rootNodeType: import("./types").DependencyNodeType;
  rootNodeId: string;
  maxDepth?: number;
  commodityFilter?: string | null;
}): Promise<DependencyActionResult<DependencyCascadeResult>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  assertNoProhibitedProduceDependency(params.commodityFilter, "Cascade Query Commodity");

  const result = await executeDependencyCascadeQuery({
    rootNodeType: params.rootNodeType,
    rootNodeId: params.rootNodeId,
    maxDepth: params.maxDepth,
    commodityFilter: params.commodityFilter,
  });

  return {
    success: true,
    data: result,
  };
}
