/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search Embedding Provider Layer
 * Pluggable provider abstraction with honest fallback when no vector provider is configured.
 *
 * CRITICAL SAFETY RULES:
 * - Never generate fake vectors or random numbers.
 * - Never mark an embedding as COMPLETED without an authentic provider response.
 * - Honest UNAVAILABLE / PENDING status when no provider API key is present.
 */

import { EmbeddingProvider, EmbeddingProviderStatus } from "./types";
import { assertNoProhibitedProduceSearch } from "./validation";

// -----------------------------------------------------------------------------
// 1. NO-OP EMBEDDING PROVIDER (DEFAULT / SAFE FALLBACK)
// -----------------------------------------------------------------------------

export class NoopEmbeddingProvider implements EmbeddingProvider {
  providerName(): string {
    return "NONE";
  }

  getDimensions(): number {
    return 1536;
  }

  isAvailable(): boolean {
    return false;
  }

  async embedDocument(_text: string): Promise<number[] | null> {
    return null;
  }

  async embedQuery(_query: string): Promise<number[] | null> {
    return null;
  }
}

// -----------------------------------------------------------------------------
// 2. ACTIVE PROVIDER FACTORY & REGISTRATION
// -----------------------------------------------------------------------------

let activeProvider: EmbeddingProvider = new NoopEmbeddingProvider();

export function setEmbeddingProvider(provider: EmbeddingProvider): void {
  activeProvider = provider;
}

export function resetEmbeddingProvider(): void {
  activeProvider = new NoopEmbeddingProvider();
}

export function getEmbeddingProvider(): EmbeddingProvider {
  return activeProvider;
}

// -----------------------------------------------------------------------------
// 3. SAFE EMBEDDING ORCHESTRATION PIPELINE
// -----------------------------------------------------------------------------

export interface EmbeddingGenerationResult {
  vector: number[] | null;
  status: EmbeddingProviderStatus;
  provider: string;
  model: string;
  version: string;
  dimensions: number;
  error: string | null;
}

/**
 * Attempts to generate an authentic embedding for an indexed document text.
 * Strictly asserts anti-pork invariant on input before sending to any provider.
 * If provider is unavailable, honestly returns status UNAVAILABLE without fabricating vectors.
 */
export async function generateDocumentEmbedding(
  text: string,
  modelName = "text-embedding-3-small"
): Promise<EmbeddingGenerationResult> {
  assertNoProhibitedProduceSearch(text, "Document Embedding Content");

  const provider = getEmbeddingProvider();
  if (!provider.isAvailable()) {
    return {
      vector: null,
      status: "UNAVAILABLE",
      provider: provider.providerName(),
      model: modelName,
      version: "1.0.0",
      dimensions: provider.getDimensions(),
      error: "No active embedding provider configured. Operating in lexical/ontology mode.",
    };
  }

  try {
    const vector = await provider.embedDocument(text);
    if (!vector || vector.length === 0) {
      return {
        vector: null,
        status: "FAILED",
        provider: provider.providerName(),
        model: modelName,
        version: "1.0.0",
        dimensions: provider.getDimensions(),
        error: "Provider returned empty vector response.",
      };
    }

    return {
      vector,
      status: "COMPLETED",
      provider: provider.providerName(),
      model: modelName,
      version: "1.0.0",
      dimensions: vector.length,
      error: null,
    };
  } catch (err: unknown) {
    return {
      vector: null,
      status: "FAILED",
      provider: provider.providerName(),
      model: modelName,
      version: "1.0.0",
      dimensions: provider.getDimensions(),
      error: err instanceof Error ? err.message : "Embedding generation failed.",
    };
  }
}

/**
 * Attempts to generate an authentic embedding for a search query.
 * Strictly asserts anti-pork invariant on query.
 */
export async function generateQueryEmbedding(
  query: string
): Promise<number[] | null> {
  assertNoProhibitedProduceSearch(query, "Search Query Embedding");

  const provider = getEmbeddingProvider();
  if (!provider.isAvailable()) {
    return null;
  }

  try {
    return await provider.embedQuery(query);
  } catch {
    return null;
  }
}
