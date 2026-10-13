/**
 * AgroMarket V1: Cleanup Abandoned Orders Job Handler
 * Safely cancels stale uncompleted orders and restores reserved inventory.
 */

import {
  JobHandler,
  JobExecutionContext,
  JobExecutionResult,
} from "../types";
import { OrderCleanupService, CleanupResult } from "@/features/orders";

export interface CleanupAbandonedOrdersPayload {
  timeoutMinutes?: number;
  batchSize?: number;
}

export class CleanupAbandonedOrdersHandler
  implements JobHandler<CleanupAbandonedOrdersPayload, CleanupResult>
{
  readonly jobType = "CLEANUP_ABANDONED_ORDERS" as const;

  async execute(
    payload: CleanupAbandonedOrdersPayload,
    _context: JobExecutionContext
  ): Promise<JobExecutionResult<CleanupResult>> {
    try {
      const timeoutMinutes = payload.timeoutMinutes ?? 60;
      const batchSize = payload.batchSize ?? 50;

      const result = await OrderCleanupService.cleanupAbandonedOrders({
        timeoutMinutes,
        limit: batchSize,
      });

      return {
        success: true,
        result,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to execute abandoned order cleanup";
      return {
        success: false,
        errorCategory: "TRANSIENT",
        errorMessage: message,
        retryable: true,
      };
    }
  }
}
