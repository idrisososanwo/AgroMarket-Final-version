/**
 * AgroMarket Phase 3.15: RAG Context Assembly
 * Formats structured evidence items into a bounded, tagged context string for generation.
 */

import { RagEvidenceItem } from "./types";
import { MAX_TOTAL_CONTEXT_CHARS } from "./constants";

/**
 * Assembles a bounded, numbered evidence context block for LLM prompt ingestion.
 */
export function buildEvidenceContextBlock(evidenceSet: RagEvidenceItem[]): string {
  if (!evidenceSet || evidenceSet.length === 0) {
    return "NO EVIDENCE AVAILABLE IN AGROMARKET REPOSITORY.";
  }

  const blocks: string[] = [];
  let currentTotalLength = 0;

  for (const item of evidenceSet) {
    const temporalTag = item.isHistorical ? "[HISTORICAL OBSERVATION]" : "[CURRENT EVIDENCE]";
    const stateTag = item.locationState ? ` | State: ${item.locationState}` : "";
    const lgaTag = item.locationLga ? ` (${item.locationLga})` : "";

    const header = `=== EVIDENCE ITEM [${item.evidenceId}] ===`;
    const meta = `Source: ${item.sourceTitle} | Domain: ${item.sourceType} | Provenance: ${item.provenance} | Confidence: ${item.confidence} ${temporalTag}${stateTag}${lgaTag}`;
    const content = `Content: "${item.relevantExcerpt}"`;

    const block = `${header}\n${meta}\n${content}\n`;

    if (currentTotalLength + block.length > MAX_TOTAL_CONTEXT_CHARS) {
      blocks.push("... [REMAINDER OF EVIDENCE TRUNCATED DUE TO CONTEXT BUDGET] ...");
      break;
    }

    blocks.push(block);
    currentTotalLength += block.length;
  }

  return blocks.join("\n");
}
