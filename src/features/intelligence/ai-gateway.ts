/**
 * AgroMarket Phase 2.2: AI & Agent Reasoning Foundation
 * AI Gateway Layer: Timeout, Retry with Exponential Backoff, Rate Throttling, and Error Normalization
 */

import { AIProvider, ProviderGenerateResult } from "./ai-provider";
import {
  ReasoningRequest,
  StructuredReasoningOutput,
  structuredReasoningOutputSchema,
} from "./reasoning-contracts";

export interface GatewayExecutionConfig {
  timeoutMs?: number;
  maxRetries?: number;
  backoffInitialMs?: number;
}

export type GatewayErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "AUTH_ERROR"
  | "SCHEMA_MISMATCH"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export class GatewayError extends Error {
  readonly code: GatewayErrorCode;
  readonly isRetryable: boolean;

  constructor(message: string, code: GatewayErrorCode, isRetryable = false) {
    super(message);
    this.name = "GatewayError";
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

export interface GatewayResponse {
  success: boolean;
  output?: StructuredReasoningOutput;
  rawText?: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  errorCode?: GatewayErrorCode;
  errorMessage?: string;
}

/**
 * Strips markdown code blocks like ```json ... ``` if output by LLM
 */
export function extractCleanJson(rawText: string): string {
  const trimmed = rawText.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Sleep helper for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * AI Gateway orchestrator for single-request execution
 */
export class AIGateway {
  private readonly provider: AIProvider;
  private readonly config: Required<GatewayExecutionConfig>;

  constructor(provider: AIProvider, config?: GatewayExecutionConfig) {
    this.provider = provider;
    this.config = {
      timeoutMs: config?.timeoutMs ?? 15000,
      maxRetries: config?.maxRetries ?? 2,
      backoffInitialMs: config?.backoffInitialMs ?? 400,
    };
  }

  async executeReasoning(request: ReasoningRequest): Promise<GatewayResponse> {
    if (!this.provider.isAvailable()) {
      return {
        success: false,
        provider: this.provider.id,
        model: this.provider.model,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs: 0,
        errorCode: "PROVIDER_UNAVAILABLE",
        errorMessage: "AI Provider is not configured or unavailable in the current environment.",
      };
    }

    let lastError: Error | null = null;
    let attempts = 0;
    const maxAttempts = 1 + this.config.maxRetries;

    while (attempts < maxAttempts) {
      attempts++;
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, this.config.timeoutMs);

      try {
        const result: ProviderGenerateResult = await this.provider.generateReasoning({
          request,
          timeoutMs: this.config.timeoutMs,
          abortSignal: abortController.signal,
        });
        clearTimeout(timeoutId);

        // Parse and validate structured output
        const cleanJson = extractCleanJson(result.rawResponseText);
        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(cleanJson);
        } catch (jsonErr) {
          return {
            success: false,
            rawText: result.rawResponseText,
            provider: this.provider.id,
            model: this.provider.model,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            latencyMs: result.latencyMs,
            errorCode: "SCHEMA_MISMATCH",
            errorMessage: `AI response was not valid JSON: ${(jsonErr as Error).message}`,
          };
        }

        const parseResult = structuredReasoningOutputSchema.safeParse(parsedJson);
        if (!parseResult.success) {
          const firstErr = parseResult.error.errors[0]?.message || "Output schema mismatch";
          return {
            success: false,
            rawText: result.rawResponseText,
            provider: this.provider.id,
            model: this.provider.model,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            latencyMs: result.latencyMs,
            errorCode: "SCHEMA_MISMATCH",
            errorMessage: `Schema validation failed: ${firstErr}`,
          };
        }

        return {
          success: true,
          output: parseResult.data,
          rawText: result.rawResponseText,
          provider: this.provider.id,
          model: this.provider.model,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          latencyMs: result.latencyMs,
        };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        lastError = err as Error;

        // Check if aborted due to timeout
        if (abortController.signal.aborted || (lastError && lastError.name === "AbortError")) {
          return {
            success: false,
            provider: this.provider.id,
            model: this.provider.model,
            promptTokens: 0,
            completionTokens: 0,
            latencyMs: this.config.timeoutMs,
            errorCode: "TIMEOUT",
            errorMessage: `AI Provider timed out after ${this.config.timeoutMs}ms.`,
          };
        }

        const message = lastError.message || "";
        const isAuthError = /auth|credential|unauthorized|401|403/i.test(message);
        if (isAuthError) {
          return {
            success: false,
            provider: this.provider.id,
            model: this.provider.model,
            promptTokens: 0,
            completionTokens: 0,
            latencyMs: 0,
            errorCode: "AUTH_ERROR",
            errorMessage: message,
          };
        }

        const isRateLimit = /rate limit|429/i.test(message);
        if (attempts < maxAttempts) {
          // Exponential backoff
          const delay = this.config.backoffInitialMs * Math.pow(2, attempts - 1);
          await sleep(delay);
          continue;
        }

        return {
          success: false,
          provider: this.provider.id,
          model: this.provider.model,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: 0,
          errorCode: isRateLimit ? "RATE_LIMIT" : "NETWORK_ERROR",
          errorMessage: message,
        };
      }
    }

    return {
      success: false,
      provider: this.provider.id,
      model: this.provider.model,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: 0,
      errorCode: "UNKNOWN",
      errorMessage: lastError?.message || "Reasoning execution failed after retries.",
    };
  }
}
