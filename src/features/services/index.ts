/**
 * Services Domain Boundary
 * Agricultural service providers (soil testing, veterinary, drone spraying, clearing, extension).
 */
export interface AgriculturalServiceListing {
  id: string;
  providerId: string;
  serviceType: string;
  state: string;
  isCertified: boolean;
}
