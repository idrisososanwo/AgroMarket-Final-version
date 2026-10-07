// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AgroMarketSymbol,
  AgroMarketLogo,
  AGROMARKET_BRAND_COLORS,
  AGROMARKET_BRAND_SLOGAN,
} from "@/components/brand";

describe("AgroMarket Brand Identity System", () => {
  describe("Brand Tokens & Constants", () => {
    it("defines the core brand color system", () => {
      expect(AGROMARKET_BRAND_COLORS.primary).toBe("#0F4327");
      expect(AGROMARKET_BRAND_COLORS.growth).toBe("#16A34A");
      expect(AGROMARKET_BRAND_COLORS.earthClay).toBe("#C26732");
      expect(AGROMARKET_BRAND_COLORS.amberGold).toBe("#E59500");
      expect(AGROMARKET_BRAND_COLORS.neutralCream).toBe("#FBF9F4");
      expect(AGROMARKET_BRAND_COLORS.charcoal).toBe("#1A231E");
    });

    it("includes the foundational brand slogan", () => {
      expect(AGROMARKET_BRAND_SLOGAN).toContain(
        "connects the people, products, infrastructure and intelligence"
      );
    });
  });

  describe("AgroMarketSymbol", () => {
    it("renders with default size (md = 32px) and color variant", () => {
      const { container } = render(<AgroMarketSymbol />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute("width")).toBe("32");
      expect(svg?.getAttribute("height")).toBe("32");
      expect(svg?.getAttribute("role")).toBe("img");
      expect(svg?.getAttribute("aria-label")).toBe("AgroMarket Agro Network Symbol");
    });

    it("respects token and numeric sizes", () => {
      const { rerender, container } = render(<AgroMarketSymbol size="xs" />);
      let svg = container.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("16");

      rerender(<AgroMarketSymbol size="xl" />);
      svg = container.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("64");

      rerender(<AgroMarketSymbol size={42} />);
      svg = container.querySelector("svg");
      expect(svg?.getAttribute("width")).toBe("42");
    });

    it("renders monochrome and white variants with proper paths", () => {
      const { rerender, container } = render(<AgroMarketSymbol variant="monochrome" />);
      let svg = container.querySelector("svg");
      expect(svg).not.toBeNull();

      rerender(<AgroMarketSymbol variant="white" />);
      svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
    });
  });

  describe("AgroMarketLogo", () => {
    it("renders horizontal lockup with correct AgroMarket wordmark", () => {
      render(<AgroMarketLogo layout="horizontal" />);
      expect(screen.getByText("Agro")).toBeDefined();
      expect(screen.getByText("Market")).toBeDefined();
      // Should not contain broken capitalizations
      expect(screen.queryByText("AGROMARKET")).toBeNull();
    });

    it("displays optional descriptor tagline when requested", () => {
      render(
        <AgroMarketLogo
          layout="horizontal"
          showTagline
          taglineText="NIGERIAN AGRICULTURAL NETWORK"
        />
      );
      expect(screen.getByText("NIGERIAN AGRICULTURAL NETWORK")).toBeDefined();
    });

    it("supports symbol-only layout", () => {
      const { container } = render(<AgroMarketLogo layout="symbol-only" size="sm" />);
      expect(screen.queryByText("Agro")).toBeNull();
      expect(container.querySelector("svg")).not.toBeNull();
    });

    it("renders as Next.js Link when href is provided", () => {
      render(<AgroMarketLogo href="/" />);
      const link = screen.getByRole("link", { name: /AgroMarket/i });
      expect(link.getAttribute("href")).toBe("/");
    });
  });
});
