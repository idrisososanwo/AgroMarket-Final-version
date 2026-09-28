/**
 * AgroMarket Services Domain Boundary
 * Agricultural service providers (soil testing, veterinary, drone spraying, clearing, extension).
 */

export * from "./types";
export * from "./validation";
export * from "./queries";
export * from "./actions";

// Legacy compatibility interface
export interface AgriculturalServiceListing {
  id: string;
  providerId: string;
  serviceType: string;
  state: string;
  isCertified: boolean;
}
