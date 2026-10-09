/**
 * AgroMarket Phase 3.15: Evidence-Grounded Agricultural Intelligence & RAG Foundation
 * Domain Contracts, Types, and Interfaces
 */

import { SearchSourceType, SearchRankingExplanation, RetrievalMode } from "@/features/semantic-search/types";
import { KnowledgeProvenance, KnowledgeConfidence, KnowledgeGeographicScope } from "@/features/knowledge-graph/types";
import { NigerianState } from "@/features/marketplace/constants";

// -----------------------------------------------------------------------------
// 1. QUESTION CATEGORIES
// -----------------------------------------------------------------------------

export const RAG_QUESTION_CATEGORIES = [
  "CROP_PRODUCTION",
  "MARKET_OBSERVATION",
  "SUPPLY_CHAIN_RELATIONSHIP",
  "REGIONAL_FOOD_SECURITY",
  "LOGISTICS_CONSTRAINT",
  "DISEASE_BIOSECURITY",
  "AGRICULTURAL_PROCESSING",
  "HISTORICAL_COMPARISON",
  "RECOMMENDATION_EXPLANATION",
  "GENERAL_AGRONOMIC",
] as const;

export type RagQuestionCategory = (typeof RAG_QUESTION_CATEGORIES)[number];

// -----------------------------------------------------------------------------
// 2. GENERATION MODES
// -----------------------------------------------------------------------------

export const RAG_GENERATION_MODES = [
  "EVIDENCE_GROUNDED_SYNTHESIS",
  "EVIDENCE_ONLY_FALLBACK",
] as const;

export type RagGenerationMode = (typeof RAG_GENERATION_MODES)[number];

// -----------------------------------------------------------------------------
// 3. RETRIEVED EVIDENCE ITEM
// -----------------------------------------------------------------------------

export interface RagEvidenceItem {
  evidenceId: string; // e.g. "EVI-1", "EVI-2"
  documentId: string;
  sourceType: SearchSourceType;
  sourceEntityId: string;
  canonicalReference: string;
  sourceTitle: string;
  relevantExcerpt: string;
  provenance: KnowledgeProvenance;
  confidence: KnowledgeConfidence;
  geographicScope: KnowledgeGeographicScope;
  locationState: NigerianState | string | null;
  locationLga: string | null;
  validityWindow: {
    from: string;
    until: string | null;
  };
  retrievalScore: number;
  rankingReasons: SearchRankingExplanation[];
  isHistorical: boolean;
}

// -----------------------------------------------------------------------------
// 4. CITATION CONTRACT
// -----------------------------------------------------------------------------

export interface RagCitation {
  citationId: string; // e.g. "[CIT-1]"
  evidenceId: string; // references RagEvidenceItem.evidenceId (e.g. "EVI-1")
  sourceType: SearchSourceType;
  sourceTitle: string;
  canonicalReference: string;
  supportingExcerpt: string;
  provenance: KnowledgeProvenance;
  confidence: KnowledgeConfidence;
  isHistorical: boolean;
}

// -----------------------------------------------------------------------------
// 5. CONFLICT DISCLOSURE
// -----------------------------------------------------------------------------

export interface RagConflictDisclosure {
  topic: string;
  primaryClaim: string;
  conflictingClaim: string;
  primarySource: string;
  conflictingSource: string;
  primaryProvenance: KnowledgeProvenance;
  conflictingProvenance: KnowledgeProvenance;
  explanation: string;
}

// -----------------------------------------------------------------------------
// 6. STRUCTURED ANSWER CONTRACT
// -----------------------------------------------------------------------------

export interface SuggestedAction {
  intent: string;
  label: string;
  route: string;
}

export interface EvidenceGroundedAnswer {
  query: string;
  category: RagQuestionCategory;
  answer: string;
  summary: string;
  keyPoints: string[];
  citations: RagCitation[];
  limitations: string[];
  confidence: KnowledgeConfidence;
  provenanceSummary: Record<KnowledgeProvenance, number>;
  conflicts: RagConflictDisclosure[];
  generatedAt: string;
  generationMode: RagGenerationMode;
  needsProfessionalReview: boolean;
  professionalReviewNotice?: string;
  insufficientEvidence: boolean;
  evidenceSet: RagEvidenceItem[];
  suggestedActions: SuggestedAction[];
  retrievalMode: RetrievalMode;
  providerInfo: {
    provider: string;
    model: string;
  };
  executionTimeMs: number;
}

// -----------------------------------------------------------------------------
// 7. QUERY OPTIONS & PARAMETERS
// -----------------------------------------------------------------------------

export interface RagQueryOptions {
  category?: RagQuestionCategory;
  state?: NigerianState | string;
  lga?: string;
  commodity?: string;
  includeHistorical?: boolean;
  maxEvidenceCount?: number;
}

// -----------------------------------------------------------------------------
// 8. RAG AUDIT / METRICS
// -----------------------------------------------------------------------------

export interface RagQueryMetrics {
  totalQueries: number;
  byCategory: Record<RagQuestionCategory, number>;
  byGenerationMode: Record<RagGenerationMode, number>;
  professionalReviewCount: number;
  conflictsDetectedCount: number;
  insufficientEvidenceCount: number;
}
