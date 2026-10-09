"use client";

import React from "react";
import Link from "next/link";
import { UserNotificationItem, AlertSeverity } from "../types";
import {
  Bell,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Sprout,
  Truck,
  CheckCircle2,
  ExternalLink,
  Check,
  X,
  Clock,
  Archive,
} from "lucide-react";

interface NotificationItemProps {
  item: UserNotificationItem;
  onMarkRead?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function NotificationItem({
  item,
  onMarkRead,
  onAcknowledge,
  onDismiss,
}: NotificationItemProps) {
  const getCategoryIcon = (type: string) => {
    switch (type) {
      case "PRICE_CHANGE":
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case "DISEASE_BIOSECURITY_ADVISORY":
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case "FOOD_SECURITY_ALERT":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "PRODUCTION_GUIDANCE":
        return <Sprout className="w-4 h-4 text-green-600" />;
      case "FULFILMENT_LOGISTICS_UPDATE":
        return <Truck className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-800 border border-red-300">
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-800 border border-orange-300">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            LOW
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 border border-gray-200">
            INFO
          </span>
        );
    }
  };

  const isExpired = item.expiresAt && new Date(item.expiresAt).getTime() < Date.now();
  const isHistorical = item.metadata?.isHistorical === true;

  return (
    <div
      className={`border rounded-lg p-4 transition-all duration-150 ${
        item.isRead
          ? "bg-white border-gray-200 opacity-90"
          : "bg-emerald-50/30 border-emerald-200 shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Icon & Header */}
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 mt-0.5 shrink-0">
            {getCategoryIcon(item.type)}
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {item.type.replace(/_/g, " ")}
              </span>
              {getSeverityBadge(item.severity)}

              {isExpired && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] bg-gray-100 text-gray-600 border border-gray-300">
                  <Clock className="w-3 h-3" />
                  Expired
                </span>
              )}

              {isHistorical && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                  <Archive className="w-3 h-3" />
                  Historical Record
                </span>
              )}

              {!item.isRead && (
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" title="Unread" />
              )}
            </div>

            <h4 className="text-sm font-bold text-gray-900 leading-snug">{item.title}</h4>

            <p className="text-xs text-gray-700 leading-relaxed font-sans">{item.body}</p>

            {/* Provenance & Source Metadata */}
            {item.metadata && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-500">
                {item.metadata.sourceProvenance != null && (
                  <span>
                    Provenance: <strong className="text-gray-700">{String(item.metadata.sourceProvenance)}</strong>
                  </span>
                )}
                {item.metadata.confidenceLevel != null && (
                  <span>
                    Confidence: <strong className="text-gray-700">{String(item.metadata.confidenceLevel)}</strong>
                  </span>
                )}
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {!item.isRead && onMarkRead && (
            <button
              onClick={() => onMarkRead(item.id)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-emerald-700 transition"
              title="Mark as read"
            >
              <Check className="w-4 h-4" />
            </button>
          )}

          {!item.acknowledgedAt && onAcknowledge && (
            <button
              onClick={() => onAcknowledge(item.id)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-700 transition"
              title="Acknowledge alert"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}

          {onDismiss && (
            <button
              onClick={() => onDismiss(item.id)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-700 transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Target Action Link */}
      {item.actionUrl && (
        <div className="mt-3 pt-2.5 border-t border-gray-100/80 flex items-center justify-between text-xs">
          <Link
            href={item.actionUrl}
            className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <span>View Context & Action</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          {item.acknowledgedAt && (
            <span className="text-gray-400 text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Acknowledged
            </span>
          )}
        </div>
      )}
    </div>
  );
}
