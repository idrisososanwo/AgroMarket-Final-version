"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { UserNotificationItem, NotificationCategory, AlertSeverity } from "../types";
import { NotificationFilters } from "./notification-filters";
import { NotificationList } from "./notification-list";
import {
  getUserNotificationsAction,
  getUnreadNotificationCountAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  acknowledgeNotificationAction,
  dismissNotificationAction,
} from "../actions";
import { Bell, Sparkles } from "lucide-react";

export function NotificationCenterContainer() {
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [listResult, countResult] = await Promise.all([
        getUserNotificationsAction({
          category: selectedCategory === "ALL" ? undefined : (selectedCategory as NotificationCategory),
          severity: selectedSeverity === "ALL" ? undefined : (selectedSeverity as AlertSeverity),
          isRead: unreadOnly ? false : undefined,
          limit: 50,
        }),
        getUnreadNotificationCountAction(),
      ]);

      if (listResult.success && listResult.data) {
        setNotifications(listResult.data);
      } else {
        setError(listResult.error || "Failed to load notifications");
      }

      if (countResult.success && typeof countResult.data === "number") {
        setUnreadCount(countResult.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedSeverity, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      const res = await markNotificationReadAction(id);
      if (!res.success) {
        // Revert on failure
        fetchNotifications();
      }
    });
  };

  const handleAcknowledge = (id: string) => {
    startTransition(async () => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                isRead: true,
                readAt: n.readAt || new Date().toISOString(),
                acknowledgedAt: new Date().toISOString(),
              }
            : n
        )
      );

      const res = await acknowledgeNotificationAction(id);
      if (!res.success) {
        fetchNotifications();
      }
    });
  };

  const handleDismiss = (id: string) => {
    startTransition(async () => {
      // Optimistic update (remove or mark dismissed)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                isRead: true,
                dismissedAt: new Date().toISOString(),
              }
            : n
        )
      );

      const res = await dismissNotificationAction(id);
      if (!res.success) {
        fetchNotifications();
      }
    });
  };

  const handleMarkAllAsRead = () => {
    startTransition(async () => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);

      const res = await markAllNotificationsReadAction();
      if (!res.success) {
        fetchNotifications();
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Agricultural Intelligence Notifications
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Advisories, commodity price shifts, farming guidance, and logistics alerts grounded in validated intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full w-fit">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Grounded & Human-Governed</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <NotificationFilters
        selectedCategory={selectedCategory}
        selectedSeverity={selectedSeverity}
        unreadOnly={unreadOnly}
        unreadCount={unreadCount}
        onCategoryChange={setSelectedCategory}
        onSeverityChange={setSelectedSeverity}
        onUnreadOnlyToggle={setUnreadOnly}
        onMarkAllAsRead={handleMarkAllAsRead}
        onRefresh={fetchNotifications}
        isRefreshing={isLoading || isPending}
      />

      {/* List */}
      <NotificationList
        notifications={notifications}
        isLoading={isLoading}
        error={error}
        onMarkRead={handleMarkRead}
        onAcknowledge={handleAcknowledge}
        onDismiss={handleDismiss}
        onRetry={fetchNotifications}
      />
    </div>
  );
}
