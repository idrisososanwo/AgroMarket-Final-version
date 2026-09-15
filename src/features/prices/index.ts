/**
 * Prices Domain Boundary
 * Market price indexing across Nigerian commodity markets (e.g. Mile 12, Dawanau, Bodija, etc.).
 */
export interface CommodityPriceIndex {
  commodity: string;
  marketName: string;
  state: string;
  unit: string;
  averagePriceNgn: number;
  reportedDate: string;
}

export * from "./types";
export * from "./normalization";
export * from "./trend";
export * from "./provider";
export * from "./service";
export * from "./actions";
