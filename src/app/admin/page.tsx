import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Admin Control Console | AgroMarket",
};

export default async function AdminConsolePage() {
  const user = await requireRole("ADMIN");

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/account"
          className="inline-flex items-center text-xs font-medium text-primary-700 hover:text-primary-800"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Account
        </Link>

        <div className="rounded-xl border border-purple-200 bg-card p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                AgroMarket Platform Administration
              </h1>
              <p className="text-xs text-muted-foreground">
                Superuser access verified for: <strong>{user.fullName || user.email}</strong>
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground">
            This console is restricted strictly to verified AgroMarket compliance officers and system administrators. Privileged actions, KYC verification approvals, catalog moderation, dispute arbitration, and settlement disbursement are governed here.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/disputes"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-purple-600 hover:bg-purple-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Disputes Arbitration</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Arbitrate buyer claims on produce quality, weighbridge deficits, and award gateway refunds.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-purple-700">
                Arbitrate Disputes &rarr;
              </div>
            </Link>

            <Link
              href="/admin/settlements"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-purple-600 hover:bg-purple-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Settlement Accounting</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Manage multi-seller payout accounting, evaluate fulfillment holds, and trigger payouts.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-purple-700">
                Manage Settlements &rarr;
              </div>
            </Link>

            <Link
              href="/admin/market-intelligence"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-purple-600 hover:bg-purple-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Market Intelligence & Moderation</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Audit commodity observations, verify community price reports, and run demand forecasts.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-purple-700">
                Audit Price Data &rarr;
              </div>
            </Link>

            <Link
              href="/admin/knowledge"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-purple-600 hover:bg-purple-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Knowledge & Content Hub</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Author agronomic guides, publish official government notices, and moderate extension bulletins.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-purple-700">
                Manage Knowledgebase &rarr;
              </div>
            </Link>

            <Link
              href="/admin/security"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-purple-600 hover:bg-purple-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Agricultural Security & Notices</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Manage physical security incident reports, verify movement disruptions, and publish corridor advisories.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-purple-700">
                Manage Security Notices &rarr;
              </div>
            </Link>

            <Link
              href="/admin/intelligence"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-emerald-600 hover:bg-emerald-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Agricultural Intelligence Foundation</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Monitor deterministic signals, oversee advisory recommendations, and evaluate prediction memory.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-700">
                Open Intelligence Console &rarr;
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
