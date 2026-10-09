"use client";

import React from "react";
import { Filter, CheckCheck, RefreshCw } from "lucide-react";

interface NotificationFiltersProps {
  selectedCategory: string;
  selectedSeverity: string;
  unreadOnly: boolean;
  unreadCount: number;
  onCategoryChange: (category: string) => void;
  onSeverityChange: (severity: string) => void;
  onUnreadOnlyToggle: (unreadOnly: boolean) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Categories", value: "ALL" },
  { label: "Price Changes", value: "PRICE_CHANGE" },
  { label: "Supply & Demand", value: "DEMAND_SUPPLY_OPPORTUNITY" },
  { label: "Production Guidance", value: "PRODUCTION_GUIDANCE" },
  { label: "Biosecurity & Disease", value: "DISEASE_BIOSECURITY_ADVISORY" },
  { label: "Food Security", value: "FOOD_SECURITY_ALERT" },
  { label: "Fulfilment & Logistics", value: "FULFILMENT_LOGISTICS_UPDATE" },
  { label: "Government & Policy", value: "GOVERNMENT_ANNOUNCEMENT" },
  { label: "Coordination", value: "COORDINATION_EVENT" },
  { label: "System", value: "SYSTEM_NOTIFICATION" },
];

const SEVERITIES: { label: string; value: string }[] = [
  { label: "All Severities", value: "ALL" },
  { label: "Critical", value: "CRITICAL" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
  { label: "Info", value: "INFO" },
];

export function NotificationFilters({
  selectedCategory,
  selectedSeverity,
  unreadOnly,
  unreadCount,
  onCategoryChange,
  onSeverityChange,
  onUnreadOnlyToggle,
  onMarkAllAsRead,
  onRefresh,
  isRefreshing = false,
}: NotificationFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-800">Filter Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-50 transition-colors"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full text-xs rounded-md border border-gray-300 py-1.5 px-2 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Severity
          </label>
          <select
            value={selectedSeverity}
            onChange={(e) => onSeverityChange(e.target.value)}
            className="w-full text-xs rounded-md border border-gray-300 py-1.5 px-2 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {SEVERITIES.map((sev) => (
              <option key={sev.value} value={sev.value}>
                {sev.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 cursor-pointer pb-2 text-xs font-medium text-gray-700 select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => onUnreadOnlyToggle(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <span>Show unread only</span>
          </label>
        </div>
      </div>
    </div>
  );
}
