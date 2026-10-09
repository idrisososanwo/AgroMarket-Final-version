/**
 * AgroMarket Phase 3.18: Health Checks & Capability Probes
 *
 * Distinct concepts:
 * 1. Liveness: Process can respond; does NOT depend on external dependencies.
 * 2. Readiness: Essential dependencies available to serve user requests within bounded timeout.
 * 3. Capabilities: Detailed operational assessment of workers, schedulers, and delivery channels.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  LivenessCheckResult,
  ReadinessCheckResult,
  SystemCapabilityStatus,
  DependencyCheckDetail,
  ExternalProviderStatus,
} from "./types";
import { HEALTH_CHECK_TIMEOUT_MS } from "./constants";
import { getAdminClientSafely, getLastWorkerAttemptTimestamp, getLastWorkerSuccessTimestamp } from "@/features/background-jobs/data-layer";
import { DELIVERY_CHANNELS, DeliveryChannel } from "@/features/notifications/types";
import { getDeliveryProvider } from "@/features/notifications/delivery-providers";

const processStartTime = Date.now();

/**
 * Liveness Probe: Verifies only that the application process is running and responding.
 * Must never fail due to external services or database disconnects.
 */
export function checkLiveness(): LivenessCheckResult {
  const uptimeSeconds = Math.floor((Date.now() - processStartTime) / 1000);
  return {
    status: "HEALTHY",
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    service: "agromarket-core",
  };
}

/**
 * Helper to race an async operation against a bounded timeout.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Readiness Probe: Verifies essential dependencies required to serve requests.
 * Uses bounded timeouts (default 3000ms) and avoids leaking sensitive details.
 */
export async function checkReadiness(
  customSupabase?: SupabaseClient | null
): Promise<ReadinessCheckResult> {
  const startTime = Date.now();
  let dbDetail: DependencyCheckDetail = { status: "HEALTHY", message: "Database accessible" };
  let envDetail: DependencyCheckDetail = { status: "HEALTHY", message: "Essential configuration present" };

  // 1. Check Essential Environment Variables
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim().length > 0);
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().length > 0);

  if (!hasUrl || !hasKey) {
    envDetail = {
      status: "UNAVAILABLE",
      message: "Required Supabase connection environment variables are missing.",
    };
  }

  // 2. Check Database Connectivity with Bounded Timeout
  const dbClient = customSupabase !== undefined ? customSupabase : getAdminClientSafely();

  if (dbClient) {
    const dbStartTime = Date.now();
    try {
      await withTimeout(
        Promise.resolve(dbClient.from("background_jobs").select("id").limit(1)),
        HEALTH_CHECK_TIMEOUT_MS,
        "Database health probe timed out after 3000ms"
      );
      dbDetail = {
        status: "HEALTHY",
        latencyMs: Date.now() - dbStartTime,
        message: "PostgreSQL database responded successfully.",
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Database connection probe failed";
      dbDetail = {
        status: "UNAVAILABLE",
        latencyMs: Date.now() - dbStartTime,
        error: errorMsg.includes("timed out") ? "Connection timeout" : "Database probe failed",
      };
    }
  } else {
    // If no real Supabase is configured (e.g. test environment / offline mode)
    // Check if placeholder is active
    const isTestMode = process.env.NODE_ENV === "test" || !hasUrl;
    if (isTestMode) {
      dbDetail = {
        status: "HEALTHY",
        latencyMs: 1,
        message: "In-memory test store active (resilient test environment).",
      };
    } else {
      dbDetail = {
        status: "DEGRADED",
        message: "Administrative Supabase client could not be initialized.",
      };
    }
  }

  const isReady = dbDetail.status === "HEALTHY" && envDetail.status === "HEALTHY";

  return {
    status: isReady ? "HEALTHY" : "UNAVAILABLE",
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    checks: {
      database: dbDetail,
      environment: envDetail,
    },
  };
}

/**
 * Capability Assessment: Inspects operational readiness of workers, scheduler, providers, and AI.
 */
export async function checkCapabilities(
  customSupabase?: SupabaseClient | null
): Promise<SystemCapabilityStatus> {
  const readiness = await checkReadiness(customSupabase);

  const lastAttempted = getLastWorkerAttemptTimestamp();
  const lastSuccessful = getLastWorkerSuccessTimestamp();

  // Scheduler Evaluation
  const schedulerSecretPresent = Boolean(
    (process.env.CRON_SECRET && process.env.CRON_SECRET.trim().length > 0) ||
    (process.env.SCHEDULER_SECRET && process.env.SCHEDULER_SECRET.trim().length > 0)
  );

  let schedulerStatus: SystemCapabilityStatus["scheduler"];
  if (!schedulerSecretPresent) {
    schedulerStatus = {
      configured: false,
      observedActive: false,
      lastObservedRunAt: null,
      status: "UNAVAILABLE",
      notes: "Scheduler secret is not configured in environment. Automated crons are disabled.",
    };
  } else if (!lastAttempted) {
    schedulerStatus = {
      configured: true,
      observedActive: false,
      lastObservedRunAt: null,
      status: "DEGRADED",
      notes: "Scheduler secret is configured, but no worker invocations have been observed yet.",
    };
  } else {
    schedulerStatus = {
      configured: true,
      observedActive: true,
      lastObservedRunAt: lastAttempted,
      status: "HEALTHY",
      notes: `Scheduler active. Last cycle observed at ${lastAttempted}.`,
    };
  }

  // Delivery Providers Evaluation (Truthful external status)
  const externalProviders: Record<DeliveryChannel, ExternalProviderStatus> = {} as Record<DeliveryChannel, ExternalProviderStatus>;

  for (const channel of DELIVERY_CHANNELS) {
    const provider = getDeliveryProvider(channel);
    const available = provider.isAvailable();
    externalProviders[channel] = {
      channel,
      available,
      status: available ? "AVAILABLE" : "UNAVAILABLE",
      reason: available
        ? `${channel} provider ready.`
        : `${channel} external provider is not configured. No fake transmissions will occur.`,
    };
  }

  // AI Provider Evaluation (Safe check without live billing calls)
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const aiConfigured = Boolean(geminiApiKey && geminiApiKey.trim().length > 0);

  return {
    database: readiness.checks.database,
    backgroundWorker: {
      status: readiness.checks.database.status === "HEALTHY" ? "HEALTHY" : "DEGRADED",
      canClaim: readiness.checks.database.status === "HEALTHY",
      lastAttemptedRunAt: lastAttempted,
      lastSuccessfulRunAt: lastSuccessful,
    },
    scheduler: schedulerStatus,
    inAppNotifications: {
      status: "HEALTHY",
      available: true,
    },
    externalDeliveryProviders: externalProviders,
    aiProvider: {
      configured: aiConfigured,
      model: "gemini-2.0-flash",
      status: aiConfigured ? "AVAILABLE" : "UNCONFIGURED",
    },
  };
}
