// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/admin/intelligence",
}));

// Mock server actions
vi.mock("@/features/intelligence/actions", () => ({
  runDeterministicPipelineAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      signals: [
        {
          id: "sig-test-mock",
          agentId: "AGRICULTURAL_INTELLIGENCE",
          signalType: "PRICE_INCREASE",
          commodity: "Broiler Chicken",
          state: "Lagos",
          magnitude: 20,
          confidence: 0.88,
          source: "TEST_ENGINE",
          evidence: [
            {
              sourceType: "PRICE_OBSERVATION",
              sourceId: "obs-test",
              description: "Mock price evidence",
              observedAt: "2026-10-05T00:00:00Z",
              relevance: 1.0,
            },
          ],
          observedAt: "2026-10-05T00:00:00Z",
          expiresAt: "2026-10-12T00:00:00Z",
          createdAt: "2026-10-05T00:00:00Z",
        },
      ],
      recommendations: [
        {
          id: "rec-test-mock",
          agentId: "AGRICULTURAL_INTELLIGENCE",
          objective: "DEMAND_FULFILLMENT",
          title: "Coordinate Emergency Offtake for Broiler Chicken in Lagos",
          recommendation: "Mock recommendation details.",
          evidence: [],
          confidence: 0.88,
          expectedImpact: {
            primaryMetric: "PRICE_STABILITY",
            estimatedChange: "-10%",
            timeframeDays: 7,
            qualitativeSummary: "Relieves wholesale deficit.",
          },
          affectedActors: ["FARMER", "AGGREGATOR"],
          affectedCommodities: ["Broiler Chicken"],
          affectedLocations: ["Lagos"],
          status: "PROPOSED",
          expiresAt: "2026-10-12T00:00:00Z",
          createdAt: "2026-10-05T00:00:00Z",
          updatedAt: "2026-10-05T00:00:00Z",
        },
      ],
    },
  }),
  reviewRecommendationAction: vi.fn().mockResolvedValue({
    success: true,
    data: { recommendationId: "rec-1", newStatus: "APPROVED" },
  }),
}));

import { AgentsRegistryCard } from "@/features/intelligence/components/agents-registry-card";
import { SignalsFeed } from "@/features/intelligence/components/signals-feed";
import { RecommendationsList } from "@/features/intelligence/components/recommendations-list";
import { EvaluationsTable } from "@/features/intelligence/components/evaluations-table";
import { IntelligenceOverview } from "@/features/intelligence/components/intelligence-overview";
import {
  IntelligenceAgent,
  IntelligenceSignal,
  IntelligenceRecommendation,
  IntelligenceEvaluation,
} from "@/features/intelligence/types";

describe("Phase 2.1: Agricultural Intelligence UI Component Tests", () => {
  const sampleAgents: IntelligenceAgent[] = [
    {
      id: "AGRICULTURAL_INTELLIGENCE",
      name: "Core Agricultural Intelligence Agent",
      version: "1.0.0",
      description: "Primary deterministic coordination and signal processing engine.",
      capabilities: ["PRICE_TREND_ANALYSIS", "SUPPLY_DEMAND_BALANCING"],
      status: "ACTIVE",
      createdAt: "2026-10-05T00:00:00Z",
      updatedAt: "2026-10-05T00:00:00Z",
    },
    {
      id: "MARKET_INTELLIGENCE",
      name: "Commodity Market Intelligence Agent",
      version: "1.0.0",
      description: "Monitors wholesale commodity market trends.",
      capabilities: ["VOLATILITY_MONITORING"],
      status: "ACTIVE",
      createdAt: "2026-10-05T00:00:00Z",
      updatedAt: "2026-10-05T00:00:00Z",
    },
  ];

  const sampleSignals: IntelligenceSignal[] = [
    {
      id: "sig-1",
      agentId: "AGRICULTURAL_INTELLIGENCE",
      signalType: "SUPPLY_SHORTAGE",
      commodity: "Broiler Chicken",
      state: "Lagos",
      magnitude: 35,
      confidence: 0.9,
      source: "TEST_SOURCE",
      evidence: [
        {
          sourceType: "PRODUCTION_OUTPUT",
          sourceId: "out-1",
          description: "Harvest output down in Ogun farm belt.",
          observedAt: "2026-10-05T00:00:00Z",
          relevance: 1.0,
        },
      ],
      observedAt: "2026-10-05T00:00:00Z",
      expiresAt: "2026-10-12T00:00:00Z",
      createdAt: "2026-10-05T00:00:00Z",
    },
  ];

  const sampleRecommendations: IntelligenceRecommendation[] = [
    {
      id: "rec-1",
      agentId: "AGRICULTURAL_INTELLIGENCE",
      objective: "DEMAND_FULFILLMENT",
      title: "Mobilize Regional Broiler Aggregation to Lagos",
      recommendation: "Coordinate farm gate collections from Ogun producers to alleviate city center shortage.",
      evidence: [],
      confidence: 0.88,
      expectedImpact: {
        primaryMetric: "PRICE_STABILITY",
        estimatedChange: "-8% price relief",
        timeframeDays: 7,
        qualitativeSummary: "Restores market balance.",
      },
      affectedActors: ["FARMER", "AGGREGATOR"],
      affectedCommodities: ["Broiler Chicken"],
      affectedLocations: ["Lagos"],
      status: "PROPOSED",
      expiresAt: "2026-10-12T00:00:00Z",
      createdAt: "2026-10-05T00:00:00Z",
      updatedAt: "2026-10-05T00:00:00Z",
    },
  ];

  const sampleEvaluations: IntelligenceEvaluation[] = [
    {
      id: "eval-1",
      predictionId: "pred-abc-123456",
      outcomeId: "out-xyz-789",
      predictedValue: 450,
      actualValue: 455,
      absoluteError: 5,
      percentageError: 1.1,
      directionAccurate: true,
      withinPredictedRange: true,
      evaluationScore: 0.95,
      evaluatedAt: "2026-10-05T00:00:00Z",
      createdAt: "2026-10-05T00:00:00Z",
    },
  ];

  it("1. renders AgentsRegistryCard with active agents", () => {
    render(<AgentsRegistryCard agents={sampleAgents} />);
    expect(screen.getByText("Ecosystem Intelligence Agents Registry")).toBeDefined();
    expect(screen.getByText("Core Agricultural Intelligence Agent")).toBeDefined();
    expect(screen.getByText("Commodity Market Intelligence Agent")).toBeDefined();
  });

  it("2. renders SignalsFeed with active signals and empty state", () => {
    const { rerender } = render(<SignalsFeed signals={sampleSignals} />);
    expect(screen.getByText("SUPPLY SHORTAGE")).toBeDefined();
    expect(screen.getByText("Broiler Chicken")).toBeDefined();
    expect(screen.getByText("Confidence: 90%")).toBeDefined();

    rerender(<SignalsFeed signals={[]} />);
    expect(screen.getByText(/No active signals currently detected/i)).toBeDefined();
  });

  it("3. renders RecommendationsList with human review controls", () => {
    render(<RecommendationsList recommendations={sampleRecommendations} />);
    expect(screen.getByText("Mobilize Regional Broiler Aggregation to Lagos")).toBeDefined();
    expect(screen.getByText("Review Recommendation")).toBeDefined();

    // Click review button to reveal review form
    fireEvent.click(screen.getByText("Review Recommendation"));
    expect(screen.getByText("Confirm Approval")).toBeDefined();
    expect(screen.getByText("Reject")).toBeDefined();
  });

  it("4. renders EvaluationsTable with historical learning error metrics", () => {
    const { rerender } = render(<EvaluationsTable evaluations={sampleEvaluations} />);
    expect(screen.getByText("Agent Memory & Prediction Evaluations")).toBeDefined();
    expect(screen.getByText("450 → 455")).toBeDefined();
    expect(screen.getByText("1.1%")).toBeDefined();
    expect(screen.getByText("Correct")).toBeDefined();
    expect(screen.getByText("95%")).toBeDefined();

    rerender(<EvaluationsTable evaluations={[]} />);
    expect(screen.getByText(/No prediction evaluations recorded yet/i)).toBeDefined();
  });

  it("5. renders master IntelligenceOverview and switches tabs", () => {
    render(
      <IntelligenceOverview
        agents={sampleAgents}
        signals={sampleSignals}
        observations={[]}
        recommendations={sampleRecommendations}
        evaluations={sampleEvaluations}
      />
    );

    expect(screen.getByText("Agricultural Intelligence Foundation")).toBeDefined();

    // Switch to Recommendations tab
    fireEvent.click(screen.getByText(/Advisory Recommendations/i));
    expect(screen.getByText("Mobilize Regional Broiler Aggregation to Lagos")).toBeDefined();

    // Switch to Memory & Evaluations tab
    fireEvent.click(screen.getByText(/Memory & Evaluations/i));
    expect(screen.getByText("450 → 455")).toBeDefined();

    // Switch to Agents tab
    fireEvent.click(screen.getByText(/Agents Registry/i));
    expect(screen.getByText("Core Agricultural Intelligence Agent")).toBeDefined();
  });

  it("6. renders interactive deterministic pipeline test controls", () => {
    render(
      <IntelligenceOverview
        agents={sampleAgents}
        signals={sampleSignals}
        observations={[]}
        recommendations={sampleRecommendations}
        evaluations={sampleEvaluations}
      />
    );

    const testBtn = screen.getByText("Run Signal Evaluation");
    expect(testBtn).toBeDefined();
    expect(screen.getByText(/Test Deterministic Pipeline Engine/i)).toBeDefined();
  });
});
