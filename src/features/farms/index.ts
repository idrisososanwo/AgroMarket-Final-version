/**
 * Farms Domain Boundary
 * Manages physical farm land registration, GPS coordinates, farming scale, and crop cycles.
 */
export interface FarmRecord {
  id: string;
  farmerId: string;
  name: string;
  state: string;
  lga: string;
  sizeHectares?: number;
}
