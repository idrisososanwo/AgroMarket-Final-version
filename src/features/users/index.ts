/**
 * Users Domain Boundary
 * Manages user profile lifecycle, KYC verification, preferences, and state/LGA geo-location.
 */
export interface UserDomainProfile {
  id: string;
  fullName: string;
  phone: string;
  state: string;
  lga: string;
  isKycVerified: boolean;
}
