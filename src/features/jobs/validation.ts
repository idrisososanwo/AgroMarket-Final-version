import { z } from "zod";
import {
  JOB_CATEGORIES,
  EMPLOYMENT_TYPES,
  COMPENSATION_TYPES,
  JOB_STATUSES,
  APPLICATION_STATUSES,
  JobCategory,
  EmploymentType,
  CompensationType,
  JobStatus,
  ApplicationStatus,
} from "./types";
import { containsProhibitedProduce } from "@/features/marketplace/validation";

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Base schema for jobs domain.
 * Enforces strict text limits and server-side anti-pork produce checks.
 * NEVER accepts employer_id from client; employer_id is resolved exclusively from auth session.
 */
const jobBaseSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title must not exceed 150 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Job title contains prohibited terms. AgroMarket strictly disallows pig/pork related listings.",
    }),
  description: z
    .string()
    .min(10, "Job description must be at least 10 characters")
    .max(5000, "Job description must not exceed 5000 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Job description contains prohibited terms. AgroMarket strictly disallows pig/pork related listings.",
    }),
  category: z.enum(JOB_CATEGORIES as [JobCategory, ...JobCategory[]], {
    errorMap: () => ({ message: "Please select a valid agricultural job category" }),
  }),
  state: z
    .string()
    .min(2, "State is required")
    .max(50, "State must not exceed 50 characters"),
  lga: z
    .string()
    .min(2, "LGA is required")
    .max(50, "LGA must not exceed 50 characters"),
  locationDetails: z
    .string()
    .max(255, "Location details must not exceed 255 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  employmentType: z
    .enum(EMPLOYMENT_TYPES as [EmploymentType, ...EmploymentType[]], {
      errorMap: () => ({ message: "Please select a valid employment type" }),
    })
    .default("FULL_TIME"),
  compensationType: z
    .enum(COMPENSATION_TYPES as [CompensationType, ...CompensationType[]], {
      errorMap: () => ({ message: "Please select a valid compensation type" }),
    })
    .default("MONTHLY"),
  compensationAmount: z.coerce
    .number()
    .min(0, "Compensation amount cannot be negative")
    .max(100_000_000, "Compensation amount exceeds maximum allowable limit"),
  currency: z.string().default("NGN"),
  requirements: z
    .string()
    .max(3000, "Requirements must not exceed 3000 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  deadline: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() ? val.trim() : null))
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime());
      },
      { message: "Invalid deadline date format" }
    ),
});

/**
 * Job Creation Schema
 * Client cannot specify employer_id or status other than initial DRAFT/ACTIVE.
 */
export const createJobSchema = jobBaseSchema.extend({
  status: z
    .enum(["DRAFT", "ACTIVE"] as const, {
      errorMap: () => ({ message: "Initial job status must be either DRAFT or ACTIVE" }),
    })
    .default("ACTIVE"),
});

/**
 * Job Update Schema
 * All base fields optional. Requires valid jobId UUID.
 * Status cannot be updated through this schema; status must use transitionJobStatusSchema.
 */
export const updateJobSchema = jobBaseSchema.partial().extend({
  jobId: z.string().uuid("Invalid job ID format"),
});

/**
 * Job Status Transition Schema
 */
export const transitionJobStatusSchema = z.object({
  jobId: z.string().uuid("Invalid job ID format"),
  status: z.enum(JOB_STATUSES as [JobStatus, ...JobStatus[]], {
    errorMap: () => ({ message: "Invalid job status specified" }),
  }),
});

/**
 * Job Application Schema
 * Client provides cover note and resume URL.
 * NEVER accepts applicant_id from client; applicant_id is resolved exclusively from auth session.
 */
export const applyForJobSchema = z.object({
  jobId: z.string().uuid("Invalid job ID format"),
  coverNote: z
    .string()
    .max(2000, "Cover note must not exceed 2000 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  resumeUrl: z
    .string()
    .url("Resume URL must be a valid web address")
    .max(500, "Resume URL must not exceed 500 characters")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val && val.trim() ? val.trim() : null)),
});

/**
 * Application Status Transition Schema
 */
export const updateApplicationStatusSchema = z.object({
  applicationId: z.string().uuid("Invalid application ID format"),
  status: z.enum(APPLICATION_STATUSES as [ApplicationStatus, ...ApplicationStatus[]], {
    errorMap: () => ({ message: "Invalid application status specified" }),
  }),
});
