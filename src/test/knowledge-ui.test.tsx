// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// Mock Auth
vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn(),
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  requireAnyRole: vi.fn(),
}));

// Mock Knowledge Queries
vi.mock("@/features/knowledge/queries", () => ({
  getPublishedArticles: vi.fn(),
  getArticleBySlug: vi.fn(),
  getRelatedArticles: vi.fn(),
  getAdminArticles: vi.fn(),
  getArticleByIdForAdmin: vi.fn(),
}));

// Import page components
import LearnPage from "@/app/learn/page";
import ArticleDetailPage from "@/app/learn/[slug]/page";
import AdminKnowledgePage from "@/app/admin/knowledge/page";
import NewKnowledgeArticlePage from "@/app/admin/knowledge/new/page";
import EditKnowledgeArticlePage from "@/app/admin/knowledge/[id]/page";

// Import types & mock targets
import { requireAnyRole } from "@/lib/auth/server";
import { UserRole } from "@/types/auth";
import {
  getPublishedArticles,
  getArticleBySlug,
  getRelatedArticles,
  getAdminArticles,
  getArticleByIdForAdmin,
} from "@/features/knowledge/queries";
import { KnowledgeArticle } from "@/features/knowledge/types";

describe("Phase 1.4: Knowledge UI Integration", () => {
  const mockArticle: KnowledgeArticle = {
    id: "art-1",
    contentType: "EXPERT_ADVICE",
    title: "Best Practices for Drip Irrigation in Tomato Farming",
    slug: "drip-irrigation-tomatoes-kano",
    excerpt: "A comprehensive guide to managing water efficiency in dry season tomato production.",
    body: "Drip irrigation delivers water directly to the root zone, significantly reducing fungal leaf diseases.\n\nWater twice daily during flowering.",
    coverImageUrl: null,
    authorId: "usr-admin-1",
    author: {
      id: "usr-admin-1",
      fullName: "Dr. Aminu Bello",
      avatarUrl: null,
      isVerified: true,
      state: "Kaduna",
      lga: "Zaria",
    },
    sourceName: "National Horticultural Research Institute (NIHORT)",
    sourceUrl: "https://nihort.gov.ng/publications/tomato-drip",
    sourceType: "RESEARCH_INSTITUTE",
    status: "PUBLISHED",
    state: "Kano",
    lga: "Kura",
    tags: ["tomato", "irrigation", "dry-season"],
    topic: "Irrigation & Water Conservation",
    isFeatured: true,
    eventStartDate: null,
    eventEndDate: null,
    venue: null,
    isOnline: false,
    organizer: null,
    registrationUrl: null,
    publishedAt: "2026-10-01T10:00:00.000Z",
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  };

  const mockAdminUser = {
    id: "usr-admin-1",
    email: "admin@agromarket.ng",
    phone: "08012345678",
    fullName: "Admin Officer",
    state: "Federal Capital Territory",
    lga: "Abuja Municipal",
    roles: ["ADMIN"] as UserRole[],
    isEmailVerified: true,
    isPhoneVerified: true,
    isVerified: true,
    isOnboarded: true,
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. Public Knowledge Hub (/learn)
  // ============================================================================
  describe("1. Public Knowledge Discovery (/learn)", () => {
    it("renders public knowledge page without requiring authentication", async () => {
      vi.mocked(getPublishedArticles).mockResolvedValue({
        articles: [mockArticle],
        totalCount: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
      });

      const page = await LearnPage({ searchParams: Promise.resolve({}) });
      render(page);

      expect(screen.getByText("Learn, Stay Informed & Grow")).toBeDefined();
      expect(screen.getByText("Best Practices for Drip Irrigation in Tomato Farming")).toBeDefined();
      expect(screen.getByText(/NIHORT/i)).toBeDefined();
      expect(screen.getAllByText("Expert Advice").length).toBeGreaterThanOrEqual(1);
    });

    it("displays an informative empty state when no articles match", async () => {
      vi.mocked(getPublishedArticles).mockResolvedValue({
        articles: [],
        totalCount: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
      });

      const page = await LearnPage({ searchParams: Promise.resolve({ search: "NonExistentCrop" }) });
      render(page);

      expect(screen.getByText("No Published Articles in this Category Yet")).toBeDefined();
    });
  });

  // ============================================================================
  // 2. Public Article Detail (/learn/[slug])
  // ============================================================================
  describe("2. Public Article Detail (/learn/[slug])", () => {
    it("renders article content, source attribution, and disclaimer banner", async () => {
      vi.mocked(getArticleBySlug).mockResolvedValue(mockArticle);
      vi.mocked(getRelatedArticles).mockResolvedValue([]);

      const page = await ArticleDetailPage({
        params: Promise.resolve({ slug: "drip-irrigation-tomatoes-kano" }),
      });
      render(page);

      expect(screen.getByText("Best Practices for Drip Irrigation in Tomato Farming")).toBeDefined();
      expect(screen.getByText("Educational & Practical Farming Guidance")).toBeDefined();
      expect(screen.getByText("National Horticultural Research Institute (NIHORT)")).toBeDefined();
      expect(screen.getByText("Agricultural Research Institute")).toBeDefined();
      expect(screen.getByText("Dr. Aminu Bello")).toBeDefined();
      expect(screen.getByText("Original Reference")).toBeDefined();
    });

    it("throws notFound if article does not exist", async () => {
      vi.mocked(getArticleBySlug).mockResolvedValue(null);

      await expect(
        ArticleDetailPage({
          params: Promise.resolve({ slug: "non-existent-article" }),
        })
      ).rejects.toThrow("NEXT_NOT_FOUND");
    });
  });

  // ============================================================================
  // 3. Admin Knowledge Console (/admin/knowledge)
  // ============================================================================
  describe("3. Admin Knowledge Console (/admin/knowledge)", () => {
    it("renders editorial console for authorized administrator", async () => {
      vi.mocked(requireAnyRole).mockResolvedValue(mockAdminUser);
      vi.mocked(getAdminArticles).mockResolvedValue({
        articles: [mockArticle],
        totalCount: 1,
        page: 1,
        limit: 25,
        totalPages: 1,
      });

      const page = await AdminKnowledgePage({ searchParams: Promise.resolve({}) });
      render(page);

      expect(screen.getByText("Knowledge & Information Management")).toBeDefined();
      expect(screen.getByText("Create New Article")).toBeDefined();
      expect(screen.getByText("Best Practices for Drip Irrigation in Tomato Farming")).toBeDefined();
    });
  });

  // ============================================================================
  // 4. Admin Knowledge Editor (/admin/knowledge/new & [id])
  // ============================================================================
  describe("4. Admin Knowledge Creation & Edit Forms", () => {
    it("renders creation form with category selectors", async () => {
      vi.mocked(requireAnyRole).mockResolvedValue(mockAdminUser);

      const page = await NewKnowledgeArticlePage();
      render(page);

      expect(screen.getByText("Create Knowledge Article")).toBeDefined();
      expect(screen.getByText("Content Category & Publication Target")).toBeDefined();
      expect(screen.getByText("Save Draft")).toBeDefined();
      expect(screen.getByText("Publish Now")).toBeDefined();
    });

    it("renders edit form preloaded with existing article details", async () => {
      vi.mocked(requireAnyRole).mockResolvedValue(mockAdminUser);
      vi.mocked(getArticleByIdForAdmin).mockResolvedValue(mockArticle);

      const page = await EditKnowledgeArticlePage({
        params: Promise.resolve({ id: "art-1" }),
      });
      render(page);

      expect(screen.getByText(`Edit: ${mockArticle.title}`)).toBeDefined();
      expect(screen.getByText("Update & Publish")).toBeDefined();
    });
  });
});
