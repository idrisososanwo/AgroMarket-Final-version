/**
 * AgroMarket Phase 3.15: RAG Prompt Builder
 * Constructs unambiguous system and user prompts enforcing strict grounded synthesis.
 */

import { RagQuestionCategory, RagEvidenceItem } from "./types";
import { RAG_SYSTEM_PROMPT } from "./constants";
import { buildEvidenceContextBlock } from "./context-builder";

export interface PromptPackage {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Builds user prompt requiring grounded citations matching supplied evidence.
 */
export function buildRagPromptPackage(params: {
  question: string;
  category: RagQuestionCategory;
  evidenceSet: RagEvidenceItem[];
  commodity?: string;
  state?: string;
}): PromptPackage {
  const contextBlock = buildEvidenceContextBlock(params.evidenceSet);

  const scopeDetails = [
    params.category ? `Category: ${params.category}` : "",
    params.commodity ? `Commodity: ${params.commodity}` : "",
    params.state ? `State Focus: ${params.state}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  const userPrompt = `
AGRICULTURAL INQUIRY:
"${params.question}"

INQUIRY CONTEXT:
${scopeDetails || "General agricultural context"}

RETRIEVED AGROMARKET EVIDENCE CONTEXT:
${contextBlock}

RESPONSE REQUIREMENTS:
Provide your evidence-grounded answer as a strict JSON object with the following fields:
{
  "summary": "1-2 sentence high-level executive summary.",
  "answer": "Detailed explanation synthesizing the evidence. Every factual statement must cite its evidence ID, e.g. [CIT-1] corresponding to EVI-1.",
  "keyPoints": ["Bullet point 1 citing evidence", "Bullet point 2 citing evidence"],
  "citations": [
    {
      "citationId": "[CIT-1]",
      "evidenceId": "EVI-1",
      "sourceTitle": "Title of the cited source",
      "supportingExcerpt": "Exact excerpt from the evidence supporting the claim"
    }
  ],
  "limitations": ["Any gaps in the retrieved evidence or temporal boundaries"],
  "conflicts": [
    {
      "topic": "Topic of conflict",
      "primaryClaim": "Claim from source 1",
      "conflictingClaim": "Claim from source 2",
      "primarySource": "Source 1 title",
      "conflictingSource": "Source 2 title",
      "explanation": "Why they differ"
    }
  ],
  "needsProfessionalReview": false,
  "insufficientEvidence": false
}

DO NOT output markdown code fences or explanatory text outside the JSON object.
`.trim();

  return {
    systemPrompt: RAG_SYSTEM_PROMPT,
    userPrompt,
  };
}
