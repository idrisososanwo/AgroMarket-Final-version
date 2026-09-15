import { describe, it, expect } from "vitest";
import { isProhibitedProduct, PROHIBITED_KEYWORDS } from "./index";

describe("Products Domain Policy", () => {
  it("strictly detects and flags prohibited pig and pork products", () => {
    expect(isProhibitedProduct("Fresh Pork Ribs", "Meat")).toBe(true);
    expect(isProhibitedProduct("Smoked Bacon Rashers", "Processed Food")).toBe(true);
    expect(isProhibitedProduct("Pig Feed 50kg", "Livestock")).toBe(true);
    expect(isProhibitedProduct("Cooking Lard", "Oils")).toBe(true);
  });

  it("permits compliant agricultural produce", () => {
    expect(isProhibitedProduct("Dry White Maize 100kg", "Grains")).toBe(false);
    expect(isProhibitedProduct("Fresh Roma Tomatoes", "Vegetables")).toBe(false);
    expect(isProhibitedProduct("Live Boer Goat", "Livestock")).toBe(false);
    expect(isProhibitedProduct("Catfish Fingerlings", "Aquaculture")).toBe(false);
  });

  it("contains all critical prohibited keywords", () => {
    expect(PROHIBITED_KEYWORDS).toContain("pork");
    expect(PROHIBITED_KEYWORDS).toContain("pig");
    expect(PROHIBITED_KEYWORDS).toContain("bacon");
    expect(PROHIBITED_KEYWORDS).toContain("swine");
  });
});
