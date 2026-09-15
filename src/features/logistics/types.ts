export type DeliveryStatus =
  | "PENDING"
  | "QUOTED"
  | "ASSIGNED"
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "DELIVERY_FAILED";

export const VALID_DELIVERY_STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING: ["QUOTED", "CANCELLED"],
  QUOTED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PICKUP_SCHEDULED", "CANCELLED"],
  PICKUP_SCHEDULED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "DELIVERY_FAILED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "DELIVERY_FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERY_FAILED: ["ASSIGNED", "PICKUP_SCHEDULED", "CANCELLED"],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

export function isValidDeliveryStatusTransition(
  current: DeliveryStatus,
  target: DeliveryStatus
): boolean {
  if (current === target) return true;
  const allowed = VALID_DELIVERY_STATUS_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(target));
}

export interface LogisticsProviderDetail {
  id: string;
  profileId: string | null;
  name: string;
  companyRc: string | null;
  contactPerson: string;
  phone: string;
  email: string | null;
  coverageStates: string[];
  fleetTypes: string[];
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DeliveryEventDetail {
  id: string;
  deliveryId: string;
  status: string;
  locationName: string | null;
  description: string;
  occurredAt: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DeliveryItemDetail {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface DeliveryDetail {
  id: string;
  orderId: string;
  orderNumber?: string;
  providerId: string | null;
  providerName?: string;
  providerPhone?: string;
  sellerId: string;
  sellerName?: string;
  sellerPhone?: string;
  pickupAddress: string;
  pickupState: string;
  pickupLga: string;
  deliveryAddress: string;
  deliveryState: string;
  deliveryLga: string;
  recipientName: string;
  recipientPhone: string;
  status: DeliveryStatus;
  trackingNumber: string;
  externalTrackingReference?: string | null;
  deliveryFee: number;
  currency: "NGN";
  quoteReference?: string | null;
  quoteExpiresAt?: string | null;
  proofOfDeliveryUrl?: string | null;
  estimatedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  cancellationReason?: string | null;
  failureReason?: string | null;
  items?: DeliveryItemDetail[];
  events?: DeliveryEventDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryQuote {
  providerId: string;
  providerName: string;
  quoteReference: string;
  amount: number; // in NGN
  currency: "NGN";
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  expiresAt: string;
}

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}
