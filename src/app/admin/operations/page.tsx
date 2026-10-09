import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { ObservabilityService } from "@/features/observability/service";
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  Bell,
  Cpu,
  RefreshCw,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform Observability & Reliability | AgroMarket Admin",
};

export default async function AdminOperationsDashboardPage() {
  await requireRole("ADMIN");

  const data = await ObservabilityService.getOperationalDashboardData();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "HEALTHY":
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            {status}
          </span>
        );
      case "DEGRADED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            {status}
          </span>
        );
      case "UNAVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-800">
            <HelpCircle className="h-3.5 w-3.5 text-neutral-500" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-12">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Navigation */}
        <Link
          href="/admin"
          className="inline-flex items-center text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Admin Console
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-neutral-900">
                  Platform Observability & Reliability Monitoring
                </h1>
                {getStatusBadge(data.overallStatus)}
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Monitored operational metrics, background worker health, and alert delivery status. (Read-only)
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div className="font-mono">Observed: {new Date(data.timestamp).toLocaleTimeString()}</div>
            <div>Process Uptime: {data.liveness.uptimeSeconds}s</div>
          </div>
        </div>

        {/* Diagnostics & Warning Alerts if any */}
        {data.thresholdEvaluation.diagnostics.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Active System Diagnostics ({data.thresholdEvaluation.diagnostics.length})
            </div>
            <ul className="space-y-1.5 text-xs text-amber-800 pl-6 list-disc">
              {data.thresholdEvaluation.diagnostics.map((diag, idx) => (
                <li key={idx}>
                  <strong>[{diag.rule}]</strong>: {diag.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3-Column Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Background Queue Health */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-neutral-900">Background Processing Queue</h2>
              </div>
              {getStatusBadge(data.queueMetrics.queueLagSeconds !== null && data.queueMetrics.queueLagSeconds > 300 ? "DEGRADED" : "HEALTHY")}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-lg bg-neutral-50 p-3">
                <div className="text-xs text-neutral-500">Queued Tasks</div>
                <div className="text-lg font-bold text-neutral-900">{data.queueMetrics.countsByStatus.QUEUED}</div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3">
                <div className="text-xs text-neutral-500">Running (Leased)</div>
                <div className="text-lg font-bold text-neutral-900">{data.queueMetrics.countsByStatus.RUNNING}</div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3">
                <div className="text-xs text-neutral-500">Queue Processing Lag</div>
                <div className="text-lg font-bold text-neutral-900">
                  {data.queueMetrics.queueLagSeconds !== null ? `${data.queueMetrics.queueLagSeconds}s` : "0s (Clear)"}
                </div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3">
                <div className="text-xs text-neutral-500">Oldest Queued Job</div>
                <div className="text-lg font-bold text-neutral-900">
                  {data.queueMetrics.oldestEligibleQueuedAgeSeconds !== null ? `${data.queueMetrics.oldestEligibleQueuedAgeSeconds}s` : "None"}
                </div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3">
                <div className="text-xs text-neutral-500">Dead Letters</div>
                <div className={`text-lg font-bold ${data.queueMetrics.terminalDeadLetterCount > 0 ? "text-rose-600" : "text-neutral-900"}`}>
                  {data.queueMetrics.terminalDeadLetterCount}
                </div>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3">
                <div className="text-xs text-neutral-500">Expired Leases</div>
                <div className="text-lg font-bold text-neutral-900">{data.queueMetrics.expiredLeasesCount}</div>
              </div>
            </div>
          </div>

          {/* Card 2: Worker & Scheduler Activity */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-neutral-900">Worker & Scheduler Activity</h2>
              </div>
              {getStatusBadge(data.capabilities.scheduler.status)}
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-neutral-500">Last Attempted Run</span>
                <span className="font-mono text-neutral-900">
                  {data.queueMetrics.lastAttemptedWorkerCycle
                    ? new Date(data.queueMetrics.lastAttemptedWorkerCycle).toLocaleTimeString()
                    : "Never observed"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-neutral-500">Last Successful Cycle</span>
                <span className="font-mono text-neutral-900">
                  {data.queueMetrics.lastSuccessfulWorkerCycle
                    ? new Date(data.queueMetrics.lastSuccessfulWorkerCycle).toLocaleTimeString()
                    : "Never observed"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-neutral-500">Scheduler Configured</span>
                <span className="font-semibold text-neutral-900">
                  {data.capabilities.scheduler.configured ? "Yes (CRON_SECRET set)" : "No"}
                </span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-neutral-500">Scheduler Live Status</span>
                <span className="font-semibold text-neutral-900">
                  {data.capabilities.scheduler.observedActive ? "Actively Triggering" : "Awaiting Invocations"}
                </span>
              </div>
            </div>

            {data.capabilities.scheduler.notes && (
              <p className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                {data.capabilities.scheduler.notes}
              </p>
            )}
          </div>

          {/* Card 3: Alert & Delivery Pipeline */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-neutral-900">Alerts & Notifications</h2>
              </div>
              {getStatusBadge(data.notificationMetrics.expiredAlertsEligibleCount > 0 ? "DEGRADED" : "HEALTHY")}
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-neutral-500">Published Alerts Pending Dispatch</span>
                <span className="font-bold text-neutral-900">{data.notificationMetrics.publishedAlertsAwaitingDispatch}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-neutral-500">Pending Review Queue (Human Action)</span>
                <span className="font-bold text-neutral-900">{data.notificationMetrics.pendingReviewAlertsCount}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-neutral-500">Expired Alerts Requiring Cleanup</span>
                <span className={`font-bold ${data.notificationMetrics.expiredAlertsEligibleCount > 0 ? "text-amber-600" : "text-neutral-900"}`}>
                  {data.notificationMetrics.expiredAlertsEligibleCount}
                </span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-neutral-500">Repeated Delivery Failures (&ge;3 attempts)</span>
                <span className={`font-bold ${data.notificationMetrics.repeatedDeliveryFailuresCount > 0 ? "text-rose-600" : "text-neutral-900"}`}>
                  {data.notificationMetrics.repeatedDeliveryFailuresCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Provider and Infrastructure Status Table */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-neutral-900">Infrastructure & Delivery Providers</h2>
            </div>
            <span className="text-xs text-neutral-400">Truthful Provider Availability</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Channel / Subsystem</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Observed Status</th>
                  <th className="py-2.5 px-3 font-semibold">Operational Details</th>
                </tr>
              </thead>
              <tbody className="divide-y text-neutral-700">
                <tr>
                  <td className="py-2.5 px-3 font-medium">PostgreSQL Database</td>
                  <td className="py-2.5 px-3 text-neutral-500">Persistence</td>
                  <td className="py-2.5 px-3">{getStatusBadge(data.capabilities.database.status)}</td>
                  <td className="py-2.5 px-3 text-neutral-500">
                    {data.capabilities.database.message || "Connected"} (Latency: {data.capabilities.database.latencyMs ?? 0}ms)
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium">IN_APP Notifications</td>
                  <td className="py-2.5 px-3 text-neutral-500">Delivery Channel</td>
                  <td className="py-2.5 px-3">{getStatusBadge("AVAILABLE")}</td>
                  <td className="py-2.5 px-3 text-neutral-500">Native PostgreSQL persistence & in-app bell feed.</td>
                </tr>
                {Object.entries(data.capabilities.externalDeliveryProviders).map(([ch, provider]) => (
                  <tr key={ch}>
                    <td className="py-2.5 px-3 font-medium">{ch} Delivery</td>
                    <td className="py-2.5 px-3 text-neutral-500">External Provider</td>
                    <td className="py-2.5 px-3">{getStatusBadge(provider.status)}</td>
                    <td className="py-2.5 px-3 text-neutral-500">{provider.reason}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2.5 px-3 font-medium">Google Gemini AI</td>
                  <td className="py-2.5 px-3 text-neutral-500">Intelligence Adapter</td>
                  <td className="py-2.5 px-3">{getStatusBadge(data.capabilities.aiProvider.status)}</td>
                  <td className="py-2.5 px-3 text-neutral-500">
                    {data.capabilities.aiProvider.configured
                      ? `Model ${data.capabilities.aiProvider.model} configured.`
                      : "GEMINI_API_KEY unconfigured; deterministic fallbacks active."}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Read-Only Safeguard Banner */}
        <div className="rounded-lg bg-neutral-100 p-4 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-neutral-400" />
          <span>
            This operational console is read-only. Background queue cycles and retry executions are governed strictly by authenticated scheduler endpoints and administrator actions.
          </span>
        </div>
      </div>
    </div>
  );
}
