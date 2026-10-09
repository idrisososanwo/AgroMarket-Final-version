/**
 * AgroMarket Phase 3.17: Background Processing Constants & Operational Limits
 */

import { JobStatus, JobType, BACKGROUND_JOB_TYPES } from "./types";

export const DEFAULT_BATCH_SIZE = 10;
export const MAX_BATCH_SIZE = 50;

export const DEFAULT_LEASE_DURATION_SECONDS = 300; // 5 minutes
export const MIN_LEASE_DURATION_SECONDS = 30;
export const MAX_LEASE_DURATION_SECONDS = 1800; // 30 minutes

export const DEFAULT_MAX_ATTEMPTS = 3;
export const ABSOLUTE_MAX_ATTEMPTS = 10;

export const DEFAULT_PRIORITY = 50;
export const JOB_PRIORITY_LEVELS = {
  LOW: 20,
  DEFAULT: 50,
  HIGH: 80,
  CRITICAL: 100,
} as const;

export const JOB_TIMEOUT_MS = 60000; // 60s maximum runtime per individual job execution

// Backoff configuration
export const DEFAULT_BASE_BACKOFF_SECONDS = 5;
export const MAX_BACKOFF_SECONDS = 3600; // 1 hour cap
export const DEFAULT_JITTER_FACTOR = 0.2; // 20% jitter to prevent thundering herd

// Lifecycle State Machine Allowed Transitions
export const VALID_JOB_STATUS_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  QUEUED: ["RUNNING", "FAILED"],
  RUNNING: ["SUCCEEDED", "QUEUED", "FAILED", "DEAD_LETTER"],
  SUCCEEDED: [],
  FAILED: ["QUEUED"], // Admin retry allows transitioning back to QUEUED
  DEAD_LETTER: ["QUEUED"], // Admin retry
};

export function isValidJobStatusTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_JOB_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export const ALLOWED_JOB_TYPES_SET = new Set<string>(BACKGROUND_JOB_TYPES);

export function isAllowedJobType(type: string): type is JobType {
  return ALLOWED_JOB_TYPES_SET.has(type);
}
