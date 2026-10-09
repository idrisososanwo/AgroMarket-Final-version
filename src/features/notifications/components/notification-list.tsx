"use client";

import React from "react";
import { UserNotificationItem } from "../types";
import { NotificationItem } from "./notification-item";
import { BellOff, AlertCircle } from "lucide-react";

interface NotificationListProps {
  notifications: UserNotificationItem[];
  isLoading: boolean;
  error?: string | null;
  onMarkRead?: (id: string) => void;
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onRetry?: () => void;
}

export function NotificationList({
  notifications,
  isLoading,
  error,
  onMarkRead,
  onAcknowledge,
  onDismiss,
  onRetry,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 border border-gray-200 rounded-lg bg-white animate-pulse"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg text-red-700">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
        <h3 className="text-base font-semibold mb-1">Failed to load notifications</h3>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-50 border border-gray-200 rounded-lg">
        <BellOff className="w-10 h-10 mx-auto mb-3 text-gray-400" />
        <h3 className="text-base font-semibold text-gray-700 mb-1">
          No notifications to display
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          You are all caught up! Agricultural intelligence alerts, market shifts, and farming advisories relevant to you will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((item) => (
        <NotificationItem
          key={item.id}
          item={item}
          onMarkRead={onMarkRead}
          onAcknowledge={onAcknowledge}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
