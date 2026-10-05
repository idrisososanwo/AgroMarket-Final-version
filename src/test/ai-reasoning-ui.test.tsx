// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIReasoningPanel } from "@/features/intelligence/components/ai-reasoning-panel";
import { AIReasoningRun } from "@/features/intelligence/reasoning-contracts";

vi.mock("@/features/intelligence/ai-actions", () => ({
  requestAgentReasoningAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      status: "COMPLETED",
      runId: "run-101",
    },
  }),
}));

describe("Phase 2.2: AI Reasoning UI Component Tests", () => {
  const mockRuns: AIReasoningRun[] = [
    {
      id: "run-1",
      agentId: "AGRICULTURAL_INTELLIGENCE",
      objective: "MARKET_INTERPRETATION",
      commodity: "Tomato",
      state: "Kano",
      lga: "Dawanau",
      corridor: "Northern Arterial",
      provider: "OPENAI",
      model: "gpt-4o-mini",
      promptTokens: 450,
      completionTokens: 250,
      latencyMs: 820,
      status: "COMPLETED",
      errorMessage: null,
      requestedBy: "user-1",
      createdAt: new Date().toISOString(),
    },
    {
      id: "run-2",
      agentId: "AGRICULTURAL_INTELLIGENCE",
      objective: "FOOD_SECURITY_ASSESSMENT",
      commodity: "White Maize",
      state: "Kaduna",
      lga: null,
      corridor: null,
      provider: "OPENAI",
      model: "gpt-4o-mini",
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: 110,
      status: "REJECTED_SAFETY",
      errorMessage: "Pre-check safety failure: Anti-Pork Violation detected.",
      requestedBy: "user-1",
      createdAt: new Date().toISOString(),
    },
    {
      id: "run-3",
      agentId: "AGRICULTURAL_INTELLIGENCE",
      objective: "LOGISTICS_IMPACT_ASSESSMENT",
      commodity: "Cassava Tubers",
      state: "Benue",
      lga: null,
      corridor: "Middle Belt",
      provider: "UNAVAILABLE",
      model: "none",
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: 0,
      status: "PROVIDER_UNAVAILABLE",
      errorMessage: "AI Provider is not configured or unavailable in the current environment.",
      requestedBy: null,
      createdAt: new Date().toISOString(),
    },
  ];

  it("renders the controlled reasoning notice banner and trigger form", () => {
    render(<AIReasoningPanel runs={[]} />);

    expect(
      screen.getByText(/Controlled Evidence-Grounded Reasoning Layer/i)
    ).toBeDefined();
    expect(
      screen.getByText(/Trigger Controlled Reasoning Pipeline/i)
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /Execute Reasoning/i })).toBeDefined();
  });

  it("renders empty state message when no reasoning runs exist", () => {
    render(<AIReasoningPanel runs={[]} />);

    expect(
      screen.getByText(/No AI reasoning runs executed yet/i)
    ).toBeDefined();
  });

  it("renders reasoning run items with status badges and provider metadata", () => {
    render(<AIReasoningPanel runs={mockRuns} />);

    expect(screen.getByText(/Reasoning Runs \(3\)/i)).toBeDefined();
    expect(screen.getAllByText("Tomato").length).toBeGreaterThan(0);
    expect(screen.getAllByText("White Maize").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cassava Tubers").length).toBeGreaterThan(0);

    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Safety Rejection").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Provider Unavailable").length).toBeGreaterThan(0);
  });

  it("inspects run details and displays error message when rejected run is clicked", () => {
    render(<AIReasoningPanel runs={mockRuns} />);

    // Click on the second run (White Maize with safety rejection)
    const runItem = screen.getByText("White Maize");
    fireEvent.click(runItem);

    expect(screen.getByText(/Rejection \/ Error Reason/i)).toBeDefined();
    expect(
      screen.getByText(/Anti-Pork Violation detected/i)
    ).toBeDefined();
  });
});
