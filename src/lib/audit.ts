import { createAdminClient } from "@/lib/supabase/admin";

export interface RecordAuditLogParams {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Appends an entry to the immutable audit_logs ledger.
 * Executes using the privileged Supabase service role client.
 * Silently catches errors to avoid failing the main operational transaction.
 */
export async function recordAuditLog(params: RecordAuditLogParams): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: params.actorId ?? null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      ip_address: params.ipAddress ?? null,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    // Audit logging failure should not crash business operations, but should log
    console.error("Failed to record audit log:", error);
  }
}
