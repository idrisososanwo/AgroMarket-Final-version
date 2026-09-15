/**
 * Equipment Domain Boundary
 * Farm machinery rental and leasing (tractors, harvesters, planters, boom sprayers).
 */
export interface EquipmentListing {
  id: string;
  ownerId: string;
  equipmentType: string;
  dailyRateNgn: number;
  locationState: string;
  isOperational: boolean;
}
