/**
 * Disputes Domain Types & State Machine
 */

export type DisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "REJECTED"
  | "CLOSED"
  | "CANCELLED";

export type DisputeType =
  | "ITEM_NOT_RECEIVED"
  | "WRONG_ITEM"
  | "DAMAGED_ITEM"
  | "QUALITY_ISSUE"
  | "MISSING_QUANTITY"
  | "DELIVERY_FAILURE"
  | "OTHER";

export type ResolutionType =
  | "BUYER_REFUND"
  | "SELLER_SETTLEMENT"
  | "PARTIAL_REFUND"
  | "NO_ACTION"
  | "REPLACEMENT";

export type EvidenceType =
  | "PHOTO"
  | "VIDEO"
  | "DOCUMENT"
  | "DELIVERY_PROOF"
  | "CHAT_REFERENCE"
  | "OTHER";

/**
 * Server-authoritative state machine transitions.
 */
export const VALID_DISPUTE_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  OPEN: ["UNDER_REVIEW", "CANCELLED", "CLOSED"],
  UNDER_REVIEW: ["RESOLVED", "REJECTED", "CANCELLED", "CLOSED"],
  RESOLVED: ["CLOSED"],
  REJECTED: ["CLOSED"],
  CLOSED: [], // Terminal
  CANCELLED: [], // Terminal
};

export function isValidDisputeTransition(
  current: DisputeStatus,
  target: DisputeStatus
): boolean {
  if (current === target) return true;
  const allowed = VALID_DISPUTE_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(target));
}

export interface DisputeEvidenceDetail {
  id: string;
  disputeId: string;
  uploadedBy: string;
  uploadedByName?: string;
  evidenceType: EvidenceType;
  fileUrl: string;
  description?: string | null;
  createdAt: string;
}

export interface DisputeDetail {
  id: string;
  openedBy: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  sellerId: string;
  sellerName?: string;
  sellerPhone?: string;
  orderId: string;
  orderNumber?: string;
  orderItemId?: string | null;
  productName?: string | null;
  disputeType: DisputeType;
  reason: string;
  description: string;
  disputedAmount: number;
  currency: "NGN";
  status: DisputeStatus;
  resolutionType?: ResolutionType | null;
  refundAmount: number;
  resolutionNotes?: string | null;
  sellerResponse?: string | null;
  sellerRespondedAt?: string | null;
  assignedAdminId?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  evidence: DisputeEvidenceDetail[];
}

export interface CreateDisputeInput {
  orderId: string;
  sellerId: string;
  orderItemId?: string;
  disputeType: DisputeType;
  reason: string;
  description: string;
  evidenceUrls?: string[];
}

export interface SellerResponseInput {
  disputeId: string;
  response: string;
  evidenceUrls?: string[];
}

export interface ResolveDisputeInput {
  disputeId: string;
  resolutionType: ResolutionType;
  resolutionNotes: string;
  refundAmount?: number;
}

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}
