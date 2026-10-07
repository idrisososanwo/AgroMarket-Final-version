// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntelligenceContextBanner } from "@/features/action-integration/components/intelligence-context-banner";
import { ActionIntegrationButton } from "@/features/action-integration/components/action-integration-button";
import { EffectivenessMetricsPanel } from "@/features/action-integration/components/effectiveness-metrics-panel";
import { ActionResolvedRoute, IntelligenceEffectivenessMetrics } from "@/features/action-integration/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/features/action-integration/actions", () => ({
  createActionIntegrationAction: vi.fn().mockResolvedValue({
    success: true,
    data: { id: "test-integration-id" },
  }),
  revalidateActionDestinationAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      status: "VALID",
      isAvailable: true,
      message: "Verified 3 active listings.",
    },
  }),
}));

describe("Phase 3.3: Action Integration UI Components", () => {
  const sampleResolvedRoute: ActionResolvedRoute = {
    intent: "VIEW_SUPPLY_OPTIONS",
    destinationType: "MARKETPLACE",
    url: "/marketplace?commodity=cassava&state=Ogun",
    buttonLabel: "View Available Supply",
    guidanceText: "Review verified active supply for cassava in Ogun.",
    requiresRevalidation: true,
    contextBannerText: "You are viewing available supply because intelligence identified a regional supply gap.",
  };

  const sampleMetrics: IntelligenceEffectivenessMetrics = {
    totalRecommendationsGenerated: 25,
    recommendationsViewed: 20,
    recommendationsDecided: 15,
    actionsInitiated: 12,
    actionsCompleted: 10,
    actionsCancelled: 2,
    actionsFailed: 0,
    recommendationViewRate: 0.8,
    decisionRate: 0.6,
    actionInitiationRate: 0.8,
    actionCompletionRate: 0.833,
    recommendationToActionConversionRate: 0.4,
    actionSuccessRate: 0.833,
    dismissalRate: 0.1,
    deferralRate: 0.1,
    avgMinutesToDecision: 15.0,
    avgMinutesToAction: 30.0,
    governanceNote:
      "Metrics represent empirical associations between recommendations and user actions. AgroMarket does not claim causal determinism without verified external control groups.",
  };

  // 1. Intelligence Context Banner
  it("renders IntelligenceContextBanner with contextual details and explainability link", () => {
    render(
      <IntelligenceContextBanner
        commodity="cassava"
        state="Ogun"
        recommendationId="rec-123"
      />
    );

    expect(screen.getByText(/Intelligence Context:/i)).toBeDefined();
    expect(screen.getByText(/cassava/i)).toBeDefined();
    expect(screen.getByText(/Ogun/i)).toBeDefined();
    expect(screen.getByText(/Why am I seeing this\?/i)).toBeDefined();
  });

  it("dismisses IntelligenceContextBanner when the close button is clicked", () => {
    const onDismissMock = vi.fn();
    render(
      <IntelligenceContextBanner
        commodity="maize"
        state="Kaduna"
        onDismiss={onDismissMock}
      />
    );

    const dismissButton = screen.getByRole("button", { name: /dismiss intelligence notice/i });
    expect(dismissButton).toBeDefined();

    fireEvent.click(dismissButton);
    expect(onDismissMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Intelligence Context:/i)).toBeNull();
  });

  // 2. Action Integration Button
  it("renders ActionIntegrationButton with the correct label and triggers action", async () => {
    render(
      <ActionIntegrationButton
        recommendationId="rec-123"
        resolvedRoute={sampleResolvedRoute}
        commodity="cassava"
        state="Ogun"
      />
    );

    const button = screen.getByRole("button", { name: /view available supply/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
  });

  // 3. Effectiveness Metrics Panel
  it("renders EffectivenessMetricsPanel with all key rates and governance disclaimer", () => {
    render(<EffectivenessMetricsPanel metrics={sampleMetrics} />);

    expect(screen.getByText(/Intelligence-to-Action Effectiveness Analytics/i)).toBeDefined();
    expect(screen.getAllByText("80.0%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("60.0%")).toBeDefined(); // Decision Rate
    expect(screen.getByText(/Governance Disclaimer:/i)).toBeDefined();
    expect(screen.getByText(/empirical associations/i)).toBeDefined();
  });
});
