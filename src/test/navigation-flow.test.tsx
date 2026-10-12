// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BackButton, Breadcrumbs, PageHeader } from "@/components/ui";

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: mockBack,
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/marketplace/item-123",
  useSearchParams: () => new URLSearchParams(),
}));

describe("AgroMarket Navigation Flow System", () => {
  const originalLocation = window.location;
  const originalHistory = window.history;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
    Object.defineProperty(window, "history", {
      configurable: true,
      value: originalHistory,
    });
  });

  describe("BackButton Component", () => {
    it("renders as an accessible link pointing to the fallback destination", () => {
      render(
        <BackButton
          fallbackHref="/marketplace"
          fallbackLabel="Back to Marketplace"
        />
      );

      const link = screen.getByRole("link", { name: /Back to Marketplace/i });
      expect(link).toBeDefined();
      expect(link.getAttribute("href")).toBe("/marketplace");
    });

    it("uses default fallback href '/' and label when none are provided", () => {
      render(<BackButton />);

      const link = screen.getByRole("link", { name: /Back/i });
      expect(link.getAttribute("href")).toBe("/");
    });

    it("falls back gracefully when user directly opened page from fresh tab (no same-origin history)", () => {
      // Direct visit has blank referrer or external referrer
      Object.defineProperty(document, "referrer", {
        configurable: true,
        value: "https://google.com/search?q=agromarket",
      });
      Object.defineProperty(window, "history", {
        configurable: true,
        value: { length: 1, back: vi.fn() },
      });

      render(
        <BackButton
          fallbackHref="/farmer/listings"
          fallbackLabel="Back to My Produce"
        />
      );

      const link = screen.getByRole("link", { name: /Back to My Produce/i });
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });

      link.dispatchEvent(clickEvent);

      // Should NOT prevent default (allowing normal navigation to fallbackHref)
      expect(clickEvent.defaultPrevented).toBe(false);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it("safely calls router.back() when user navigated from within AgroMarket", () => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { origin: "https://agromarket.ng", href: "https://agromarket.ng/marketplace/123" } as unknown as Location,
      });
      Object.defineProperty(document, "referrer", {
        configurable: true,
        value: "https://agromarket.ng/marketplace?category=TUBERS",
      });
      Object.defineProperty(window, "history", {
        configurable: true,
        value: { length: 4 },
      });

      render(
        <BackButton
          fallbackHref="/marketplace"
          fallbackLabel="Back to Marketplace"
        />
      );

      const link = screen.getByRole("link", { name: /Back to Marketplace/i });
      fireEvent.click(link);

      // Should intercept and use in-app history to preserve filters/search
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it("applies customized variant styles (ghost, outline, subtle)", () => {
      const { rerender } = render(
        <BackButton fallbackHref="/cart" variant="ghost" />
      );
      let link = screen.getByRole("link");
      expect(link.className).toContain("hover:text-[#0F4327]");

      rerender(<BackButton fallbackHref="/cart" variant="outline" />);
      link = screen.getByRole("link");
      expect(link.className).toContain("border");
      expect(link.className).toContain("border-neutral-300");

      rerender(<BackButton fallbackHref="/cart" variant="subtle" />);
      link = screen.getByRole("link");
      expect(link.className).toContain("bg-neutral-100/80");
    });
  });

  describe("Breadcrumbs Component", () => {
    it("renders hierarchical trail with links for parents and text for active item", () => {
      render(
        <Breadcrumbs
          items={[
            { label: "Marketplace", href: "/marketplace" },
            { label: "Tubers & Roots", href: "/marketplace?category=TUBERS" },
            { label: "Cassava Tubers (Grade A)" },
          ]}
        />
      );

      const homeIconLink = screen.getByRole("link", { name: "Home" });
      const marketLink = screen.getByRole("link", { name: "Marketplace" });
      const categoryLink = screen.getByRole("link", { name: "Tubers & Roots" });

      expect(homeIconLink.getAttribute("href")).toBe("/");
      expect(marketLink.getAttribute("href")).toBe("/marketplace");
      expect(categoryLink.getAttribute("href")).toBe("/marketplace?category=TUBERS");

      const currentItem = screen.getByText("Cassava Tubers (Grade A)");
      expect(currentItem.tagName).toBe("SPAN");
      expect(currentItem.getAttribute("aria-current")).toBe("page");
    });

    it("returns null when empty items array is provided", () => {
      const { container } = render(<Breadcrumbs items={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("PageHeader Component", () => {
    it("renders back button, breadcrumbs, title, description, and action controls", () => {
      render(
        <PageHeader
          title="Produce Inventory"
          description="Manage active harvest listings and warehouse stocks"
          backHref="/farmer"
          backLabel="Back to Farmer Workspace"
          breadcrumbs={[
            { label: "Farmer Workspace", href: "/farmer" },
            { label: "Produce Inventory" },
          ]}
          actions={<button type="button">Add Produce</button>}
        />
      );

      expect(screen.getByRole("heading", { level: 1, name: "Produce Inventory" })).toBeDefined();
      expect(screen.getByText("Manage active harvest listings and warehouse stocks")).toBeDefined();
      expect(screen.getByRole("link", { name: /Back to Farmer Workspace/i })).toBeDefined();
      expect(screen.getByRole("button", { name: "Add Produce" })).toBeDefined();
    });
  });
});
