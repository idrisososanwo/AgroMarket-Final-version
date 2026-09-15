/**
 * Shared Purchase Domain Types & State Machine
 * Group-buying and bulk-splitting for crops and animal portions.
 */

export type SharedPurchaseType = "BULK_CROP" | "ANIMAL_PORTION";

export type AnimalPortionModel = "FRACTIONAL" | "WEIGHT_BASED";

export type SharedPurchaseStatus =
  | "DRAFT"
  | "OPEN"
  | "TARGET_REACHED"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "FULFILMENT"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type ParticipantStatus =
  | "PLEDGED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "CONFIRMED"
  | "FULFILLED"
  | "CANCELLED"
  | "REFUNDED";

/**
 * Shared Purchase State Machine Transitions.
 * Strictly controlled server-authoritative lifecycle.
 */
export const VALID_SHARED_PURCHASE_TRANSITIONS: Record<
  SharedPurchaseStatus,
  SharedPurchaseStatus[]
> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["TARGET_REACHED", "PAYMENT_PENDING", "CANCELLED", "EXPIRED"],
  TARGET_REACHED: ["PAYMENT_PENDING", "CONFIRMED", "CANCELLED"],
  PAYMENT_PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["FULFILMENT", "CANCELLED"],
  FULFILMENT: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // Terminal
  CANCELLED: [], // Terminal
  EXPIRED: [], // Terminal
};

export function isValidSharedPurchaseTransition(
  current: SharedPurchaseStatus,
  target: SharedPurchaseStatus
): boolean {
  if (current === target) return true;
  const allowed = VALID_SHARED_PURCHASE_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(target));
}

/**
 * Participant Lifecycle State Machine.
 */
export const VALID_PARTICIPANT_TRANSITIONS: Record<
  ParticipantStatus,
  ParticipantStatus[]
> = {
  PLEDGED: ["PAYMENT_PENDING", "PAID", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "CANCELLED"],
  PAID: ["CONFIRMED", "REFUNDED"],
  CONFIRMED: ["FULFILLED", "REFUNDED"],
  FULFILLED: ["REFUNDED"], // Can be refunded in edge disputes
  CANCELLED: [], // Terminal
  REFUNDED: [], // Terminal
};

export function isValidParticipantTransition(
  current: ParticipantStatus,
  target: ParticipantStatus
): boolean {
  if (current === target) return true;
  const allowed = VALID_PARTICIPANT_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(target));
}

export interface AnimalPortionFraction {
  id: string;
  name: string; // e.g. "Quarter Ram", "Half Ram", "One Eighth"
  fraction: number; // e.g. 0.25, 0.5, 0.125
  portionPrice: number; // e.g. ₦35,000
  description?: string;
}

export interface SharedPurchaseDetail {
  id: string;
  listingId: string;
  createdBy: string;
  title: string;
  description: string | null;
  purchaseType: SharedPurchaseType;
  totalQuantity: number;
  allocatedQuantity: number;
  remainingQuantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  targetParticipants: number;
  currentParticipants: number;
  minShareQuantity: number;
  maxShareQuantity: number | null;
  portionModel: AnimalPortionModel | null;
  portionFractions: AnimalPortionFraction[];
  metadata: Record<string, unknown>;
  deadline: string;
  status: SharedPurchaseStatus;
  pickupHubLocation: string;
  hubState: string;
  hubLga: string;
  createdAt: string;
  updatedAt: string;
  // Computed / Joined fields
  listing?: {
    id: string;
    title: string;
    pricePerUnit: number;
    unit: string;
    sellerId: string;
    sellerName?: string;
    sellerPhone?: string;
    state: string;
    lga: string;
    productName: string;
    categoryName?: string;
    quantityAvailable?: number;
  };
  progressPercent: number;
  isExpired: boolean;
  isJoinable: boolean;
}

export interface SharedPurchaseParticipantDetail {
  id: string;
  sharedPurchaseId: string;
  userId: string;
  orderId: string | null;
  sharesCount: number;
  shareAmount: number;
  unit: string;
  unitPrice: number;
  portionChoice: string | null;
  paymentId: string | null;
  status: ParticipantStatus;
  portionAllocationNotes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  orderNumber?: string;
}

export interface CreateSharedPurchaseInput {
  listingId: string;
  title: string;
  description?: string | null;
  purchaseType: SharedPurchaseType;
  totalQuantity: number;
  unit: string;
  unitPrice: number;
  targetParticipants: number;
  minShareQuantity: number;
  maxShareQuantity?: number | null;
  portionModel?: AnimalPortionModel | null;
  portionFractions?: AnimalPortionFraction[];
  deadline: string;
  pickupHubLocation: string;
  hubState: string;
  hubLga: string;
  metadata?: Record<string, unknown>;
}

export interface JoinSharedPurchaseInput {
  sharedPurchaseId: string;
  requestedQuantity: number;
  portionChoice?: string | null;
  deliveryAddress?: string | null;
  deliveryState?: string | null;
  deliveryLga?: string | null;
  contactPhone: string;
  deliveryNotes?: string | null;
  portionNotes?: string | null;
}

export interface JoinSharedPurchaseResult {
  participantId: string;
  orderId: string;
  orderNumber: string;
  shareAmount: number;
  allocatedQuantity: number;
  remainingQuantity: number;
  isTargetReached: boolean;
}

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
}
