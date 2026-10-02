import { z } from "zod";
import { containsProhibitedProduce } from "@/features/marketplace/validation";
import {
  KNOWLEDGE_CONTENT_TYPES,
  KNOWLEDGE_CONTENT_STATUSES,
  KNOWLEDGE_SOURCE_TYPES,
} from "./types";

/**
 * Generates an SEO and URL-safe slug from a title string.
 */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
}

/**
 * Validates text strings against the project-wide strict anti-pork policy.
 */
function refineAntiPork(_fieldLabel: string) {
  return (val: string | null | undefined) => {
    if (!val) return true;
    return !containsProhibitedProduce(val);
  };
}

const ANTI_PORK_ERROR_MESSAGE =
  "AgroMarket strictly disallows pig/pork content across all agricultural knowledge, guides, news, and food-health articles.";

export const knowledgeArticleBaseSchema = z.object({
  contentType: z.enum(KNOWLEDGE_CONTENT_TYPES, {
    errorMap: () => ({ message: "Please select a valid content category" }),
  }),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(255, "Title must not exceed 255 characters")
    .refine(refineAntiPork("title"), { message: ANTI_PORK_ERROR_MESSAGE }),
  slug: z
    .string()
    .max(255, "Slug must not exceed 255 characters")
    .optional()
    .transform((val) => {
      if (!val || val.trim().length === 0) return "";
      return slugifyTitle(val);
    }),
  excerpt: z
    .string()
    .max(600, "Excerpt must not exceed 600 characters")
    .optional()
    .or(z.literal(""))
    .refine(refineAntiPork("excerpt"), { message: ANTI_PORK_ERROR_MESSAGE }),
  body: z
    .string()
    .min(20, "Article content must be at least 20 characters")
    .max(50000, "Article content must not exceed 50,000 characters")
    .refine(refineAntiPork("body"), { message: ANTI_PORK_ERROR_MESSAGE }),
  coverImageUrl: z
    .string()
    .url("Cover image must be a valid URL")
    .optional()
    .or(z.literal("")),
  sourceName: z
    .string()
    .max(150, "Source name must not exceed 150 characters")
    .optional()
    .or(z.literal("")),
  sourceUrl: z
    .string()
    .url("Source link must be a valid URL")
    .optional()
    .or(z.literal("")),
  sourceType: z
    .enum(KNOWLEDGE_SOURCE_TYPES)
    .optional()
    .or(z.literal("")),
  state: z
    .string()
    .max(50, "State must not exceed 50 characters")
    .optional()
    .or(z.literal("")),
  lga: z
    .string()
    .max(50, "LGA must not exceed 50 characters")
    .optional()
    .or(z.literal("")),
  tags: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map((t) => t.trim()).filter(Boolean);
      return val
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    })
    .refine(
      (tags) => tags.every((tag) => !containsProhibitedProduce(tag)),
      { message: ANTI_PORK_ERROR_MESSAGE }
    ),
  topic: z
    .string()
    .max(100, "Topic must not exceed 100 characters")
    .optional()
    .or(z.literal(""))
    .refine(refineAntiPork("topic"), { message: ANTI_PORK_ERROR_MESSAGE }),
  isFeatured: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === "true"),
  // Events / Training
  eventStartDate: z
    .string()
    .optional()
    .or(z.literal("")),
  eventEndDate: z
    .string()
    .optional()
    .or(z.literal("")),
  venue: z
    .string()
    .max(300, "Venue must not exceed 300 characters")
    .optional()
    .or(z.literal("")),
  isOnline: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => val === true || val === "true"),
  organizer: z
    .string()
    .max(150, "Organizer name must not exceed 150 characters")
    .optional()
    .or(z.literal("")),
  registrationUrl: z
    .string()
    .url("Registration URL must be a valid web link")
    .optional()
    .or(z.literal("")),
  status: z
    .enum(KNOWLEDGE_CONTENT_STATUSES)
    .default("DRAFT"),
});

export const createKnowledgeArticleSchema = knowledgeArticleBaseSchema.refine(
  (data) => {
    if (data.eventStartDate && data.eventEndDate) {
      return new Date(data.eventEndDate) >= new Date(data.eventStartDate);
    }
    return true;
  },
  {
    message: "Event end date cannot be earlier than event start date",
    path: ["eventEndDate"],
  }
);

export type CreateKnowledgeArticleInput = z.infer<typeof createKnowledgeArticleSchema>;

export const updateKnowledgeArticleSchema = knowledgeArticleBaseSchema
  .partial()
  .extend({
    id: z.string().uuid("Invalid knowledge article identifier"),
  })
  .refine(
    (data) => {
      if (data.eventStartDate && data.eventEndDate) {
        return new Date(data.eventEndDate) >= new Date(data.eventStartDate);
      }
      return true;
    },
    {
      message: "Event end date cannot be earlier than event start date",
      path: ["eventEndDate"],
    }
  );

export type UpdateKnowledgeArticleInput = z.infer<typeof updateKnowledgeArticleSchema>;

export const changeArticleStatusSchema = z.object({
  id: z.string().uuid("Invalid knowledge article identifier"),
  status: z.enum(KNOWLEDGE_CONTENT_STATUSES),
});

export type ChangeArticleStatusInput = z.infer<typeof changeArticleStatusSchema>;

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
