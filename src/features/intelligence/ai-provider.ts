/**
 * AgroMarket Phase 2.2: AI & Agent Reasoning Foundation
 * AI Provider Abstraction, Adapters, and Configuration Factory
 *
 * Implements a pluggable interface for LLM providers (OpenAI, Gemini, Mock, Unavailable)
 * without hard-coding to a single vendor or fabricating fake responses in production.
 */

import { ReasoningRequest, StructuredReasoningOutput } from "./reasoning-contracts";
import { AGROMARKET_AI_SYSTEM_PROMPT, buildReasoningUserPrompt } from "./prompts";

export interface ProviderGenerateParams {
  request: ReasoningRequest;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}

export interface ProviderGenerateResult {
  rawResponseText: string;
  parsedOutput?: StructuredReasoningOutput;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly model: string;
  isAvailable(): boolean;
  generateReasoning(params: ProviderGenerateParams): Promise<ProviderGenerateResult>;
}

/**
 * 1. UNAVAILABLE PROVIDER
 * Returned when no API credentials or provider are configured in the environment.
 * Prevents silent fabrication of responses and informs caller cleanly.
 */
export class UnavailableAIProvider implements AIProvider {
  readonly id = "UNAVAILABLE";
  readonly name = "Unavailable AI Provider";
  readonly model = "none";

  isAvailable(): boolean {
    return false;
  }

  async generateReasoning(): Promise<ProviderGenerateResult> {
    throw new Error(
      "AI Provider Unavailable: No valid AI provider credentials (AI_API_KEY) configured in the environment."
    );
  }
}

/**
 * 2. OPENAI PROVIDER ADAPTER
 * Communicates with OpenAI-compatible chat completion endpoints using strict JSON formatting.
 */
export class OpenAIProviderAdapter implements AIProvider {
  readonly id = "OPENAI";
  readonly name = "OpenAI Provider Adapter";
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, model = "gpt-4o-mini", baseUrl = "https://api.openai.com/v1") {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateReasoning(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
    if (!this.isAvailable()) {
      throw new Error("OpenAI API key is missing or empty.");
    }

    const startTime = Date.now();
    const systemPrompt = AGROMARKET_AI_SYSTEM_PROMPT;
    const userPrompt = buildReasoningUserPrompt(params.request);

    const payload = {
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Low temperature for calibrated, consistent reasoning
      max_tokens: 2000,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: params.abortSignal,
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      if (response.status === 401) {
        throw new Error(`OpenAI Authentication Failed: Invalid API key.`);
      }
      if (response.status === 429) {
        throw new Error(`OpenAI Rate Limit Exceeded: ${errorText}`);
      }
      throw new Error(`OpenAI API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const rawContent = choice?.message?.content || "";

    return {
      rawResponseText: rawContent,
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      latencyMs,
    };
  }
}

/**
 * 3. GEMINI PROVIDER ADAPTER
 * Communicates with Google Gemini API via REST endpoint with JSON MIME type.
 */
export class GeminiProviderAdapter implements AIProvider {
  readonly id = "GEMINI";
  readonly name = "Google Gemini Provider Adapter";
  readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model = "gemini-2.0-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generateReasoning(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
    if (!this.isAvailable()) {
      throw new Error("Gemini API key is missing or empty.");
    }

    const startTime = Date.now();
    const systemPrompt = AGROMARKET_AI_SYSTEM_PROMPT;
    const userPrompt = buildReasoningUserPrompt(params.request);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: params.abortSignal,
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Gemini Authentication Failed: Invalid credentials.`);
      }
      if (response.status === 429) {
        throw new Error(`Gemini Rate Limit Exceeded: ${errorText}`);
      }
      throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const rawContent = candidate?.content?.parts?.[0]?.text || "";

    return {
      rawResponseText: rawContent,
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      latencyMs,
    };
  }
}

/**
 * 4. MOCK TESTING PROVIDER
 * Exclusively used in unit and integration test suites.
 */
export class MockTestingProvider implements AIProvider {
  readonly id = "MOCK_TEST";
  readonly name = "Mock Testing AI Provider";
  readonly model = "mock-model-v1";
  private mockResultGenerator: (params: ProviderGenerateParams) => Promise<ProviderGenerateResult>;

  constructor(
    mockResultGenerator?: (params: ProviderGenerateParams) => Promise<ProviderGenerateResult>
  ) {
    this.mockResultGenerator =
      mockResultGenerator ||
      (async () => ({
        rawResponseText: JSON.stringify({
          summary: "Market evidence indicates tomato supply contraction in Kano.",
          interpretation:
            "Available evidence suggests that high transit delays combined with seasonal harvest taper are reducing terminal arrivals.",
          keyFindings: [
            "Wholesale prices rose +18.5% over the 7-day baseline.",
            "Farm output aggregations in Dawanau reported 22% lower volume.",
          ],
          supportingEvidence: [
            {
              sourceType: "PRICE_OBSERVATION",
              sourceId: "obs-101",
              description: "Wholesale basket price increased in Kano municipal market.",
              relevance: 0.95,
            },
          ],
          uncertainty: "Weather conditions over the next 48 hours could alter harvest volume.",
          modelConfidence: 0.82,
          recommendation: {
            title: "Coordinate Tomato Inflow from Plateau Agro-Corridor",
            recommendation:
              "Relevant regional aggregators and B2B buyers may consider dispatching supply from Plateau cold-storage buffer pools to stabilize Kano wholesale markets.",
            expectedImpact: {
              primaryMetric: "PRICE_VOLATILITY",
              estimatedChange: "-12% over 5 days",
              timeframeDays: 5,
              qualitativeSummary: "Restores market liquidity and prevents acute urban supply deficit.",
            },
            affectedActors: ["AGGREGATOR", "COMMERCIAL_BUYER"],
            affectedCommodities: ["Tomato"],
            affectedLocations: ["Kano", "Plateau"],
          },
          limitations: ["Logistics transit window assumes no major arterial highway blockades."],
          safetyNotes: ["All recommendations are advisory and require human commercial review."],
        }),
        promptTokens: 420,
        completionTokens: 280,
        latencyMs: 150,
      }));
  }

  isAvailable(): boolean {
    return true;
  }

  async generateReasoning(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
    return this.mockResultGenerator(params);
  }
}

/**
 * 5. PROVIDER FACTORY
 * Inspects environment variables: AI_PROVIDER, AI_MODEL, AI_API_KEY
 */
export function getAIProvider(overrideProvider?: AIProvider): AIProvider {
  if (overrideProvider) {
    return overrideProvider;
  }

  const providerType = (process.env.AI_PROVIDER || "").toUpperCase().trim();
  const apiKey = (process.env.AI_API_KEY || "").trim();
  const model = process.env.AI_MODEL?.trim();

  if (!apiKey) {
    return new UnavailableAIProvider();
  }

  switch (providerType) {
    case "OPENAI":
      return new OpenAIProviderAdapter(apiKey, model || "gpt-4o-mini");
    case "GEMINI":
      return new GeminiProviderAdapter(apiKey, model || "gemini-2.0-flash");
    default:
      // If an API key is present but no provider specified, default to OpenAI if key starts with sk-
      if (apiKey.startsWith("sk-")) {
        return new OpenAIProviderAdapter(apiKey, model || "gpt-4o-mini");
      }
      return new UnavailableAIProvider();
  }
}
