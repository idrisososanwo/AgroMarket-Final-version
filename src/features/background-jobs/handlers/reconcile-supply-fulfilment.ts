/**
 * AgroMarket Phase 3.17: Reconcile Supply Fulfilment Handler
 * Deterministically reconciles committed vs confirmed vs fulfilled supply quantities.
 * Preserves original commitments; updates reconciliation status cleanly.
 */

import {
  JobHandler,
  JobExecutionContext,
  JobExecutionResult,
  ReconcileSupplyFulfilmentPayload,
} from "../types";
import { reconcileSupplyFulfilmentPayloadSchema } from "../validation";
import { reconcileCommitmentQuantity } from "@/features/agricultural-coordination/calculations";
import { getAdminClientSafely } from "../data-layer";

export class ReconcileSupplyFulfilmentHandler
  implements JobHandler<ReconcileSupplyFulfilmentPayload, { reconciledCount: number; commitmentIds: string[] }>
{
  readonly jobType = "RECONCILE_SUPPLY_FULFILMENT" as const;

  async execute(
    payload: ReconcileSupplyFulfilmentPayload,
    context: JobExecutionContext
  ): Promise<JobExecutionResult<{ reconciledCount: number; commitmentIds: string[] }>> {
    const parsed = reconcileSupplyFulfilmentPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        errorCategory: "VALIDATION_FAILED",
        errorMessage: parsed.error.issues.map((i) => i.message).join(", "),
        retryable: false,
      };
    }

    const { commitmentId } = parsed.data;

    const supabase = getAdminClientSafely();

    const reconciledIds: string[] = [];

    if (supabase) {
      let query = supabase
        .from("agricultural_supply_commitments")
        .select("id, committed_quantity, confirmed_quantity, fulfilled_quantity, unit, status");

      if (commitmentId) {
        query = query.eq("id", commitmentId);
      } else {
        query = query
          .in("status", ["ACCEPTED", "CONFIRMED", "FULFILMENT_PENDING", "FULFILLED"])
          .limit(20);
      }

      const { data, error } = await query;
      if (!error && data) {
        for (const row of data) {
          const rec = reconcileCommitmentQuantity({
            commitmentId: row.id,
            committedQuantity: Number(row.committed_quantity) || 0,
            confirmedQuantity: row.confirmed_quantity ? Number(row.confirmed_quantity) : null,
            fulfilledQuantity: Number(row.fulfilled_quantity) || 0,
            unit: row.unit || "KG",
          });

          await supabase
            .from("agricultural_supply_commitments")
            .update({
              reconciliation_status: rec.outcome,
              reconciled_at: context.now.toISOString(),
            })
            .eq("id", row.id);

          reconciledIds.push(row.id);
        }
      }
    }

    return {
      success: true,
      result: {
        reconciledCount: reconciledIds.length,
        commitmentIds: reconciledIds,
      },
    };
  }
}
