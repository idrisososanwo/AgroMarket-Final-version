import React from "react";
import Link from "next/link";
import { NotificationCenterContainer } from "@/features/notifications/components";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Notifications & Alerts | AgroMarket",
  description:
    "Grounded agricultural intelligence notifications, commodity price shifts, biosecurity advisories, and time-sensitive farming guidance.",
};

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <Link
            href="/intelligence"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Agricultural Intelligence</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Phase 3.16 Alert Delivery
            </span>
            <span className="text-xs text-gray-500">Live In-App</span>
          </div>
        </div>

        {/* Main Notification Center */}
        <NotificationCenterContainer />
      </div>
    </div>
  );
}
