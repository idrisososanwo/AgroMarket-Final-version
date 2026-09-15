import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server";
import { SettlementDetail } from "./types";
import { SettlementService } from "./service";

interface SettlementQueryRow extends Record<string, unknown> {
  id: string;
  order_id: string;
  seller_id: string;
  status: string;
  currency: string;
  gross_amount: number | string;
  platform_fee: number | string;
  logistics_adjustment: number | string;
  refund_deduction: number | string;
  dispute_adjustment: number | string;
  net_amount: number | string;
  hold_reason?: string | null;
  hold_expires_at?: string | null;
  settled_at?: string | null;
  payout_reference?: string | null;
  created_at: string;
  updated_at: string;
  orders?: { order_number?: string } | null;
  profiles?: { full_name?: string } | null;
}

/**
 * Retrieves all settlement records for the authenticated seller.
 * Strictly isolated: Sellers only see their own settlement accounting.
 */
export async function getSellerSettlements(): Promise<SettlementDetail[]> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("settlements")
    .select(`
      *,
      orders!inner(order_number)
    `)
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as SettlementQueryRow[]).map((row) => ({
    ...SettlementService.mapSettlementRow(row),
    orderNumber: row.orders?.order_number,
  }));
}

/**
 * Retrieves all platform settlements for system administrators.
 */
export async function getAdminSettlements(): Promise<SettlementDetail[]> {
  const user = await requireAuth();
  if (!user.roles.includes("ADMIN")) {
    throw new Error("Unauthorized: Admin access required.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("settlements")
    .select(`
      *,
      orders!inner(order_number),
      profiles!settlements_seller_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as SettlementQueryRow[]).map((row) => ({
    ...SettlementService.mapSettlementRow(row),
    orderNumber: row.orders?.order_number,
    sellerName: row.profiles?.full_name,
  }));
}

/**
 * Retrieves a single settlement record by ID with access authorization.
 */
export async function getSettlementById(
  settlementId: string
): Promise<SettlementDetail | null> {
  const user = await requireAuth();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("settlements")
    .select(`
      *,
      orders!inner(order_number),
      profiles!settlements_seller_id_fkey(full_name)
    `)
    .eq("id", settlementId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as SettlementQueryRow;

  // Authorization check: Must be the seller or an admin
  const isSeller = row.seller_id === user.id;
  const isAdmin = user.roles.includes("ADMIN");

  if (!isSeller && !isAdmin) {
    return null;
  }

  return {
    ...SettlementService.mapSettlementRow(row),
    orderNumber: row.orders?.order_number,
    sellerName: row.profiles?.full_name,
  };
}
