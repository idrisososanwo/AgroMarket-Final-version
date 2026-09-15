/**
 * Farmers Domain Boundary
 * Manages farmer onboarding, farmer cooperative memberships, and verification.
 */
export interface FarmerProfile {
  id: string;
  userId: string;
  cooperativeName?: string;
  isVerified: boolean;
}
