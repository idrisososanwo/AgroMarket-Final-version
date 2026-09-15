/**
 * Demand Domain Boundary
 * Aggregation of institutional and buyer produce demands, off-taker requests, and contract farming needs.
 */
export interface OfftakerDemandRequest {
  id: string;
  buyerId: string;
  commodity: string;
  targetQuantity: number;
  unit: string;
  deliveryState: string;
  status: "OPEN" | "MATCHED" | "FULFILLED" | "CLOSED";
}

export * from "./types";
export * from "./signals";
export * from "./forecasting";
export * from "./service";
export * from "./actions";
