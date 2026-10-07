// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

describe("AgroMarket Public Homepage", () => {
  it("renders the global header and brand logo", () => {
    render(<HomePage />);
    const logoLinks = screen.getAllByRole("link", { name: /AgroMarket/i });
    expect(logoLinks.length).toBeGreaterThan(0);
  });

  it("renders the hero section with primary headline and valid CTAs", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", {
        name: /Connecting the systems that move agriculture forward/i,
      })
    ).toBeDefined();

    const exploreAgroMarketBtns = screen.getAllByRole("link", {
      name: /Explore AgroMarket/i,
    });
    expect(exploreAgroMarketBtns.length).toBeGreaterThan(0);
    expect(exploreAgroMarketBtns[0].getAttribute("href")).toBe("/marketplace");

    const exploreEcosystemBtns = screen.getAllByRole("link", {
      name: /Explore Ecosystem/i,
    });
    expect(exploreEcosystemBtns.length).toBeGreaterThan(0);
    expect(exploreEcosystemBtns[0].getAttribute("href")).toBe("/ecosystem");
  });

  it("renders capability strip without fabricating traction numbers", () => {
    render(<HomePage />);
    expect(screen.getAllByText("Production").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aggregation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Processing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Logistics").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Markets").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Intelligence").length).toBeGreaterThan(0);
  });

  it("renders the agricultural problem and transition to Agro Network", () => {
    render(<HomePage />);
    expect(
      screen.getByText(/Agriculture is connected in the real world, but disconnected digitally/i)
    ).toBeDefined();
    expect(screen.getByText("The AgroMarket Coordinated Network")).toBeDefined();
  });

  it("renders the Agro Network diagram with key stakeholder nodes", () => {
    render(<HomePage />);
    expect(screen.getByText("A Unified Infrastructure Map for Nigerian Agriculture")).toBeDefined();
    expect(screen.getAllByText("Producers & Farmers").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Commercial Buyers").length).toBeGreaterThan(0);
  });

  it("renders the value chain pipeline and commodity sectors", () => {
    render(<HomePage />);
    expect(screen.getByText("Supporting the Entire Agricultural Journey")).toBeDefined();
    expect(screen.getByText("Crops & Grains")).toBeDefined();
    expect(screen.getByText("Roots & Tubers")).toBeDefined();
    expect(screen.getByText("Livestock & Cattle")).toBeDefined();
    expect(screen.getByText("Aquaculture & Fish")).toBeDefined();
  });

  it("renders platform capability links with verified routes", () => {
    render(<HomePage />);
    expect(screen.getAllByText(/Produce Marketplace|Marketplace/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Shared Purchases").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Equipment Rental").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Agricultural Services").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Jobs & Labor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Knowledge & Advisories").length).toBeGreaterThan(0);
  });

  it("renders the agricultural intelligence section with human-in-the-loop governance", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", {
        name: /Agricultural Intelligence for Complex Systems/i,
      })
    ).toBeDefined();
    expect(screen.getByText(/Human-In-The-Loop Governance/i)).toBeDefined();
    expect(screen.getAllByText("Market Intelligence").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Food Security & Resilience").length).toBeGreaterThan(0);
  });

  it("renders the food security section and Nigeria-first realities", () => {
    render(<HomePage />);
    expect(screen.getByText("Building Resilience into the Agricultural System")).toBeDefined();
    expect(screen.getByText("Built for the Realities of Nigerian Agriculture")).toBeDefined();
    expect(screen.getByText(/States & Local Government Corridors/i)).toBeDefined();
  });

  it("renders audience sections for farmers, businesses, and ecosystem partners", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "For Farmers" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "For Businesses & Processors" })).toBeDefined();
    expect(screen.getByText("An Asset-Light Agricultural Coordination Network")).toBeDefined();
  });

  it("renders final CTA and footer with design system spec link", () => {
    render(<HomePage />);
    const ctaHeadings = screen.getAllByRole("heading", { name: /Move Agriculture Forward/i });
    expect(ctaHeadings.length).toBeGreaterThan(0);
    const specLinks = screen.getAllByRole("link", { name: /Design System/i });
    expect(specLinks.length).toBeGreaterThan(0);
  });
});
