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
  usePathname: () => "/ecosystem",
}));

import { EcosystemHeader } from "@/features/ecosystem/components/ecosystem-header";
import { ValueChainVisualizer } from "@/features/ecosystem/components/value-chain-visualizer";
import { ActorDirectory } from "@/features/ecosystem/components/actor-directory";
import { ProductionView } from "@/features/ecosystem/components/production-view";
import { AggregationView } from "@/features/ecosystem/components/aggregation-view";
import { ProcessingView } from "@/features/ecosystem/components/processing-view";
import { B2BDemandView } from "@/features/ecosystem/components/b2b-demand-view";
import { EcosystemView } from "@/features/ecosystem/components/ecosystem-view";
import { getCanonicalValueChainTemplates } from "@/features/ecosystem/queries";
import {
  EcosystemActor,
  ProductionUnit,
  ProductionOutput,
  AggregationPool,
  ProcessingFacility,
  ProcessingEvent,
  B2BDemand,
} from "@/features/ecosystem/types";

describe("Phase 2.0 Ecosystem UI Component Tests", () => {
  const sampleActors: EcosystemActor[] = [
    {
      id: "actor-1",
      userId: "u-1",
      actorType: "PROCESSOR",
      displayName: "Ogun Cold Storage & Dressing Facility",
      description: "Certified abattoir and blast-freezing plant.",
      capabilities: ["ABATTOIR", "COLD_CHAIN", "BLAST_FREEZING"],
      state: "Ogun",
      lga: "Sagamu",
      verificationStatus: "VERIFIED",
      isActive: true,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    },
    {
      id: "actor-2",
      userId: "u-2",
      actorType: "AGGREGATOR",
      displayName: "Ibadan Maize Aggregation Hub",
      description: "Smallholder collection and grading center.",
      capabilities: ["GRAIN_TESTING", "BULK_BAGGING"],
      state: "Oyo",
      lga: "Ibadan South-West",
      verificationStatus: "UNVERIFIED",
      isActive: true,
      createdAt: "2026-10-02T00:00:00Z",
      updatedAt: "2026-10-02T00:00:00Z",
    },
  ];

  const sampleUnits: ProductionUnit[] = [
    {
      id: "unit-1",
      ownerId: "u-3",
      name: "Epe Aquaculture Farm",
      unitType: "FISH_FARM",
      state: "Lagos",
      lga: "Epe",
      generalArea: "Epe Lagoon Basin",
      commodities: ["African Catfish", "Tilapia"],
      capacityValue: 10000,
      capacityUnit: "FISH_PER_CYCLE",
      status: "ACTIVE",
      verificationStatus: "VERIFIED",
      isPublic: true,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    },
  ];

  const sampleOutputs: ProductionOutput[] = [
    {
      id: "out-1",
      producerId: "u-3",
      commodityName: "African Catfish (Live Table-Size)",
      outputType: "LIVE_ANIMALS",
      batchNumber: "CATFISH-BATCH-01",
      quantity: 1500,
      unit: "kg",
      harvestDate: "2026-10-05",
      qualityGrade: "GRADE_A",
      status: "AVAILABLE",
      state: "Lagos",
      lga: "Epe",
      createdAt: "2026-10-05T00:00:00Z",
      updatedAt: "2026-10-05T00:00:00Z",
    },
  ];

  const samplePools: AggregationPool[] = [
    {
      id: "pool-1",
      aggregatorId: "u-2",
      title: "Oyo Maize Bulk Pool",
      commodity: "White Maize",
      targetQuantity: 100,
      currentQuantity: 45,
      unit: "Metric Tons",
      state: "Oyo",
      lga: "Iseyin",
      collectionCenterName: "Iseyin Depot",
      expectedAvailabilityDate: "2026-11-20",
      status: "AGGREGATING",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    },
  ];

  const sampleFacilities: ProcessingFacility[] = [
    {
      id: "fac-1",
      operatorId: "u-1",
      name: "Sagamu Meat & Poultry Dressing Facility",
      facilityType: "POULTRY_PROCESSOR",
      servicesOffered: ["SLAUGHTERING", "DRESSING", "BLAST_FREEZING"],
      processingCapacityValue: 3000,
      processingCapacityUnit: "BIRDS_PER_DAY",
      supportedCommodities: ["Broiler Chicken"],
      state: "Ogun",
      lga: "Sagamu",
      generalLocation: "Sagamu Industrial Zone",
      verificationStatus: "VERIFIED",
      isActive: true,
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    },
  ];

  const sampleEvents: ProcessingEvent[] = [
    {
      id: "ev-1",
      processorId: "u-1",
      facilityId: "fac-1",
      processType: "SLAUGHTER_AND_DRESS",
      inputDescription: "Live broiler batch",
      inputQuantity: 1000,
      inputUnit: "kg",
      outputDescription: "Dressed poultry packs",
      outputQuantity: 780,
      outputUnit: "kg",
      yieldPercentage: 78,
      batchReference: "B-2026-78",
      startedAt: "2026-10-04T10:00:00Z",
      completedAt: "2026-10-04T12:00:00Z",
      status: "COMPLETED",
      createdAt: "2026-10-04T12:00:00Z",
      updatedAt: "2026-10-04T12:00:00Z",
    },
  ];

  const sampleDemands: B2BDemand[] = [
    {
      id: "dem-1",
      buyerId: "buyer-1",
      title: "Victoria Island Restaurant Weekly Chicken",
      commodityOrProduct: "Broiler Chicken",
      quantity: 500,
      unit: "kg",
      specifications: { packaging: "10kg cartons" },
      targetPricePerUnit: 3500,
      state: "Lagos",
      lga: "Eti-Osa",
      desiredDeliveryDate: "2026-10-28",
      frequency: "WEEKLY",
      status: "ACTIVE",
      createdAt: "2026-10-04T00:00:00Z",
      updatedAt: "2026-10-04T00:00:00Z",
    },
  ];

  it("1. renders EcosystemHeader with core value-chain concepts and principles", () => {
    render(<EcosystemHeader />);
    expect(screen.getByText(/Agricultural Ecosystem & Coordination Layer/i)).toBeDefined();
    expect(screen.getByText(/Asset-Light/i)).toBeDefined();
    expect(screen.getByText(/Strict Anti-Pork/i)).toBeDefined();
    expect(screen.getByText(/Multi-Capability/i)).toBeDefined();
    expect(screen.getByText(/NGN Primary/i)).toBeDefined();
  });

  it("2. renders ValueChainVisualizer and allows switching between commodities", () => {
    const templates = getCanonicalValueChainTemplates();
    render(<ValueChainVisualizer initialTemplates={templates} />);

    expect(screen.getByText(/Interactive Value-Chain Stage Models/i)).toBeDefined();
    expect(screen.getByText(/Broiler Chicken/i)).toBeDefined();

    // Click on Beef Cattle tab
    const cattleTab = screen.getByRole("button", { name: "Beef Cattle" });
    fireEvent.click(cattleTab);

    expect(screen.getByText(/Cattle & Beef Value Chain:/i)).toBeDefined();
    expect(screen.getAllByText(/Feedlot & Pastoral Rearing/i).length).toBeGreaterThan(0);
  });

  it("3. renders ActorDirectory with actors and handles empty state", () => {
    const { rerender } = render(<ActorDirectory initialActors={sampleActors} />);
    expect(screen.getByText("Ogun Cold Storage & Dressing Facility")).toBeDefined();
    expect(screen.getByText("Ibadan Maize Aggregation Hub")).toBeDefined();

    // Rerender with empty list
    rerender(<ActorDirectory initialActors={[]} />);
    expect(screen.getByText(/No Ecosystem Actors Found/i)).toBeDefined();
  });

  it("4. renders ProductionView with outputs and units tabs", () => {
    render(
      <ProductionView
        productionUnits={sampleUnits}
        productionOutputs={sampleOutputs}
      />
    );

    // Default outputs tab
    expect(screen.getByText("African Catfish (Live Table-Size)")).toBeDefined();
    expect(screen.getByText("CATFISH-BATCH-01", { exact: false })).toBeDefined();

    // Switch to Units tab
    const unitsTabBtn = screen.getByRole("button", { name: /Production Units \(1\)/i });
    fireEvent.click(unitsTabBtn);

    expect(screen.getByText("Epe Aquaculture Farm")).toBeDefined();
  });

  it("5. renders AggregationView with progress percentage", () => {
    render(<AggregationView pools={samplePools} />);
    expect(screen.getByText("Oyo Maize Bulk Pool")).toBeDefined();
    expect(screen.getByText("45%")).toBeDefined();
    expect(screen.getByText(/Iseyin Depot/i)).toBeDefined();
  });

  it("6. renders ProcessingView and displays facilities and transformation events", () => {
    render(
      <ProcessingView
        facilities={sampleFacilities}
        events={sampleEvents}
      />
    );

    expect(screen.getByText("Sagamu Meat & Poultry Dressing Facility")).toBeDefined();

    // Switch to transformations
    const transTabBtn = screen.getByRole("button", { name: /Transformations \(1\)/i });
    fireEvent.click(transTabBtn);

    expect(screen.getByText(/SLAUGHTER AND DRESS/i)).toBeDefined();
    expect(screen.getByText(/Live broiler batch/i)).toBeDefined();
    expect(screen.getByText(/Dressed poultry packs/i)).toBeDefined();
  });

  it("7. renders B2BDemandView and evaluate coordinated match button", () => {
    render(<B2BDemandView demands={sampleDemands} />);
    expect(screen.getByText("Victoria Island Restaurant Weekly Chicken")).toBeDefined();
    expect(screen.getByText(/Evaluate Coordinated Match/i)).toBeDefined();
  });

  it("8. renders master EcosystemView component across all sections", () => {
    const templates = getCanonicalValueChainTemplates();
    render(
      <EcosystemView
        actors={sampleActors}
        productionUnits={sampleUnits}
        productionOutputs={sampleOutputs}
        aggregationPools={samplePools}
        processingFacilities={sampleFacilities}
        processingEvents={sampleEvents}
        b2bDemands={sampleDemands}
        templates={templates}
      />
    );

    expect(screen.getByText(/Coordinating Nigerian Agriculture From Soil & Seed/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Value Chains/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Actors & Capabilities/i })).toBeDefined();
  });
});
