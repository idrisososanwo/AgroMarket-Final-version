// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  resolveProductImage,
  resolveEquipmentImage,
  resolveServiceImage,
  CANONICAL_PRODUCE_PHOTOGRAPHY,
  CATEGORY_PHOTOGRAPHY,
  EQUIPMENT_PHOTOGRAPHY,
  SERVICE_PHOTOGRAPHY,
  GENERAL_AGRICULTURAL_FALLBACK,
} from "@/lib/constants/product-images";
import { ProductImage } from "@/components/ui/product-image";
import { ListingCard } from "@/features/marketplace/components/listing-card";
import { EditProfileForm } from "@/features/auth/components/edit-profile-form";
import { BackButton } from "@/components/ui/back-button";
import { MarketplaceListing } from "@/features/marketplace/types";

// Mock next/navigation
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
  usePathname: () => "/account",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock updateProfileAction
const mockUpdateProfileAction = vi.fn();
vi.mock("@/features/auth/actions", () => ({
  updateProfileAction: (...args: unknown[]) => mockUpdateProfileAction(...args),
}));

// Mock next/image to render standard img tag with passed props for testing
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
    _fill,
    priority,
    ...props
  }: {
    src: string;
    alt: string;
    onError?: () => void;
    _fill?: boolean;
    priority?: boolean;
    [key: string]: unknown;
  }) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        data-testid="next-image"
        data-priority={priority ? "true" : undefined}
        onError={onError}
        {...props}
      />
    );
  },
}));

describe("Real Product Photography & Resolution Engine", () => {
  describe("resolveProductImage Priority Hierarchy", () => {
    it("prioritizes valid seller-uploaded photograph over canonical and category fallbacks", () => {
      const uploaded = "https://custom-storage.supabase.co/harvest-photo.jpg";
      const result = resolveProductImage({
        uploadedUrl: uploaded,
        productSlug: "white-maize",
        productName: "White Maize",
        categorySlug: "grains-cereals",
      });

      expect(result.src).toBe(uploaded);
      expect(result.isFallback).toBe(false);
    });

    it("resolves canonical photograph when listing has no uploaded image", () => {
      const result = resolveProductImage({
        uploadedUrl: null,
        productSlug: "white-maize",
        productName: "White Maize",
        categorySlug: "grains-cereals",
      });

      expect(result.src).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["white-maize"].url);
      expect(result.isFallback).toBe(true);
      expect(result.src).toContain("images.unsplash.com");
    });

    it("resolves genuine photographs for core Nigerian commodities", () => {
      // 1. Maize
      const maize = resolveProductImage({ productName: "Dried White Maize 100kg" });
      expect(maize.src).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["white-maize"].url);

      // 2. Yam
      const yam = resolveProductImage({ productName: "Benue White Yam Tubers" });
      expect(yam.src).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["white-yam-tubers"].url);

      // 3. Tomatoes
      const tomatoes = resolveProductImage({ productName: "Fresh Roma Tomatoes Crate" });
      expect(tomatoes.src).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["roma-tomatoes"].url);

      // 4. Rice
      const rice = resolveProductImage({ productName: "Milled Parboiled Long Grain Rice" });
      expect(rice.src).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["milled-parboiled-rice"].url);

      // 5. Fish / Aquaculture
      const fish = resolveProductImage({ productName: "Live African Catfish Table Size" });
      expect(fish.src).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["fresh-live-african-catfish"].url);

      // 6. Peppers
      const pepper = resolveProductImage({ productName: "Fresh Ata Rodo Habanero" });
      expect(pepper.src).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["habanero-pepper-rodo"].url);

      // 7. Beans / Cowpeas
      const beans = resolveProductImage({ productName: "Nigerian Brown Cowpea Beans" });
      expect(beans.src).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["brown-beans-cowpea"].url);

      // 8. Livestock / Poultry
      const chicken = resolveProductImage({ productName: "Mature Broiler Chicken" });
      expect(chicken.src).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["live-broiler-chicken"].url);
    });

    it("falls back to category photograph when commodity name is unmapped", () => {
      const result = resolveProductImage({
        productName: "Unusual Regional Crop",
        categorySlug: "vegetables",
        categoryName: "Vegetables",
      });

      expect(result.src).toBe(CATEGORY_PHOTOGRAPHY["vegetables"].url);
      expect(result.isFallback).toBe(true);
    });

    it("falls back to clean agricultural fallback when all identifiers are unknown", () => {
      const result = resolveProductImage({
        uploadedUrl: "",
        productSlug: "",
        productName: "",
        categorySlug: "",
      });

      expect(result.src).toBe(GENERAL_AGRICULTURAL_FALLBACK.url);
      expect(result.isFallback).toBe(true);
    });
  });

  describe("Equipment & Services Photography", () => {
    it("resolves authentic tractor photograph for agricultural tractors", () => {
      const result = resolveEquipmentImage({
        category: "TRACTOR",
        name: "Massey Ferguson 375 Tractor",
      });
      expect(result.src).toBe(EQUIPMENT_PHOTOGRAPHY["TRACTOR"].url);
    });

    it("resolves combine harvester photograph for harvesting machinery", () => {
      const result = resolveEquipmentImage({
        category: "HARVESTER",
        name: "Combine Grain Harvester",
      });
      expect(result.src).toBe(EQUIPMENT_PHOTOGRAPHY["HARVESTER"].url);
    });

    it("resolves real agronomy and field service photography", () => {
      const agronomy = resolveServiceImage({
        category: "AGRONOMY_ADVISORY",
        title: "Crop Health Inspection & Advisory",
      });
      expect(agronomy.src).toBe(SERVICE_PHOTOGRAPHY["AGRONOMY_ADVISORY"].url);

      const soil = resolveServiceImage({
        category: "SOIL_TESTING",
        title: "Farm Soil pH & Mineral Analysis",
      });
      expect(soil.src).toBe(SERVICE_PHOTOGRAPHY["SOIL_TESTING"].url);
    });
  });

  describe("ProductImage Component", () => {
    it("renders real image with accessible alt text and fallback badge when representative", () => {
      render(
        <ProductImage
          productSlug="white-maize"
          productName="White Maize"
          categoryName="Grains & Cereals"
          showFallbackBadge={true}
        />
      );

      const img = screen.getByTestId("next-image");
      expect(img.getAttribute("src")).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["white-maize"].url);
      expect(img.getAttribute("alt")).toBe("White Maize");

      // Verify representative badge is rendered
      expect(screen.getByText("Representative photo")).toBeDefined();
    });

    it("does not render representative badge when image is uploaded by seller", () => {
      render(
        <ProductImage
          src="https://custom-storage.supabase.co/seller-actual-corn.jpg"
          productName="White Maize"
          showFallbackBadge={true}
        />
      );

      expect(screen.queryByText("Representative photo")).toBeNull();
    });

    it("handles image load errors gracefully by failing over to safe agricultural fallback", () => {
      render(
        <ProductImage
          src="https://broken-url-example.com/broken.jpg"
          productName="White Maize"
        />
      );

      const img = screen.getByTestId("next-image");
      fireEvent.error(img);

      // Should fail over to clean general agricultural photograph
      expect(img.getAttribute("src")).toBe(GENERAL_AGRICULTURAL_FALLBACK.url);
    });
  });

  describe("ListingCard Component Real Photography Integration", () => {
    const mockListing: MarketplaceListing = {
      id: "listing-101",
      sellerId: "seller-1",
      productId: "prod-1",
      farmId: null,
      title: "Fresh Farm White Yam Tubers",
      description: "Direct harvest from Benue State",
      pricePerUnit: 25000,
      currency: "NGN",
      unit: "100 Tubers",
      minimumOrderQuantity: 1,
      state: "Benue",
      lga: "Gboko",
      pickupAddress: "Gboko Farm Depot",
      status: "ACTIVE",
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      productName: "White Yam (Tubers)",
      productSlug: "white-yam-tubers",
      categoryId: "cat-roots",
      categoryName: "Roots & Tubers",
      quantityOnHand: 100,
      quantityReserved: 0,
      quantityAvailable: 100,
      sellerName: "Aondoaver Farms",
      sellerVerified: true,
    };

    it("renders real photograph at top of ListingCard instead of emoji or icon", () => {
      render(<ListingCard listing={mockListing} />);

      const img = screen.getByTestId("next-image");
      expect(img).toBeDefined();
      expect(img.getAttribute("src")).toBe(CANONICAL_PRODUCE_PHOTOGRAPHY["white-yam-tubers"].url);

      // Confirm listing details are preserved
      expect(screen.getByText("Fresh Farm White Yam Tubers")).toBeDefined();
      expect(screen.getByText("Roots & Tubers")).toBeDefined();
      expect(screen.getByText("Benue")).toBeDefined();
      expect(screen.getByText("Aondoaver Farms")).toBeDefined();
    });
  });
});

describe("Account Page Navigation & Profile Save Redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("BackButton Navigation", () => {
    it("renders BackButton pointing to fallback '/' with label 'Back to Marketplace'", () => {
      render(
        <BackButton
          fallbackHref="/"
          label="Back to Marketplace"
        />
      );

      const backLink = screen.getByRole("link", { name: /Back to Marketplace/i });
      expect(backLink).toBeDefined();
      expect(backLink.getAttribute("href")).toBe("/");
    });

    it("triggers router.back when accessed from internal same-origin page", () => {
      Object.defineProperty(document, "referrer", {
        configurable: true,
        value: window.location.origin + "/marketplace",
      });
      Object.defineProperty(window, "history", {
        configurable: true,
        value: { length: 3 },
      });

      render(
        <BackButton
          fallbackHref="/"
          label="Back to Marketplace"
        />
      );

      const backLink = screen.getByRole("link", { name: /Back to Marketplace/i });
      fireEvent.click(backLink);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe("EditProfileForm Submission & Redirect", () => {
    it("renders profile fields with initial user data", () => {
      render(
        <EditProfileForm
          initialFullName="Ibrahim Musa"
          initialPhone="08012345678"
          initialState="Kano"
          initialLga="Nassarawa"
          initialLocationAddress="Dawanau Market Road"
          initialBio="Commercial grains producer and off-taker."
        />
      );

      expect((screen.getByLabelText(/Full Name/i) as HTMLInputElement).value).toBe("Ibrahim Musa");
      expect((screen.getByLabelText(/Phone Number/i) as HTMLInputElement).value).toBe("08012345678");
      expect((screen.getByLabelText(/State/i) as HTMLSelectElement).value).toBe("Kano");
      expect((screen.getByLabelText(/Local Government Area/i) as HTMLInputElement).value).toBe("Nassarawa");
    });

    it("redirects to homepage '/' after successful backend update", async () => {
      mockUpdateProfileAction.mockResolvedValueOnce({
        success: true,
        message: "Profile updated successfully!",
      });

      const { container } = render(
        <EditProfileForm
          initialFullName="Ibrahim Musa"
          initialPhone="08012345678"
          initialState="Kano"
          initialLga="Nassarawa"
        />
      );

      const form = container.querySelector("form");
      expect(form).toBeDefined();
      if (form) fireEvent.submit(form);

      await waitFor(
        () => {
          expect(mockPush).toHaveBeenCalledWith("/");
        },
        { timeout: 2000 }
      );
    });

    it("does not redirect when backend returns validation error or failure", async () => {
      mockUpdateProfileAction.mockResolvedValueOnce({
        success: false,
        message: "Invalid phone number format.",
        errors: { phone: ["Please provide a valid Nigerian phone number."] },
      });

      const { container } = render(
        <EditProfileForm
          initialFullName="Ibrahim Musa"
          initialPhone="123"
          initialState="Kano"
          initialLga="Nassarawa"
        />
      );

      const form = container.querySelector("form");
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Invalid phone number format/i)).toBeDefined();
      });

      // Confirm router.push was NOT called
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
