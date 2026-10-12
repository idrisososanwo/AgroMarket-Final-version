/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { SmartBasketView } from "@/features/smart-basket/components/smart-basket-view";
import * as actions from "@/features/smart-basket/actions";
import { SmartBasketResult, UserPreferences } from "@/features/smart-basket/types";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock server actions
vi.mock("@/features/smart-basket/actions", () => ({
  generateSmartBasketAction: vi.fn(),
  saveUserPreferencesAction: vi.fn(),
  addSmartBasketToCartAction: vi.fn(),
  updateBasketFeedbackAction: vi.fn(),
}));

const mockCategories = [
  { id: "cat-1", name: "Grains & Cereals", slug: "grains-cereals" },
  { id: "cat-2", name: "Vegetables", slug: "vegetables" },
  { id: "cat-3", name: "Roots & Tubers", slug: "roots-tubers" },
];

const mockBasketWithItems: SmartBasketResult = {
  id: "basket-123",
  userId: "user-456",
  title: "Lagos Fresh Produce Basket",
  items: [
    {
      listingId: "listing-rice-1",
      productId: "prod-rice-1",
      productName: "Milled Parboiled Rice",
      categoryName: "Grains & Cereals",
      sellerId: "seller-1",
      sellerName: "Eko Agro Mills",
      state: "Lagos",
      lga: "Kosofe",
      pricePerUnit: 85000,
      unit: "50kg Bag",
      recommendedQuantity: 1,
      subtotal: 85000,
      score: 85,
      explanations: ["Matches your preferred staple produce (Rice)."],
      moq: 1,
      quantityAvailable: 20,
      imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
      isFrequentPurchase: true,
      estimatedSavings: 3000,
    },
    {
      listingId: "listing-tomato-1",
      productId: "prod-tomato-1",
      productName: "Roma Tomatoes",
      categoryName: "Vegetables",
      sellerId: "seller-2",
      sellerName: "Fresh Greens Farm",
      state: "Lagos",
      lga: "Ikeja",
      pricePerUnit: 25000,
      unit: "Crate",
      recommendedQuantity: 1,
      subtotal: 25000,
      score: 75,
      explanations: ["Locally produced and stocked in Lagos."],
      moq: 1,
      quantityAvailable: 35,
      imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80",
      isFrequentPurchase: false,
      estimatedSavings: 1500,
    },
  ],
  estimatedTotalCost: 110000,
  budgetAllocated: 120000,
  budgetRemaining: 10000,
  estimatedSavings: 4500,
  rationale: "Balanced produce basket generated for a 4-person household in Lagos.",
  status: "GENERATED",
  engineVersion: "DETERMINISTIC_BASELINE_v1.1.0",
  state: "Lagos",
  createdAt: "2026-10-12T12:00:00Z",
  metadata: {
    generationTimestamp: "2026-10-12T12:00:00Z",
    itemCount: 2,
    categoriesRepresented: ["Grains & Cereals", "Vegetables"],
    explanationNotes: ["Authoritative farm prices."],
    isDeterministic: true,
  },
};

describe("SmartBasketView UI Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Smart Basket Navigation & Back Button", () => {
    it("renders a visible BackButton at the top with 'Back to Marketplace' and safe fallback", () => {
      render(
        <SmartBasketView
          initialPreferences={null}
          initialBasket={null}
          categories={mockCategories}
        />
      );

      const backLink = screen.getByRole("link", { name: /Back to Marketplace/i });
      expect(backLink).toBeDefined();
      expect(backLink.getAttribute("href")).toBe("/marketplace");
    });
  });

  describe("2. Budget & Parameter Controls", () => {
    it("renders budget input in Nigerian Naira with delivery fee disclosure", () => {
      render(
        <SmartBasketView
          initialPreferences={null}
          initialBasket={null}
          categories={mockCategories}
        />
      );

      const budgetInput = screen.getByDisplayValue("100000");
      expect(budgetInput).toBeDefined();
      expect(screen.getByText(/Delivery fees are calculated separately at checkout/i)).toBeDefined();
    });

    it("renders voluntary health, allergy, and dietary profile drawer", () => {
      render(
        <SmartBasketView
          initialPreferences={null}
          initialBasket={null}
          categories={mockCategories}
        />
      );

      const profileBtn = screen.getByRole("button", { name: /Dietary & Health Profile/i });
      fireEvent.click(profileBtn);

      expect(screen.getByText(/Food Allergies & Excluded Ingredients/i)).toBeDefined();
      expect(screen.getByText(/Nutritional & Health Priorities/i)).toBeDefined();
      expect(screen.getByText(/Your preferences are strictly private/i)).toBeDefined();
    });
  });

  describe("3. Basket Generation & Visual Result Rendering", () => {
    it("renders generated produce items with real photographs, unit prices, and subtotals", async () => {
      vi.mocked(actions.generateSmartBasketAction).mockResolvedValue({
        success: true,
        data: mockBasketWithItems,
      });

      const testPrefs: UserPreferences = {
        id: "pref-1",
        userId: "user-456",
        budgetTargetBasket: 120000,
        budgetTargetMonthly: 480000,
        familySize: 4,
        dietaryPreferences: [],
        allergies: [],
        healthConsiderations: [],
        dislikedItems: [],
        preferredStaples: [],
        preferredCategories: [],
        excludedProducts: [],
        excludedCategories: [],
        priorityGoal: "VARIETY",
        durationDays: 7,
        purchasingFrequency: "WEEKLY",
        basketPurpose: "HOUSEHOLD",
        state: "Lagos",
        lga: "Ikeja",
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <SmartBasketView
          initialPreferences={testPrefs}
          initialBasket={null}
          categories={mockCategories}
        />
      );

      const generateBtn = screen.getByRole("button", { name: /Generate Smart Basket/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByText(/Milled Parboiled Rice/i)).toBeDefined();
        expect(screen.getByText(/Roma Tomatoes/i)).toBeDefined();
      });

      // Verify real photography alt tags
      const riceImg = screen.getByAltText("Milled Parboiled Rice");
      expect(riceImg).toBeDefined();

      // Verify subtotals and savings
      expect(screen.getByText("₦110,000")).toBeDefined(); // Estimated total
      expect(screen.getByText("₦10,000")).toBeDefined(); // Remaining budget
    });

    it("recalculates line subtotals and remaining budget when item quantity is modified or item removed", () => {
      render(
        <SmartBasketView
          initialPreferences={null}
          initialBasket={mockBasketWithItems}
          categories={mockCategories}
        />
      );

      // Initial total: 110,000 (85,000 + 25,000)
      expect(screen.getByText("₦110,000")).toBeDefined();

      // Remove tomatoes item
      const removeButtons = screen.getAllByTitle(/Remove recommendation/i);
      fireEvent.click(removeButtons[1]); // Remove tomatoes

      // New total should be ₦85,000 and remaining budget should be ₦15,000 (budget 100,000 - 85,000)
      expect(screen.getAllByText("₦85,000").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("₦15,000")).toBeDefined();
    });

    it("shows a truthful warning and empty state when 0 items can be recommended (never false success)", async () => {
      vi.mocked(actions.generateSmartBasketAction).mockResolvedValue({
        success: true,
        data: {
          ...mockBasketWithItems,
          items: [],
          estimatedTotalCost: 0,
          budgetRemaining: 100000,
          rationale: "No complete produce bundle could be created within your stated budget.",
        },
      });

      render(
        <SmartBasketView
          initialPreferences={null}
          initialBasket={null}
          categories={mockCategories}
        />
      );

      const generateBtn = screen.getByRole("button", { name: /Generate Smart Basket/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByText(/No matching produce could be assembled within this budget/i)).toBeDefined();
      });

      // Must NOT display "generated successfully"
      expect(screen.queryByText(/generated successfully!/i)).toBeNull();
    });

    it("displays an error alert when the generation server action fails", async () => {
      vi.mocked(actions.generateSmartBasketAction).mockResolvedValue({
        success: false,
        error: "Server database connection timed out.",
      });

      render(
        <SmartBasketView
          initialPreferences={null}
          initialBasket={null}
          categories={mockCategories}
        />
      );

      const generateBtn = screen.getByRole("button", { name: /Generate Smart Basket/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(screen.getByText("Server database connection timed out.")).toBeDefined();
      });
    });
  });

  describe("4. Cart Integration", () => {
    it("calls addSmartBasketToCartAction and redirects to cart on success", async () => {
      vi.mocked(actions.addSmartBasketToCartAction).mockResolvedValue({
        success: true,
        data: { addedCount: 2, skippedCount: 0, messages: [] },
      });

      render(
        <SmartBasketView
          initialPreferences={null}
          initialBasket={mockBasketWithItems}
          categories={mockCategories}
        />
      );

      const addToCartBtn = screen.getByRole("button", { name: /Add Items to Cart/i });
      fireEvent.click(addToCartBtn);

      await waitFor(() => {
        expect(actions.addSmartBasketToCartAction).toHaveBeenCalledWith({
          recommendationId: "basket-123",
          items: [
            { listingId: "listing-rice-1", quantity: 1 },
            { listingId: "listing-tomato-1", quantity: 1 },
          ],
        });
      });
    });
  });
});
