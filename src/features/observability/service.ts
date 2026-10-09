/**
 * AgroMarket Phase 3.18: Observability Service Facade
 * Orchestrates health probes, capability evaluations, queue metrics, and diagnostics.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  OperationalDashboardData,
  ReliabilityThresholds,
  HealthStatus,
} from "./types";
import { checkLiveness, checkReadiness, checkCapabilities } from "./health";
import { getQueueReliabilityMetrics, getNotificationReliabilityMetrics } from "./metrics";
import { evaluateReliabilityThresholds } from "./thresholds";

export class ObservabilityService {
  /**
   * Compiles the comprehensive, read-only operational dashboard data.
   */
  static async getOperationalDashboardData(options?: {
    customSupabase?: SupabaseClient | null;
    customThresholds?: Partial<ReliabilityThresholds>;
  }): Promise<OperationalDashboardData> {
    const timestamp = new Date().toISOString();
    const unmeasuredMetrics: string[] = [];

    // 1. Health and Capability Probes
    const liveness = checkLiveness();
    const readiness = await checkReadiness(options?.customSupabase);
    const capabilities = await checkCapabilities(options?.customSupabase);

    // 2. Metrics Aggregation
    const { metrics: queueMetrics, unmeasured: queueUnmeasured } =
      await getQueueReliabilityMetrics(options?.customSupabase);
    unmeasuredMetrics.push(...queueUnmeasured);

    const { metrics: notificationMetrics, unmeasured: notificationUnmeasured } =
      await getNotificationReliabilityMetrics(options?.customSupabase);
    unmeasuredMetrics.push(...notificationUnmeasured);

    // 3. Threshold Evaluation
    const thresholdEvaluation = evaluateReliabilityThresholds(
      queueMetrics,
      notificationMetrics,
      options?.customThresholds
    );

    // 4. Synthesize Overall Service Status
    let overallStatus: HealthStatus = "HEALTHY";

    if (readiness.status === "UNAVAILABLE") {
      overallStatus = "UNAVAILABLE";
    } else if (readiness.status === "DEGRADED" || thresholdEvaluation.overallStatus === "DEGRADED") {
      overallStatus = "DEGRADED";
    }

    return {
      timestamp,
      overallStatus,
      liveness,
      readiness,
      capabilities,
      queueMetrics,
      notificationMetrics,
      thresholdEvaluation,
      unmeasuredMetrics,
    };
  }
}
