/**
 * AgroMarket Phase 3.12: Agricultural Dependency Graph Privacy Sanitization
 *
 * Enforces:
 * - Scrubbing of private B2B contracts, prices, phone numbers, and exact farm GPS
 * - Anonymization of producer identifiers for peer viewers
 * - Preservation of aggregate structural network topology and commodity indicators
 */

import {
  DependencyRelationship,
  DependencyNode,
  DependencyCascadeResult,
} from "./types";

/**
 * Sanitizes a single dependency relationship for viewer context.
 */
export function sanitizeDependencyRelationshipForViewer(
  rel: DependencyRelationship,
  viewerUserId?: string | null,
  isAdmin: boolean = false
): DependencyRelationship {
  if (isAdmin) {
    return rel;
  }

  // Create clean metadata copy without private attributes
  const safeMetadata: Record<string, unknown> = {};
  if (rel.metadata) {
    for (const [key, value] of Object.entries(rel.metadata)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("price") ||
        lower.includes("phone") ||
        lower.includes("gps") ||
        lower.includes("address") ||
        lower.includes("contract") ||
        lower.includes("agreement") ||
        lower.includes("bank")
      ) {
        continue;
      }
      safeMetadata[key] = value;
    }
  }

  // Anonymize private producer IDs for non-admin viewers
  const isPrivateSource = rel.sourceNodeType === "PRODUCER";
  const isPrivateTarget = rel.targetNodeType === "PRODUCER";

  return {
    ...rel,
    sourceNodeId: isPrivateSource ? `masked-${rel.sourceNodeId.slice(0, 8)}` : rel.sourceNodeId,
    sourceLabel: isPrivateSource
      ? `Producer (${rel.locationState || "Regional"})`
      : rel.sourceLabel,
    targetNodeId: isPrivateTarget ? `masked-${rel.targetNodeId.slice(0, 8)}` : rel.targetNodeId,
    targetLabel: isPrivateTarget
      ? `Producer (${rel.locationState || "Regional"})`
      : rel.targetLabel,
    metadata: safeMetadata,
  };
}

/**
 * Sanitizes a dependency node for public/peer view.
 */
export function sanitizeDependencyNodeForViewer(
  node: DependencyNode,
  viewerUserId?: string | null,
  isAdmin: boolean = false
): DependencyNode {
  if (isAdmin) {
    return node;
  }

  const isPrivateProducer = node.type === "PRODUCER";
  return {
    ...node,
    id: isPrivateProducer ? `masked-${node.id.slice(0, 8)}` : node.id,
    label: isPrivateProducer ? `Producer (${node.state || "Regional"})` : node.label,
    metadata: {},
  };
}

/**
 * Sanitizes an entire cascade traversal result.
 */
export function sanitizeCascadeResultForViewer(
  result: DependencyCascadeResult,
  viewerUserId?: string | null,
  isAdmin: boolean = false
): DependencyCascadeResult {
  if (isAdmin) {
    return result;
  }

  const sanitizedSteps = result.steps.map((step) => {
    const isSourcePrivate = step.sourceNodeType === "PRODUCER";
    const isTargetPrivate = step.targetNodeType === "PRODUCER";
    return {
      ...step,
      sourceNodeId: isSourcePrivate ? `masked-${step.sourceNodeId.slice(0, 8)}` : step.sourceNodeId,
      targetNodeId: isTargetPrivate ? `masked-${step.targetNodeId.slice(0, 8)}` : step.targetNodeId,
    };
  });

  const sanitizedExposures = result.downstreamExposures.map((exp) => {
    const isPrivate = exp.nodeType === "PRODUCER";
    return {
      ...exp,
      nodeId: isPrivate ? `masked-${exp.nodeId.slice(0, 8)}` : exp.nodeId,
      label: isPrivate ? `Producer (Confidential)` : exp.label,
    };
  });

  return {
    ...result,
    rootNodeId:
      result.rootNodeType === "PRODUCER"
        ? `masked-${result.rootNodeId.slice(0, 8)}`
        : result.rootNodeId,
    steps: sanitizedSteps,
    downstreamExposures: sanitizedExposures,
  };
}
