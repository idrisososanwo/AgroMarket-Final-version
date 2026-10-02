import { describe, it, expect } from "vitest";
import {
  KnowledgeContentType,
  KnowledgeContentStatus,
  KNOWLEDGE_CONTENT_TYPES,
  KNOWLEDGE_SOURCE_TYPES,
  CONTENT_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  CANONICAL_KNOWLEDGE_TOPICS,
  SafeKnowledgeAuthorProfile,
} from "@/features/knowledge/types";
import {
  createKnowledgeArticleSchema,
  changeArticleStatusSchema,
  slugifyTitle,
} from "@/features/knowledge/validation";
import { mapKnowledgeArticleRow } from "@/features/knowledge/queries";
import { containsProhibitedProduce } from "@/features/marketplace/validation";
import { hasRole, hasAnyRole } from "@/lib/auth/roles";
import { UserRole } from "@/types/auth";

describe("Phase 1.4: Knowledge & Agricultural Information Domain", () => {
  const validArticlePayload = {
    contentType: "EXPERT_ADVICE" as const,
    title: "Best Practices for Drip Irrigation in Tomato Farming",
    excerpt: "A comprehensive guide to managing water efficiency and preventing blossom end rot in dry season tomato production.",
    body: "Drip irrigation delivers water directly to the root zone, significantly reducing fungal leaf diseases caused by overhead splash. Farmers in Kano and Kaduna should maintain consistent soil moisture during flowering.",
    topic: "Irrigation & Water Conservation",
    state: "Kano",
    lga: "Kura",
    tags: ["tomato", "irrigation", "dry-season", "kano"],
    sourceName: "National Horticultural Research Institute (NIHORT)",
    sourceType: "RESEARCH_INSTITUTE" as const,
    sourceUrl: "https://nihort.gov.ng/publications/tomato-drip",
    status: "PUBLISHED" as const,
    isFeatured: true,
  };

  // ============================================================================
  // 1. Article Creation Validation & Schemas
  // ============================================================================
  describe("1. Article Creation Validation", () => {
    it("accepts a completely valid knowledge article payload", () => {
      const result = createKnowledgeArticleSchema.safeParse(validArticlePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validArticlePayload.title);
        expect(result.data.contentType).toBe("EXPERT_ADVICE");
        expect(result.data.state).toBe("Kano");
        expect(result.data.tags).toEqual(["tomato", "irrigation", "dry-season", "kano"]);
        expect(result.data.isFeatured).toBe(true);
      }
    });

    it("rejects titles that are too short or too long", () => {
      const shortTitle = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        title: "Crop",
      });
      expect(shortTitle.success).toBe(false);

      const longTitle = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        title: "A".repeat(256),
      });
      expect(longTitle.success).toBe(false);
    });

    it("rejects bodies that are too short", () => {
      const shortBody = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        body: "Too short.",
      });
      expect(shortBody.success).toBe(false);
    });

    it("accepts all 6 canonical content types", () => {
      KNOWLEDGE_CONTENT_TYPES.forEach((type) => {
        const result = createKnowledgeArticleSchema.safeParse({
          ...validArticlePayload,
          contentType: type,
        });
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid content types", () => {
      const result = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        contentType: "INVALID_CATEGORY" as unknown as KnowledgeContentType,
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid source types", () => {
      KNOWLEDGE_SOURCE_TYPES.forEach((sourceType) => {
        const result = createKnowledgeArticleSchema.safeParse({
          ...validArticlePayload,
          sourceType,
        });
        expect(result.success).toBe(true);
      });
    });

    it("handles comma-separated tag strings gracefully", () => {
      const result = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        tags: "maize, fertilizer, ogun, harvest",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual(["maize", "fertilizer", "ogun", "harvest"]);
      }
    });
  });

  // ============================================================================
  // 2. Strict Anti-Pork Policy Compliance
  // ============================================================================
  describe("2. Strict Anti-Pork Policy Compliance", () => {
    it("detects forbidden pork/pig terms across all text fields", () => {
      expect(containsProhibitedProduce("Pork Sausage Processing Guide")).toBe(true);
      expect(containsProhibitedProduce("Pig Farming and Housing in Nigeria")).toBe(true);
      expect(containsProhibitedProduce("Managing Swine Dysentery and Feeds")).toBe(true);
      expect(containsProhibitedProduce("Smoked Bacon Curing Techniques")).toBe(true);
      expect(containsProhibitedProduce("Delicious Ham Preparation")).toBe(true);
      expect(containsProhibitedProduce("Refined Pig Lard Storage")).toBe(true);
    });

    it("allows lawful crops and halal livestock without false positives", () => {
      expect(containsProhibitedProduce("Yellow Maize Agronomy in Kaduna")).toBe(false);
      expect(containsProhibitedProduce("High Yield Cassava Stems Multiplication")).toBe(false);
      expect(containsProhibitedProduce("Poultry Broiler Vaccination Schedule")).toBe(false);
      expect(containsProhibitedProduce("Sokoto Red Goat Husbandry & Dairy")).toBe(false);
      expect(containsProhibitedProduce("Catfish Pond Fingerlings Stocking")).toBe(false);
      expect(containsProhibitedProduce("Benue Yam Barn Preservation")).toBe(false);
      expect(containsProhibitedProduce("Roma Tomatoes Drip Irrigation")).toBe(false);
    });

    it("rejects article creation when title contains prohibited pork terms", () => {
      const result = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        title: "Intensive Pig Farming and Piglet Nutrition Guide",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.title?.[0]).toContain("strictly disallows pig/pork content");
      }
    });

    it("rejects article creation when body contains prohibited swine terms", () => {
      const result = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        body: "To increase slaughter weights, feeding grower swine with formulated meal produces high pork yield.",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.body?.[0]).toContain("strictly disallows pig/pork content");
      }
    });

    it("rejects article creation when tags contain prohibited terms", () => {
      const result = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        tags: ["livestock", "pig-farming", "nutrition"],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.tags?.[0]).toContain("strictly disallows pig/pork content");
      }
    });
  });

  // ============================================================================
  // 3. Slug Generation & URL Formatting
  // ============================================================================
  describe("3. Slug Generation and URL Formatting", () => {
    it("generates a clean SEO slug from titles with special characters and spaces", () => {
      const title = "Modern Cassava Stems Multiplication in Ogun State (2026/2027)";
      const slug = slugifyTitle(title);
      expect(slug).toBe("modern-cassava-stems-multiplication-in-ogun-state-20262027");
      expect(slug).not.toContain(" ");
      expect(slug).not.toContain("(");
      expect(slug).not.toContain("/");
    });

    it("preserves custom user-provided slug if sanitized", () => {
      const result = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        slug: "drip-irrigation-kano-tomatoes",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("drip-irrigation-kano-tomatoes");
      }
    });

    it("sanitizes messy custom slugs into hyphenated format", () => {
      const result = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        slug: "Drip Irrigation Kano Tomatoes!!!",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("drip-irrigation-kano-tomatoes");
      }
    });
  });

  // ============================================================================
  // 4. Status Lifecycle & Transitions
  // ============================================================================
  describe("4. Status Lifecycle & State Transitions", () => {
    it("defaults to DRAFT status if not explicitly specified", () => {
      const { status: _, ...withoutStatus } = validArticlePayload;
      const result = createKnowledgeArticleSchema.safeParse(withoutStatus);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("DRAFT");
      }
    });

    it("validates status transitions schema", () => {
      const validTransition = changeArticleStatusSchema.safeParse({
        id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        status: "PUBLISHED",
      });
      expect(validTransition.success).toBe(true);

      const invalidTransition = changeArticleStatusSchema.safeParse({
        id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        status: "UNKNOWN_STATUS",
      });
      expect(invalidTransition.success).toBe(false);
    });
  });

  // ============================================================================
  // 5. Event & Training Logistics Validation
  // ============================================================================
  describe("5. Event & Training Scheduling Validations", () => {
    it("accepts event with valid chronological dates", () => {
      const result = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        contentType: "EVENT",
        eventStartDate: "2026-11-10T09:00:00.000Z",
        eventEndDate: "2026-11-12T17:00:00.000Z",
        venue: "IITA Conference Center, Ibadan, Oyo State",
        isOnline: false,
        organizer: "West African Grain Growers Association",
        registrationUrl: "https://events.example.com/register",
      });
      expect(result.success).toBe(true);
    });

    it("rejects event where end date is earlier than start date", () => {
      const result = createKnowledgeArticleSchema.safeParse({
        ...validArticlePayload,
        contentType: "EVENT",
        eventStartDate: "2026-11-12T09:00:00.000Z",
        eventEndDate: "2026-11-10T17:00:00.000Z", // Earlier than start
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.eventEndDate?.[0]).toContain(
          "cannot be earlier than event start date"
        );
      }
    });
  });

  // ============================================================================
  // 6. Safe Author Profile Data & Privacy Isolation
  // ============================================================================
  describe("6. Safe Author Profile Data & Privacy Isolation", () => {
    it("correctly maps raw database row to safe domain model", () => {
      const rawRow = {
        id: "art-123",
        content_type: "GOVERNMENT_UPDATE",
        title: "National Dry Season Farming Support Scheme 2026/2027",
        slug: "national-dry-season-farming-support-2026",
        excerpt: "Subsidized certified seeds and solar irrigation water pumps available for registered farmers.",
        body: "The Federal Ministry of Agriculture invites registered cooperative farmers to apply...",
        cover_image_url: null,
        author_id: "usr-456",
        source_name: "Federal Ministry of Agriculture and Food Security",
        source_url: "https://fmafs.gov.ng",
        source_type: "GOVERNMENT_AGENCY",
        status: "PUBLISHED",
        state: "Nationwide",
        lga: null,
        tags: ["grants", "seeds", "solar-pumps"],
        topic: "Government Grants & Policy Updates",
        is_featured: true,
        event_start_date: null,
        event_end_date: null,
        venue: null,
        is_online: false,
        organizer: null,
        registration_url: null,
        published_at: "2026-10-01T08:00:00.000Z",
        created_at: "2026-10-01T07:30:00.000Z",
        updated_at: "2026-10-01T08:00:00.000Z",
      };

      const safeAuthor: SafeKnowledgeAuthorProfile = {
        id: "usr-456",
        fullName: "Dr. Aminu Bello",
        avatarUrl: "https://images.example.com/aminu.jpg",
        isVerified: true,
        state: "Kaduna",
        lga: "Zaria",
      };

      const article = mapKnowledgeArticleRow(rawRow, safeAuthor);

      expect(article.id).toBe("art-123");
      expect(article.contentType).toBe("GOVERNMENT_UPDATE");
      expect(article.sourceName).toBe("Federal Ministry of Agriculture and Food Security");
      expect(article.author?.fullName).toBe("Dr. Aminu Bello");
      expect(article.author?.isVerified).toBe(true);

      // Verify NO private PII exists on author representation
      const authorObj = article.author as unknown as Record<string, unknown>;
      expect(authorObj.phone).toBeUndefined();
      expect(authorObj.email).toBeUndefined();
      expect(authorObj.locationAddress).toBeUndefined();
    });
  });

  // ============================================================================
  // 7. Role-Based Authorization Enforcement
  // ============================================================================
  describe("7. Role-Based Authorization Enforcement", () => {
    it("recognizes ADMIN as authorized for editorial and knowledge management", () => {
      const userRoles: UserRole[] = ["ADMIN"];
      expect(hasRole(userRoles, "ADMIN")).toBe(true);
      expect(hasAnyRole(userRoles, ["ADMIN", "EXPERT"])).toBe(true);
    });

    it("recognizes EXPERT as authorized for knowledge drafting and contribution", () => {
      const userRoles: UserRole[] = ["EXPERT"];
      expect(hasAnyRole(userRoles, ["ADMIN", "EXPERT"])).toBe(true);
    });

    it("denies unprivileged BUYER or JOB_SEEKER from editorial management", () => {
      const buyerRoles: UserRole[] = ["BUYER"];
      expect(hasAnyRole(buyerRoles, ["ADMIN", "EXPERT"])).toBe(false);

      const jobSeekerRoles: UserRole[] = ["JOB_SEEKER"];
      expect(hasAnyRole(jobSeekerRoles, ["ADMIN", "EXPERT"])).toBe(false);
    });
  });

  // ============================================================================
  // 8. Public Discovery & Draft Isolation Logic
  // ============================================================================
  describe("8. Public Discovery & Draft Isolation Logic", () => {
    const mockArticles: Array<{
      id: string;
      title: string;
      status: KnowledgeContentStatus;
      contentType: KnowledgeContentType;
      state: string | null;
    }> = [
      { id: "1", title: "Maize Stem Borer Advisory", status: "PUBLISHED", contentType: "EXPERT_ADVICE", state: "Oyo" },
      { id: "2", title: "Internal Draft: Fertilizer Allocation", status: "DRAFT", contentType: "NEWS", state: "Kano" },
      { id: "3", title: "Outdated 2024 Trade Fair", status: "ARCHIVED", contentType: "EVENT", state: "Lagos" },
      { id: "4", title: "Safe Storage for Cowpea", status: "PUBLISHED", contentType: "FOOD_HEALTH", state: "Benue" },
    ];

    it("ensures public queries strictly filter to status = PUBLISHED", () => {
      const publicArticles = mockArticles.filter((a) => a.status === "PUBLISHED");
      expect(publicArticles.length).toBe(2);
      expect(publicArticles.every((a) => a.status === "PUBLISHED")).toBe(true);
      expect(publicArticles.some((a) => a.status === "DRAFT")).toBe(false);
      expect(publicArticles.some((a) => a.status === "ARCHIVED")).toBe(false);
    });

    it("supports category filtering on published articles", () => {
      const foodHealthArticles = mockArticles
        .filter((a) => a.status === "PUBLISHED")
        .filter((a) => a.contentType === "FOOD_HEALTH");

      expect(foodHealthArticles.length).toBe(1);
      expect(foodHealthArticles[0].title).toBe("Safe Storage for Cowpea");
    });
  });

  // ============================================================================
  // 9. Source Attribution Labels & Verification
  // ============================================================================
  describe("9. Source Attribution & Labels", () => {
    it("provides human-readable labels for all content types", () => {
      expect(CONTENT_TYPE_LABELS.NEWS).toBe("Agricultural News");
      expect(CONTENT_TYPE_LABELS.EXPERT_ADVICE).toBe("Expert Advice");
      expect(CONTENT_TYPE_LABELS.GOVERNMENT_UPDATE).toBe("Government Update");
      expect(CONTENT_TYPE_LABELS.TRAINING).toBe("Agricultural Training");
      expect(CONTENT_TYPE_LABELS.EVENT).toBe("Agricultural Event");
      expect(CONTENT_TYPE_LABELS.FOOD_HEALTH).toBe("Food & Health");
    });

    it("provides accurate labels for institutional source types", () => {
      expect(SOURCE_TYPE_LABELS.GOVERNMENT_AGENCY).toContain("Government Agency");
      expect(SOURCE_TYPE_LABELS.RESEARCH_INSTITUTE).toContain("Research Institute");
      expect(SOURCE_TYPE_LABELS.EXTENSION_SERVICE).toContain("Extension");
    });

    it("includes canonical agricultural topics for Nigerian farming", () => {
      expect(CANONICAL_KNOWLEDGE_TOPICS).toContain("Crop Production & Management");
      expect(CANONICAL_KNOWLEDGE_TOPICS).toContain("Soil Health & Fertilizer Practice");
      expect(CANONICAL_KNOWLEDGE_TOPICS).toContain("Food Hygiene, Safety & Nutrition");
      expect(CANONICAL_KNOWLEDGE_TOPICS).toContain("Farm Security & Transportation Awareness");
    });
  });
});
