// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
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

// Mock auth server helper
vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

// Mock marketplace queries
vi.mock("@/features/marketplace/queries", () => ({
  getMarketplaceListings: vi.fn().mockResolvedValue({
    listings: [
      {
        id: "sample-maize",
        sellerId: "seller-1",
        productId: "prod-1",
        title: "Dry White Grain Maize (Bulk Harvest)",
        productName: "White Maize",
        categoryName: "Grains & Cereals",
        pricePerUnit: 450,
        currency: "NGN",
        unit: "kg",
        minimumOrderQuantity: 100,
        state: "Kaduna",
        lga: "Zaria",
        status: "ACTIVE",
        isVerified: true,
        quantityAvailable: 500,
        sellerName: "Ibrahim Farms",
        sellerVerified: true,
      },
    ],
    totalCount: 1,
    page: 1,
    limit: 8,
    totalPages: 1,
  }),
  getCategories: vi.fn().mockResolvedValue([
    { id: "cat-1", name: "Grains & Cereals", slug: "grains-cereals" },
    { id: "cat-2", name: "Tubers & Roots", slug: "roots-tubers" },
  ]),
}));

describe("AgroMarket StackFood-Inspired Consumer Marketplace Homepage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the global navigation header with AgroMarket branding", async () => {
    const Component = await HomePage();
    render(Component);
    const logoLinks = screen.getAllByRole("link", { name: /AgroMarket/i });
    expect(logoLinks.length).toBeGreaterThan(0);
  });

  it("renders the consumer shopping hero section with fresh produce headline", async () => {
    const Component = await HomePage();
    render(Component);
    expect(
      screen.getByRole("heading", {
        name: /Fresh Farm Produce, Straight from the Soil/i,
      })
    ).toBeDefined();

    const shopProduceBtn = screen.getByRole("link", {
      name: /Shop Fresh Produce/i,
    });
    expect(shopProduceBtn.getAttribute("href")).toBe("/marketplace");
  });

  it("renders consumer produce search bar and quick filter tags", async () => {
    const Component = await HomePage();
    render(Component);
    const searchInput = screen.getByPlaceholderText(
      /Search fresh produce \(e\.g\. Yam, White Maize, Cassava, Soya\)\.\.\./i
    );
    expect(searchInput).toBeDefined();

    expect(screen.getByText(/Popular:/i)).toBeDefined();
    expect(screen.getByText(/🌾 White Maize/i)).toBeDefined();
    expect(screen.getByText(/🥔 Benue Yam/i)).toBeDefined();
  });

  it("renders the category discovery grid for Nigerian agricultural sectors", async () => {
    const Component = await HomePage();
    render(Component);
    expect(screen.getByText("Explore Agricultural Categories")).toBeDefined();
    expect(screen.getAllByText("Grains & Cereals").length).toBeGreaterThan(0);
    expect(screen.getByText("Tubers & Roots")).toBeDefined();
    expect(screen.getByText("Vegetables & Herbs")).toBeDefined();
    expect(screen.getByText("Livestock & Poultry")).toBeDefined();
  });

  it("renders featured agricultural produce with live farm-gate cards", async () => {
    const Component = await HomePage();
    render(Component);
    expect(screen.getByText("Featured Agricultural Produce")).toBeDefined();
    expect(
      screen.getByText("Dry White Grain Maize (Bulk Harvest)")
    ).toBeDefined();
    expect(screen.getAllByText("Kaduna").length).toBeGreaterThan(0);
  });

  it("renders the transparent 4-step buying workflow with escrow guarantee", async () => {
    const Component = await HomePage();
    render(Component);
    expect(screen.getByText("How Buying Works on AgroMarket")).toBeDefined();
    expect(screen.getByText("Discover Produce")).toBeDefined();
    expect(screen.getByText("Farm-Gate Pricing")).toBeDefined();
    expect(screen.getByText("Escrow Protected")).toBeDefined();
    expect(screen.getByText("Tracked Dispatch")).toBeDefined();
  });

  it("renders secondary seller callout for farmers and machinery owners", async () => {
    const Component = await HomePage();
    render(Component);
    expect(
      screen.getByText("Are You a Producer or Machinery Owner?")
    ).toBeDefined();
    const joinFarmerLink = screen.getByRole("link", {
      name: /Join as Farmer/i,
    });
    expect(joinFarmerLink.getAttribute("href")).toBe("/auth/register?role=FARMER");
  });

  it("renders professional marketplace footer with category and support links", async () => {
    const Component = await HomePage();
    render(Component);
    const footerElements = screen.getAllByRole("contentinfo");
    expect(footerElements.length).toBeGreaterThan(0);
  });
});
