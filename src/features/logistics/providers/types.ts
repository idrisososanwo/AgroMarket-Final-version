export interface QuoteRequestParams {
  pickupState: string;
  pickupLga: string;
  deliveryState: string;
  deliveryLga: string;
  totalWeightKg?: number;
  itemCount?: number;
}

export interface DeliveryQuoteResult {
  providerId: string;
  providerName: string;
  quoteReference: string;
  amount: number; // In Nigerian Naira
  currency: "NGN";
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  expiresAt: string;
  isProvisional?: boolean;
  provisionalNotice?: string;
}

export interface ShipmentCreationParams {
  orderId: string;
  deliveryId: string;
  trackingNumber: string;
  pickupAddress: string;
  pickupState: string;
  pickupLga: string;
  deliveryAddress: string;
  deliveryState: string;
  deliveryLga: string;
  recipientName: string;
  recipientPhone: string;
  sellerName?: string;
  sellerPhone?: string;
  itemsSummary: string;
}

export interface ShipmentCreationResult {
  externalTrackingReference: string;
  estimatedDeliveryDate: string;
  status: string;
}

export interface LogisticsProviderAdapter {
  readonly name: string;
  readonly isProvisional?: boolean;
  readonly pricingTier?: string;

  /**
   * Generates a distance- and zone-based delivery quote in NGN.
   */
  getQuote(params: QuoteRequestParams): Promise<DeliveryQuoteResult>;

  /**
   * Registers a consignment pickup request with the 3PL carrier.
   */
  createShipment(params: ShipmentCreationParams): Promise<ShipmentCreationResult>;

  /**
   * Cancels a registered consignment with the 3PL carrier before pickup.
   */
  cancelShipment(externalReference: string, reason: string): Promise<boolean>;
}
