import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server";
import { DisputeDetail, DisputeStatus, DisputeType, ResolutionType } from "./types";
import { DisputeService } from "./service";

interface DisputeQueryRow {
  id: string;
  opened_by: string;
  seller_id: string;
  related_order_id: string;
  order_item_id?: string | null;
  dispute_type: string;
  reason: string;
  description: string;
  disputed_amount: number | string;
  status: string;
  resolution_type?: string | null;
  refund_amount?: number | string | null;
  resolution_notes?: string | null;
  seller_response?: string | null;
  seller_responded_at?: string | null;
  assigned_admin_id?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  orders?: { order_number?: string } | null;
  order_items?: { product_name_snapshot?: string } | null;
  buyer?: { full_name?: string } | null;
  seller?: { full_name?: string } | null;
}

/**
 * Retrieves all disputes initiated by the authenticated buyer.
 */
export async function getBuyerDisputes(): Promise<DisputeDetail[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("disputes")
    .select(`
      *,
      orders!inner(order_number),
      order_items(product_name_snapshot),
      seller:profiles!disputes_seller_id_fkey(full_name)
    `)
    .eq("opened_by", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as DisputeQueryRow[]).map((row) => ({
    id: row.id,
    openedBy: row.opened_by,
    sellerId: row.seller_id,
    sellerName: row.seller?.full_name,
    orderId: row.related_order_id,
    orderNumber: row.orders?.order_number,
    orderItemId: row.order_item_id || undefined,
    productName: row.order_items?.product_name_snapshot,
    disputeType: row.dispute_type as DisputeType,
    reason: row.reason,
    description: row.description,
    disputedAmount: Number(row.disputed_amount),
    currency: "NGN",
    status: row.status as DisputeStatus,
    resolutionType: (row.resolution_type as ResolutionType) || null,
    refundAmount: Number(row.refund_amount || 0),
    resolutionNotes: row.resolution_notes || null,
    sellerResponse: row.seller_response || null,
    sellerRespondedAt: row.seller_responded_at || null,
    assignedAdminId: row.assigned_admin_id || null,
    resolvedBy: row.resolved_by || null,
    resolvedAt: row.resolved_at || null,
    closedAt: row.closed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    evidence: [],
  }));
}

/**
 * Retrieves all disputes filed against the authenticated seller.
 * Strictly isolated: Sellers only see disputes for their own goods.
 */
export async function getSellerDisputes(): Promise<DisputeDetail[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("disputes")
    .select(`
      *,
      orders!inner(order_number),
      order_items(product_name_snapshot),
      buyer:profiles!disputes_opened_by_fkey(full_name)
    `)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as DisputeQueryRow[]).map((row) => ({
    id: row.id,
    openedBy: row.opened_by,
    buyerName: row.buyer?.full_name,
    sellerId: row.seller_id,
    orderId: row.related_order_id,
    orderNumber: row.orders?.order_number,
    orderItemId: row.order_item_id || undefined,
    productName: row.order_items?.product_name_snapshot,
    disputeType: row.dispute_type as DisputeType,
    reason: row.reason,
    description: row.description,
    disputedAmount: Number(row.disputed_amount),
    currency: "NGN",
    status: row.status as DisputeStatus,
    resolutionType: (row.resolution_type as ResolutionType) || null,
    refundAmount: Number(row.refund_amount || 0),
    resolutionNotes: row.resolution_notes || null,
    sellerResponse: row.seller_response || null,
    sellerRespondedAt: row.seller_responded_at || null,
    assignedAdminId: row.assigned_admin_id || null,
    resolvedBy: row.resolved_by || null,
    resolvedAt: row.resolved_at || null,
    closedAt: row.closed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    evidence: [],
  }));
}

/**
 * Retrieves all platform disputes for administrators.
 */
export async function getAdminDisputes(): Promise<DisputeDetail[]> {
  const user = await requireAuth();
  if (!user.roles.includes("ADMIN")) {
    throw new Error("Unauthorized: Admin access required.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("disputes")
    .select(`
      *,
      orders!inner(order_number),
      order_items(product_name_snapshot),
      buyer:profiles!disputes_opened_by_fkey(full_name),
      seller:profiles!disputes_seller_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as DisputeQueryRow[]).map((row) => ({
    id: row.id,
    openedBy: row.opened_by,
    buyerName: row.buyer?.full_name,
    sellerId: row.seller_id,
    sellerName: row.seller?.full_name,
    orderId: row.related_order_id,
    orderNumber: row.orders?.order_number,
    orderItemId: row.order_item_id || undefined,
    productName: row.order_items?.product_name_snapshot,
    disputeType: row.dispute_type as DisputeType,
    reason: row.reason,
    description: row.description,
    disputedAmount: Number(row.disputed_amount),
    currency: "NGN",
    status: row.status as DisputeStatus,
    resolutionType: (row.resolution_type as ResolutionType) || null,
    refundAmount: Number(row.refund_amount || 0),
    resolutionNotes: row.resolution_notes || null,
    sellerResponse: row.seller_response || null,
    sellerRespondedAt: row.seller_responded_at || null,
    assignedAdminId: row.assigned_admin_id || null,
    resolvedBy: row.resolved_by || null,
    resolvedAt: row.resolved_at || null,
    closedAt: row.closed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    evidence: [],
  }));
}

/**
 * Retrieves full details and evidence for a single dispute with authorization checks.
 */
export async function getDisputeById(disputeId: string): Promise<DisputeDetail | null> {
  const user = await requireAuth();
  const dispute = await DisputeService.getDisputeById(disputeId);

  if (!dispute) return null;

  // Enforce role isolation: must be the buyer, the target seller, or an admin
  const isBuyer = dispute.openedBy === user.id;
  const isSeller = dispute.sellerId === user.id;
  const isAdmin = user.roles.includes("ADMIN");

  if (!isBuyer && !isSeller && !isAdmin) {
    return null;
  }

  return dispute;
}
