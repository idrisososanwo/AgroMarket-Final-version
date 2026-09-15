/**
 * AI Domain Boundary
 * AI service layer for agronomic advisory, crop disease diagnosis assistance, and voice/multilingual assistance.
 *
 * CRITICAL SAFETY RULES:
 * - AI is strictly an advisory service layer.
 * - AI must NEVER make ungrounded, authoritative veterinary, medical, or dangerous chemical claims.
 * - Always include clear safety disclaimers urging on-ground consultation with certified extension workers.
 */

export interface AiAdvisoryRequest {
  farmerId: string;
  query: string;
  cropType?: string;
  symptoms?: string[];
  imageUrl?: string;
}

export interface AiAdvisoryResponse {
  summary: string;
  potentialFactors: string[];
  recommendedPractices: string[];
  safetyDisclaimer: string;
}
