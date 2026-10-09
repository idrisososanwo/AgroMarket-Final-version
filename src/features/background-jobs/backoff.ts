/**
 * AgroMarket Phase 3.17: Bounded Exponential Backoff with Jitter
 * Prevents thundering-herd retry storms while capping maximum retry delays.
 */

import {
  DEFAULT_BASE_BACKOFF_SECONDS,
  MAX_BACKOFF_SECONDS,
  DEFAULT_JITTER_FACTOR,
} from "./constants";

export interface BackoffOptions {
  baseSeconds?: number;
  maxSeconds?: number;
  jitterFactor?: number;
  disableJitter?: boolean;
}

/**
 * Calculates the retry delay in seconds for a given attempt count (1-indexed).
 * Formula: min(maxSeconds, baseSeconds * 2^(attempt - 1)) ± jitter
 */
export function calculateBackoffDelaySeconds(
  attemptCount: number,
  options: BackoffOptions = {}
): number {
  const baseSeconds = options.baseSeconds ?? DEFAULT_BASE_BACKOFF_SECONDS;
  const maxSeconds = options.maxSeconds ?? MAX_BACKOFF_SECONDS;
  const jitterFactor = options.jitterFactor ?? DEFAULT_JITTER_FACTOR;

  const boundedAttempt = Math.max(1, attemptCount);
  const exponentialSeconds = baseSeconds * Math.pow(2, boundedAttempt - 1);
  const rawDelay = Math.min(maxSeconds, exponentialSeconds);

  if (options.disableJitter) {
    return Math.round(rawDelay);
  }

  // Symmetric jitter within [-jitterFactor, +jitterFactor]
  const jitterMultiplier = 1 + (Math.random() * 2 - 1) * jitterFactor;
  const jitteredDelay = rawDelay * jitterMultiplier;

  // Bound to at least 1 second and at most maxSeconds
  return Math.max(1, Math.min(maxSeconds, Math.round(jitteredDelay)));
}

/**
 * Calculates the next eligible Date for retrying a job.
 */
export function calculateNextRunTime(
  attemptCount: number,
  now: Date = new Date(),
  options: BackoffOptions = {}
): Date {
  const delaySeconds = calculateBackoffDelaySeconds(attemptCount, options);
  return new Date(now.getTime() + delaySeconds * 1000);
}
