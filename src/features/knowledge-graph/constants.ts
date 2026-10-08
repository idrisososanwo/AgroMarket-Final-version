/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Graph & Ontology Constants
 */

import {
  KnowledgeConceptType,
  KnowledgeRelationshipType,
  KnowledgeQualityStatus,
} from "./types";

// -----------------------------------------------------------------------------
// 1. TRAVERSAL & BOUNDED RECURSION LIMITS
// -----------------------------------------------------------------------------

export const DEFAULT_MAX_HIERARCHY_DEPTH = 3;
export const ABSOLUTE_MAX_HIERARCHY_DEPTH = 5;

export const DEFAULT_MAX_NEIGHBORHOOD_DEPTH = 2;
export const ABSOLUTE_MAX_NEIGHBORHOOD_DEPTH = 3;

export const DEFAULT_MAX_NEIGHBORHOOD_NODES = 50;
export const ABSOLUTE_MAX_NEIGHBORHOOD_NODES = 100;

// -----------------------------------------------------------------------------
// 2. ADVISORY DISCLAIMERS & NOTICES
// -----------------------------------------------------------------------------

export const KNOWLEDGE_ADVISORY_DISCLAIMER =
  "Agricultural knowledge graph concepts and relationships are strictly informational and advisory. " +
  "They do not constitute veterinary diagnoses, medical advice, agronomic guarantees, or autonomous decisions. " +
  "All operational commitments and consequential changes remain subject to human verification and governance.";

export const FOOD_HEALTH_DISCLAIMER =
  "Food and health contexts represent nutritional awareness and food hygiene storage principles. " +
  "They are not medical diagnoses, dietary prescriptions, or clinical therapy.";

export const BIOSECURITY_DISCLAIMER =
  "Disease and biosecurity associations represent documented agricultural risk pathways. " +
  "They do not replace official veterinary authorities, diagnostic laboratory tests, or statutory quarantine notices.";

// -----------------------------------------------------------------------------
// 3. HUMAN-FRIENDLY LABELS FOR PRESENTATION
// -----------------------------------------------------------------------------

export const CONCEPT_TYPE_LABELS: Record<KnowledgeConceptType, string> = {
  COMMODITY: "Commodity",
  CROP: "Crop",
  LIVESTOCK: "Livestock",
  POULTRY: "Poultry",
  AQUACULTURE: "Aquaculture",
  INPUT: "Agricultural Input",
  DISEASE: "Crop / Livestock Disease",
  BIOSECURITY_CONCEPT: "Biosecurity Concept",
  PROCESS: "Post-Harvest / Processing Method",
  PRODUCTION_SYSTEM: "Production System",
  VALUE_CHAIN_STAGE: "Value Chain Stage",
  PROCESSING_OUTPUT: "Processing Derivative / Output",
  MARKET: "Wholesale Market",
  REGION: "Agro-Ecological Region",
  STATE: "Nigerian State",
  LGA: "Local Government Area (LGA)",
  LOGISTICS_CONCEPT: "Logistics Concept",
  LOGISTICS_CORRIDOR: "Logistics Corridor",
  EQUIPMENT: "Agricultural Equipment",
  SERVICE: "Agricultural Service",
  FOOD_SECURITY_CONCEPT: "Food Security Concept",
  FOOD_HEALTH_CONCEPT: "Food & Health Concept",
  AGRICULTURAL_PRACTICE: "Good Agricultural Practice (GAP)",
  KNOWLEDGE_TOPIC: "Knowledge Topic",
  KNOWLEDGE_CONTENT: "Educational Content",
  ORGANIZATION_TYPE: "Organization Type",
};

export const RELATIONSHIP_TYPE_LABELS: Record<KnowledgeRelationshipType, string> = {
  IS_A: "Is A (Taxonomic Subtype)",
  PART_OF: "Part Of",
  RELATED_TO: "Semantically Related To",
  PRODUCES: "Yields / Produces",
  REQUIRES: "Requires Prerequisite",
  USED_FOR: "Utilized For",
  GROWS_IN: "Cultivated In",
  COMMON_IN: "Prevalent In",
  PROCESSED_INTO: "Processed Into",
  PROCESSED_BY: "Processed By Method",
  SOLD_IN: "Traded In Market",
  DEMANDED_BY: "Demanded By Sector",
  TRANSPORTED_THROUGH: "Transported Through Corridor",
  AFFECTED_BY: "Affected By Pathology",
  AT_RISK_FROM: "Exposed To Risk",
  HAS_INPUT: "Requires Agro-Input",
  HAS_PROCESS: "Undergoes Process",
  HAS_MARKET: "Associated With Market",
  HAS_VALUE_CHAIN_STAGE: "Belongs To Stage",
  HAS_OUTPUT: "Yields Product Output",
  ALTERNATIVE_TO: "Functional Alternative To",
  SIMILAR_TO: "Agronomically Similar To",
  PRECEDES: "Precedes Chronologically",
  FOLLOWS: "Follows Chronologically",
  ASSOCIATED_WITH: "Contextually Associated With",
  HAS_KNOWLEDGE: "Referenced By Knowledge",
  HAS_FOOD_HEALTH_CONTEXT: "Nutritional / Health Context",
};

export const QUALITY_STATUS_LABELS: Record<KnowledgeQualityStatus, { label: string; badgeClass: string }> = {
  DRAFT: { label: "Draft", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  REVIEW: { label: "Under Review", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  VERIFIED: { label: "Peer Verified", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PUBLISHED: { label: "Published Canonical", badgeClass: "bg-green-100 text-green-800 border-green-300" },
  ARCHIVED: { label: "Archived Historical", badgeClass: "bg-gray-100 text-gray-700 border-gray-300" },
  REJECTED: { label: "Rejected", badgeClass: "bg-red-50 text-red-700 border-red-200" },
};
