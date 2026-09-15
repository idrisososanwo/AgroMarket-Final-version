import crypto from "crypto";
import {
  LogisticsProviderAdapter,
  QuoteRequestParams,
  DeliveryQuoteResult,
  ShipmentCreationParams,
  ShipmentCreationResult,
} from "./types";

/**
 * DEVELOPMENT / PROVISIONAL / SIMULATION PRICING ADAPTER
 *
 * NOTE: This adapter implements heuristic, zone-based transit fee calculations
 * exclusively for local development, staging, and integration testing.
 *
 * IMPORTANT:
 * - These rates are PROVISIONAL SIMULATION PRICING and NOT confirmed or legally binding
 *   nationwide commercial tariffs.
 * - AgroMarket owns ZERO physical fleets and operates as an asset-light coordination platform.
 * - In production environments, this provisional adapter is superseded by direct API
 *   integrations with licensed 3PL logistics carriers with real-time contractual rates.
 */
export class StandardFleetLogisticsAdapter implements LogisticsProviderAdapter {
  readonly name = "Kano-Lagos Agro Express Logistics (Simulation)";
  readonly isProvisional = true;
  readonly pricingTier = "PROVISIONAL_SIMULATION";

  async getQuote(params: QuoteRequestParams): Promise<DeliveryQuoteResult> {
    const isIntraState =
      params.pickupState.trim().toLowerCase() === params.deliveryState.trim().toLowerCase();

    // Zone-based pricing heuristic in Nigerian Naira (PROVISIONAL)
    let baseAmount = 7500; // Regional default
    let minDays = 2;
    let maxDays = 4;

    if (isIntraState) {
      baseAmount = 2500;
      minDays = 1;
      maxDays = 2;
    } else {
      // Long-distance corridor (Northern grain belt <-> Southern consumption centers)
      const northernStates = ["kano", "kaduna", "jigawa", "katsina", "sokoto", "kebbi", "zamfara", "plateau", "benue", "borno", "taraba", "bauchi", "gombe", "yobe", "adamawa", "nasarawa", "niger"];
      const southernStates = ["lagos", "ogun", "oyo", "osun", "ondo", "ekiti", "rivers", "delta", "edo", "anambra", "enugu", "imo", "abia", "ebonyi", "cross river", "akwa ibom", "bayelsa"];

      const pState = params.pickupState.trim().toLowerCase();
      const dState = params.deliveryState.trim().toLowerCase();

      const isCrossZone =
        (northernStates.includes(pState) && southernStates.includes(dState)) ||
        (southernStates.includes(pState) && northernStates.includes(dState));

      if (isCrossZone) {
        baseAmount = 14500;
        minDays = 3;
        maxDays = 5;
      }
    }

    // Weight and item adjustment
    const itemCount = params.itemCount || 1;
    const additionalItemFee = Math.max(0, itemCount - 1) * 500;
    const totalAmount = baseAmount + additionalItemFee;

    const randomRef = crypto.randomBytes(3).toString("hex").toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const quoteReference = `QT-SIM-${dateStr}-${randomRef}`;

    // Quote expires in 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    return {
      providerId: "standard-fleet-adapter",
      providerName: this.name,
      quoteReference,
      amount: totalAmount,
      currency: "NGN",
      estimatedDaysMin: minDays,
      estimatedDaysMax: maxDays,
      expiresAt,
      isProvisional: true,
      provisionalNotice:
        "DEVELOPMENT / PROVISIONAL PRICING: These transit fees and delivery windows are simulated for local development and testing. Real-world negotiated 3PL carrier rates will replace these in production.",
    };
  }

  async createShipment(_params: ShipmentCreationParams): Promise<ShipmentCreationResult> {
    const randomRef = crypto.randomBytes(4).toString("hex").toUpperCase();
    const externalTrackingReference = `EXP-NG-${randomRef}`;

    // Compute estimated delivery date (3 days from now)
    const estimatedDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    return {
      externalTrackingReference,
      estimatedDeliveryDate: estimatedDate,
      status: "ASSIGNED",
    };
  }

  async cancelShipment(_externalReference: string, _reason: string): Promise<boolean> {
    // Acknowledge cancellation with external carrier
    return true;
  }
}
