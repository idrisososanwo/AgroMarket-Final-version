/**
 * AgroMarket Phase 3.18: Standardized Operational Logging & Error Classification
 *
 * SAFETY INVARIANTS:
 * - Sanitizes all error messages to strip API keys, secrets, JWTs, and PII.
 * - Enforces zero-tolerance anti-pork invariant on log summaries and metadata.
 * - safeExecuteMonitored guarantees that monitoring failures NEVER crash business operations.
 */

import {
  OperationalLogEntry,
} from "./types";
import { sanitizeErrorMessage, assertNoProhibitedProduceBackgroundJob } from "@/features/background-jobs/validation";

/**
 * Standardizes operational logging with trace IDs and safe sanitization.
 */
export function logOperationalEvent(entry: Omit<OperationalLogEntry, "traceId" | "timestamp"> & { traceId?: string }): OperationalLogEntry {
  const traceId = entry.traceId || crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Strip credentials, JWTs, API keys, and sensitive tokens
  const sanitizedSummary = sanitizeErrorMessage(entry.safeSummary);

  // Anti-Pork check on log summaries
  try {
    assertNoProhibitedProduceBackgroundJob(sanitizedSummary, "Operational Log Summary");
  } catch (err: unknown) {
    const violationMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ANTI_PORK_LOG_REJECTION] Suppressed log entry containing prohibited terms: ${violationMsg}`);
    return {
      traceId,
      category: "INVARIANT_VIOLATION",
      safeSummary: "[ANTI_PORK_VIOLATION] Log summary rejected due to prohibited porcine content.",
      timestamp,
      retryable: false,
    };
  }

  const normalizedEntry: OperationalLogEntry = {
    ...entry,
    traceId,
    safeSummary: sanitizedSummary,
    timestamp,
  };

  // Structured operational output (safe for cloud logging)
  if (entry.category === "INVARIANT_VIOLATION" || entry.category === "DEPENDENCY_UNAVAILABLE") {
    console.warn(`[OPERATIONAL_OBSERVABILITY] [${entry.category}] trace=${traceId} ${sanitizedSummary}`, {
      workerId: entry.workerId,
      jobId: entry.jobId,
      durationMs: entry.durationMs,
    });
  } else {
    // Routine operational event
    console.log(`[OPERATIONAL_OBSERVABILITY] [${entry.category}] trace=${traceId} ${sanitizedSummary}`);
  }

  return normalizedEntry;
}

/**
 * Failsafe execution wrapper:
 * Ensures any observation, metric collection, or logging failure NEVER disrupts the underlying business flow.
 */
export async function safeExecuteMonitored<T>(
  operationName: string,
  fn: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[OBSERVABILITY_SUPPRESSED_ERROR] Failed during monitored operation "${operationName}": ${sanitizeErrorMessage(errorMsg)}`);
    return fallbackValue;
  }
}
