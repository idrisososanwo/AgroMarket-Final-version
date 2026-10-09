/**
 * AgroMarket Phase 3.17: Job Handler Registry
 * Maps supported background job types to their execution handlers.
 */

import { JobType, JobHandler } from "../types";
import { DispatchApprovedAlertHandler } from "./dispatch-approved-alert";
import { RetryNotificationDeliveryHandler } from "./retry-notification-delivery";
import { ExpireStaleAlertsHandler } from "./expire-stale-alerts";
import { RefreshMarketIntelligenceHandler } from "./refresh-market-intelligence";
import { ReconcileSupplyFulfilmentHandler } from "./reconcile-supply-fulfilment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlerRegistry: Map<JobType, JobHandler<any, any>> = new Map();

// Register default handlers
handlerRegistry.set("DISPATCH_APPROVED_ALERT", new DispatchApprovedAlertHandler());
handlerRegistry.set("RETRY_NOTIFICATION_DELIVERY", new RetryNotificationDeliveryHandler());
handlerRegistry.set("EXPIRE_STALE_ALERTS", new ExpireStaleAlertsHandler());
handlerRegistry.set("REFRESH_MARKET_INTELLIGENCE", new RefreshMarketIntelligenceHandler());
handlerRegistry.set("RECONCILE_SUPPLY_FULFILMENT", new ReconcileSupplyFulfilmentHandler());

/**
 * Retrieves the registered execution handler for a job type.
 * Fails closed if job type has no registered handler.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getJobHandler(jobType: JobType): JobHandler<any, any> | undefined {
  return handlerRegistry.get(jobType);
}

/**
 * Allows overriding or registering custom handlers for testing or plugins.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerJobHandler(jobType: JobType, handler: JobHandler<any, any>): void {
  handlerRegistry.set(jobType, handler);
}

export function resetJobHandlerRegistry(): void {
  handlerRegistry.clear();
  handlerRegistry.set("DISPATCH_APPROVED_ALERT", new DispatchApprovedAlertHandler());
  handlerRegistry.set("RETRY_NOTIFICATION_DELIVERY", new RetryNotificationDeliveryHandler());
  handlerRegistry.set("EXPIRE_STALE_ALERTS", new ExpireStaleAlertsHandler());
  handlerRegistry.set("REFRESH_MARKET_INTELLIGENCE", new RefreshMarketIntelligenceHandler());
  handlerRegistry.set("RECONCILE_SUPPLY_FULFILMENT", new ReconcileSupplyFulfilmentHandler());
}
