import {
  CreatePriceObservationInput,
  PriceSourceType,
} from "./types";
import { normalizePrice } from "./normalization";

/**
 * Normalized input representation ready for storage
 */
export interface NormalizedObservationPayload extends CreatePriceObservationInput {
  normalizedPrice: number | null;
  normalizedUnit: string | null;
  normalizationStatus: "EXACT" | "NORMALIZED" | "UNAVAILABLE";
  confidenceScore: number;
  dataQualityLabel: "OBSERVED" | "VERIFIED" | "ESTIMATED" | "SIMULATED";
}

/**
 * Core Market Data Provider abstraction.
 * Ready for future verified partner feeds, enumerators, and government agencies
 * without implementing simulated or fake external endpoints.
 */
export interface MarketDataProvider {
  readonly providerId: string;
  readonly providerName: string;
  readonly sourceType: PriceSourceType;

  /**
   * Fetches raw price observations from the source
   */
  fetchObservations(): Promise<CreatePriceObservationInput[]>;
}

/**
 * Platform Transaction Price Provider
 * Extracts anonymized price observations from completed and paid orders on AgroMarket.
 * Protects buyer & seller privacy by omitting personal details and only capturing
 * product, state, unit price, and timestamp.
 */
export class PlatformTransactionPriceProvider implements MarketDataProvider {
  readonly providerId = "platform-internal-tx";
  readonly providerName = "AgroMarket Transaction Engine";
  readonly sourceType: PriceSourceType = "PLATFORM_TRANSACTION";

  /**
   * Transforms confirmed order item snapshots into price observations
   */
  transformTransactionToObservation(orderItem: {
    productId: string;
    state: string;
    unitPrice: number;
    unit: string;
    completedAt: string;
  }): NormalizedObservationPayload {
    const normalization = normalizePrice(orderItem.unitPrice, orderItem.unit);

    return {
      productId: orderItem.productId,
      marketName: `AgroMarket Direct (${orderItem.state})`,
      state: orderItem.state as CreatePriceObservationInput["state"],
      lga: null,
      price: orderItem.unitPrice,
      currency: "NGN",
      unit: orderItem.unit as CreatePriceObservationInput["unit"],
      sourceType: "PLATFORM_TRANSACTION",
      observedAt: orderItem.completedAt,
      normalizedPrice: normalization.normalizedPrice,
      normalizedUnit: normalization.normalizedUnit,
      normalizationStatus: normalization.status,
      confidenceScore: 0.95, // High confidence since it represents a finalized financial transaction
      dataQualityLabel: "VERIFIED",
      metadata: {
        channel: "AGROMARKET_COMPLETED_ORDER",
        anonymized: true,
      },
    };
  }

  async fetchObservations(): Promise<CreatePriceObservationInput[]> {
    // Platform-derived observations are created reactively upon order completion
    // or queried by the price service.
    return [];
  }
}
