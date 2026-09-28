/**
 * AgroMarket Jobs Domain Boundary
 * Agricultural labor, farm hands, harvesting crews, agronomist placements, and gig listings.
 */

export * from "./types";
export * from "./validation";
export * from "./queries";
export * from "./actions";

// Legacy compatibility interface
export interface AgriculturalJobListing {
  id: string;
  employerId: string;
  title: string;
  state: string;
  lga: string;
  jobType: "SEASONAL" | "FULL_TIME" | "CASUAL_LABOR";
  isOpen: boolean;
}
