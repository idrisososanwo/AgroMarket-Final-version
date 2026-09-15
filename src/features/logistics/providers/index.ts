import { LogisticsProviderAdapter } from "./types";
import { StandardFleetLogisticsAdapter } from "./standard-fleet";

export * from "./types";
export * from "./standard-fleet";

const defaultAdapter = new StandardFleetLogisticsAdapter();

/**
 * Returns a third-party logistics adapter instance.
 */
export function getLogisticsAdapter(_providerName?: string): LogisticsProviderAdapter {
  // Currently routes to the standard Nigerian multi-fleet adapter
  return defaultAdapter;
}
