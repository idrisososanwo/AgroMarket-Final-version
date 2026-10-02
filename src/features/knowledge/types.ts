/**
 * AgroMarket Knowledge Domain Types
 * Phase 1.4: Agricultural Information, News, Expert Advice, Government Updates,
 * Training, Events, and Food & Health.
 */

export const KNOWLEDGE_CONTENT_TYPES = [
  "NEWS",
  "EXPERT_ADVICE",
  "GOVERNMENT_UPDATE",
  "TRAINING",
  "EVENT",
  "FOOD_HEALTH",
] as const;

export type KnowledgeContentType = (typeof KNOWLEDGE_CONTENT_TYPES)[number];

export const KNOWLEDGE_CONTENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type KnowledgeContentStatus = (typeof KNOWLEDGE_CONTENT_STATUSES)[number];

export const KNOWLEDGE_SOURCE_TYPES = [
  "GOVERNMENT_AGENCY",
  "RESEARCH_INSTITUTE",
  "EXTENSION_SERVICE",
  "EXPERT_PANEL",
  "ACADEMIC",
  "INDUSTRY",
  "INTERNAL",
] as const;

export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

export interface SafeKnowledgeAuthorProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  state: string | null;
  lga: string | null;
}

export interface KnowledgeArticle {
  id: string;
  contentType: KnowledgeContentType;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  authorId: string | null;
  author?: SafeKnowledgeAuthorProfile | null;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceType: KnowledgeSourceType | null;
  status: KnowledgeContentStatus;
  state: string | null;
  lga: string | null;
  tags: string[];
  topic: string | null;
  isFeatured: boolean;
  // Events & Training fields
  eventStartDate: string | null;
  eventEndDate: string | null;
  venue: string | null;
  isOnline: boolean;
  organizer: string | null;
  registrationUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeFilterParams {
  search?: string;
  contentType?: KnowledgeContentType | "all";
  topic?: string | "all";
  state?: string | "all";
  status?: KnowledgeContentStatus | "all";
  isFeatured?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedKnowledgeResult {
  articles: KnowledgeArticle[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const CONTENT_TYPE_LABELS: Record<KnowledgeContentType, string> = {
  NEWS: "Agricultural News",
  EXPERT_ADVICE: "Expert Advice",
  GOVERNMENT_UPDATE: "Government Update",
  TRAINING: "Agricultural Training",
  EVENT: "Agricultural Event",
  FOOD_HEALTH: "Food & Health",
};

export const CONTENT_TYPE_DESCRIPTIONS: Record<KnowledgeContentType, string> = {
  NEWS: "Timely updates on Nigerian commodities, farming conditions, harvest reports, and agricultural trade.",
  EXPERT_ADVICE: "Practical agronomic guidance, soil preservation, livestock care, and post-harvest best practices from verified specialists.",
  GOVERNMENT_UPDATE: "Official agricultural notices, federal and state support schemes, extension alerts, and regulatory bulletins.",
  TRAINING: "Structured capacity building, farmer business schools, vocational workshops, and mechanization certification.",
  EVENT: "Field demonstrations, agricultural trade fairs, grower conferences, and cooperative networking gatherings.",
  FOOD_HEALTH: "Evidence-based food hygiene, safe produce preservation, balanced nutrition, and storage protocols for consumers and households.",
};

export const SOURCE_TYPE_LABELS: Record<KnowledgeSourceType, string> = {
  GOVERNMENT_AGENCY: "Government Agency / Ministry",
  RESEARCH_INSTITUTE: "Agricultural Research Institute",
  EXTENSION_SERVICE: "Extension & Advisory Service",
  EXPERT_PANEL: "Verified Expert Practitioner",
  ACADEMIC: "University / Academic Faculty",
  INDUSTRY: "Agribusiness Industry Partner",
  INTERNAL: "AgroMarket Editorial",
};

export const CANONICAL_KNOWLEDGE_TOPICS = [
  "Crop Production & Management",
  "Soil Health & Fertilizer Practice",
  "Integrated Pest & Weed Management",
  "Irrigation & Water Conservation",
  "Livestock, Poultry & Aquaculture",
  "Post-Harvest Storage & Processing",
  "Government Grants & Policy Updates",
  "Food Hygiene, Safety & Nutrition",
  "Agribusiness, Pricing & Market Access",
  "Farm Security & Transportation Awareness",
] as const;

export type CanonicalKnowledgeTopic = (typeof CANONICAL_KNOWLEDGE_TOPICS)[number];
