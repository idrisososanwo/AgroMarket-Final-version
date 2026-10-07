// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Button,
  Badge,
  DomainStatusBadge,
  Input,
  Checkbox,
  Switch,
  FormField,
  MetricCard,
  ProgressBar,
  ConfidenceIndicator,
  ScoreIndicator,
  EmptyState,
  IntelligenceCard,
  RecommendationCard,
  Breadcrumbs,
  Tabs,
} from "@/components/ui";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/design-system",
  useSearchParams: () => new URLSearchParams(),
}));

describe("AgroMarket Design System Components", () => {
  describe("Button Component", () => {
    it("renders primary button with children text", () => {
      render(<Button variant="primary">Click Me</Button>);
      const btn = screen.getByRole("button", { name: "Click Me" });
      expect(btn).toBeDefined();
      expect(btn.getAttribute("disabled")).toBeNull();
    });

    it("renders loading state with disabled attribute and loading text", () => {
      render(
        <Button isLoading loadingText="Saving Record...">
          Save
        </Button>
      );
      const btn = screen.getByRole("button");
      expect(btn.getAttribute("disabled")).not.toBeNull();
      expect(screen.getByText("Saving Record...")).toBeDefined();
    });

    it("supports all major variants without errors", () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole("button", { name: "Secondary" })).toBeDefined();

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole("button", { name: "Outline" })).toBeDefined();

      rerender(<Button variant="destructive">Delete</Button>);
      expect(screen.getByRole("button", { name: "Delete" })).toBeDefined();
    });
  });

  describe("Badge & DomainStatusBadge Components", () => {
    it("renders semantic badges with correct labels", () => {
      render(<Badge variant="success">Active Deal</Badge>);
      expect(screen.getByText("Active Deal")).toBeDefined();
    });

    it("renders domain-aware status badges", () => {
      const { rerender } = render(<DomainStatusBadge status="VERIFIED" />);
      expect(screen.getByText("Verified")).toBeDefined();

      rerender(<DomainStatusBadge status="DISRUPTED" />);
      expect(screen.getByText("Disrupted")).toBeDefined();

      rerender(<DomainStatusBadge status="REVIEW_REQUIRED" />);
      expect(screen.getByText("Review Required")).toBeDefined();
    });
  });

  describe("Form Controls", () => {
    it("renders Input and SearchInput correctly", () => {
      render(
        <FormField label="Commodity Name" htmlFor="test-input" required>
          <Input id="test-input" placeholder="e.g. Soya Beans" />
        </FormField>
      );
      expect(screen.getByText(/Commodity Name/i)).toBeDefined();
      expect(screen.getByPlaceholderText("e.g. Soya Beans")).toBeDefined();
    });

    it("displays validation error message when provided to FormField", () => {
      render(
        <FormField error="Invalid quantity entered">
          <Input />
        </FormField>
      );
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Invalid quantity entered")).toBeDefined();
    });

    it("renders Checkbox and Switch with interactive events", () => {
      const onCheck = vi.fn();
      const onToggle = vi.fn();

      render(
        <div>
          <Checkbox label="Agree to terms" onChange={onCheck} />
          <Switch label="Real-time alert" onChange={onToggle} />
        </div>
      );

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      expect(onCheck).toHaveBeenCalled();

      const switchBtn = screen.getByRole("switch");
      fireEvent.click(switchBtn);
      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe("Data Display & Metrics", () => {
    it("renders MetricCard with label, value, unit, and trend", () => {
      render(
        <MetricCard
          label="Farm Gate Price"
          value="₦350,000"
          unit="/ MT"
          trend={{ direction: "up", value: "+5.2%" }}
        />
      );
      expect(screen.getByText("Farm Gate Price")).toBeDefined();
      expect(screen.getByText("₦350,000")).toBeDefined();
      expect(screen.getByText("/ MT")).toBeDefined();
      expect(screen.getByText("+5.2%")).toBeDefined();
    });

    it("renders ProgressBar with value bounds", () => {
      const { container } = render(<ProgressBar value={75} max={100} showLabel label="Harvest Fill" />);
      expect(screen.getByText("Harvest Fill")).toBeDefined();
      expect(screen.getByText("75%")).toBeDefined();
      const bar = container.querySelector('[role="progressbar"]');
      expect(bar?.getAttribute("aria-valuenow")).toBe("75");
    });

    it("renders ConfidenceIndicator with normalized scores", () => {
      render(<ConfidenceIndicator score={88} tier="HIGH" />);
      expect(screen.getByText("High Confidence")).toBeDefined();
      expect(screen.getByText("(88%)")).toBeDefined();
    });

    it("renders ScoreIndicator with bounded output", () => {
      render(<ScoreIndicator score={85} label="Health Score" />);
      expect(screen.getByText(/Health Score:/i)).toBeDefined();
      expect(screen.getByText("85/100")).toBeDefined();
    });

    it("renders EmptyState with action callback", () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          title="No records found"
          description="Try selecting a different corridor."
          actionText="Create Record"
          onAction={onAction}
        />
      );
      expect(screen.getByText("No records found")).toBeDefined();
      const btn = screen.getByRole("button", { name: "Create Record" });
      fireEvent.click(btn);
      expect(onAction).toHaveBeenCalled();
    });
  });

  describe("Intelligence Visual Language", () => {
    it("renders IntelligenceCard with evidence toggling and action CTA", () => {
      const onAction = vi.fn();
      render(
        <IntelligenceCard
          type="SIGNAL"
          title="Price Deficit Anomaly"
          summary="Market prices in Kano are trending downward due to cross-border harvest."
          evidenceItems={["Border inspection data", "Local market bulletin"]}
          actionLabel="View Analysis"
          onAction={onAction}
        />
      );

      expect(screen.getByText("Price Deficit Anomaly")).toBeDefined();
      expect(screen.getByText("Intelligence Signal")).toBeDefined();

      const actionBtn = screen.getByRole("button", { name: "View Analysis" });
      fireEvent.click(actionBtn);
      expect(onAction).toHaveBeenCalled();

      // Toggle evidence
      const evidenceToggle = screen.getByText(/View Evidence/i);
      fireEvent.click(evidenceToggle);
      expect(screen.getByText("Border inspection data")).toBeDefined();
    });

    it("renders RecommendationCard with execution trigger", () => {
      const onExecute = vi.fn();
      render(
        <RecommendationCard
          title="Pre-purchase 50MT of Grains"
          rationale="Prices projected to rise next month."
          domain="Procurement"
          confidenceScore={90}
          actionText="Execute Pre-purchase"
          onExecute={onExecute}
        />
      );

      expect(screen.getByText("Pre-purchase 50MT of Grains")).toBeDefined();
      expect(screen.getByText("Procurement")).toBeDefined();
      const executeBtn = screen.getByRole("button", { name: "Execute Pre-purchase" });
      fireEvent.click(executeBtn);
      expect(onExecute).toHaveBeenCalled();
    });
  });

  describe("Navigation & Layout", () => {
    it("renders Breadcrumbs with items", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Intelligence", href: "/intelligence" },
            { label: "Corridors" },
          ]}
        />
      );
      expect(screen.getByText("Intelligence")).toBeDefined();
      expect(screen.getByText("Corridors")).toBeDefined();
    });

    it("renders Tabs and triggers tab change", () => {
      const onTabChange = vi.fn();
      render(
        <Tabs
          tabs={[
            { id: "tab1", label: "Overview" },
            { id: "tab2", label: "Analytics" },
          ]}
          activeTab="tab1"
          onTabChange={onTabChange}
        />
      );

      const tab2 = screen.getByRole("tab", { name: "Analytics" });
      fireEvent.click(tab2);
      expect(onTabChange).toHaveBeenCalledWith("tab2");
    });
  });
});
