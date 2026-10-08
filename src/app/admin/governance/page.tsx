import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import {
  getGovernanceSummaryStats,
  getAllHumanApprovals,
  getAllGovernanceEvaluations,
  getAllGovernanceOverrides,
  getInMemoryGovernanceAuditEntries,
} from "@/features/intelligence-governance";
import { GovernanceCommandCenter } from "@/features/intelligence-governance";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Intelligence Governance & Human Oversight | Admin Console | AgroMarket",
  description:
    "Deterministic policy engine oversight, pending human approvals, multi-domain reviews, and governance audit trail.",
};

export default async function AdminGovernancePage() {
  await requireRole("ADMIN");

  const [stats, approvals, evaluations, overrides] = await Promise.all([
    getGovernanceSummaryStats(),
    getAllHumanApprovals({ limit: 100 }),
    getAllGovernanceEvaluations({ limit: 100 }),
    getAllGovernanceOverrides(100),
  ]);

  const auditEntries = getInMemoryGovernanceAuditEntries();

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center text-xs font-medium text-emerald-700 hover:text-emerald-800 mb-2"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Admin Console
          </Link>
        </div>

        <GovernanceCommandCenter
          stats={stats}
          approvals={approvals}
          evaluations={evaluations}
          overrides={overrides}
          auditEntries={auditEntries}
          currentUserRole="ADMIN"
        />
      </div>
    </div>
  );
}
