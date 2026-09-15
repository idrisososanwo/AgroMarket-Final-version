/**
 * Settlement Accounting Types & State Machine
 */

export type SettlementStatus =
  | "PENDING"
  | "ELIGIBLE"
  | "PROCESSING"
  | "SETTLED"
  | "FAILED"
  | "CANCELLED";

export const VALID_SETTLEMENT_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  PENDING: ["ELIGIBLE", "CANCELLED"],
  ELIGIBLE: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SETTLED", "FAILED"],
  FAILED: ["PROCESSING", "ELIGIBLE", "CANCELLED"],
  SETTLED: [], // Terminal
  CANCELLED: [], // Terminal
};

export function isValidSettlementTransition(
  current: SettlementStatus,
  target: SettlementStatus
): boolean {
  if (current === target) return true;
  const allowed = VALID_SETTLEMENT_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(target));
}

export interface SettlementDetail {
  id: string;
  orderId: string;
  orderNumber?: string;
  sellerId: string;
  sellerName?: string;
  status: SettlementStatus;
  currency: "NGN";
  grossAmount: number;
  platformFee: number;
  logisticsAdjustment: number;
  refundDeduction: number;
  disputeAdjustment: number;
  netAmount: number;
  holdReason?: string | null;
  holdExpiresAt?: string | null;
  settledAt?: string | null;
  payoutReference?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementCalculation {
  grossAmount: number;
  platformFee: number;
  logisticsAdjustment: number;
  refundDeduction: number;
  disputeAdjustment: number;
  netAmount: number;
}

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}
