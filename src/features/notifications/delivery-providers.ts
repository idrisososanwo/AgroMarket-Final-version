/**
 * AgroMarket Phase 3.16: Multi-Channel Delivery Provider Abstraction
 * Enforces honest delivery reporting without faking external transmissions.
 */

import { DeliveryChannel, DeliveryStatus } from "./types";
import { NOTIFICATION_ERROR_CODES } from "./constants";

export interface DeliverySendParams {
  notificationId: string;
  userId: string;
  channel: DeliveryChannel;
  title: string;
  body?: string;
  message?: string;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DeliveryResult {
  status: DeliveryStatus;
  attemptCount: number;
  deliveredAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  error?: string | null;
  providerResponse?: Record<string, unknown>;
}

export interface NotificationDeliveryProvider {
  readonly channel: DeliveryChannel;
  isAvailable(): boolean;
  send(params: DeliverySendParams): Promise<DeliveryResult>;
}

// -----------------------------------------------------------------------------
// 1. IN-APP DELIVERY PROVIDER (Natively Available)
// -----------------------------------------------------------------------------

export class InAppDeliveryProvider implements NotificationDeliveryProvider {
  readonly channel: DeliveryChannel = "IN_APP";

  isAvailable(): boolean {
    return true;
  }

  async send(params: DeliverySendParams): Promise<DeliveryResult> {
    // In-app notifications are delivered directly upon insertion into public.notifications
    return {
      status: "DELIVERED",
      attemptCount: 1,
      deliveredAt: new Date().toISOString(),
      providerResponse: {
        channel: "IN_APP",
        notificationId: params.notificationId,
        recipientUserId: params.userId,
      },
    };
  }
}

// -----------------------------------------------------------------------------
// 2. UNAVAILABLE EXTERNAL CHANNEL PROVIDER (Honest Fallback)
// -----------------------------------------------------------------------------

export class UnavailableDeliveryProvider implements NotificationDeliveryProvider {
  constructor(readonly channel: DeliveryChannel) {}

  isAvailable(): boolean {
    return false;
  }

  async send(): Promise<DeliveryResult> {
    const msg = `${this.channel} delivery provider is not configured in this environment. No fake external transmission performed.`;
    return {
      status: "UNAVAILABLE",
      attemptCount: 1,
      deliveredAt: null,
      errorCode: NOTIFICATION_ERROR_CODES.PROVIDER_UNAVAILABLE,
      errorMessage: msg,
      error: msg,
      providerResponse: {
        channel: this.channel,
        configured: false,
      },
    };
  }
}

// -----------------------------------------------------------------------------
// 3. PROVIDER REGISTRY & FACTORY
// -----------------------------------------------------------------------------

const providerOverrides = new Map<DeliveryChannel, NotificationDeliveryProvider>();

export function getDeliveryProvider(channel: DeliveryChannel): NotificationDeliveryProvider {
  if (providerOverrides.has(channel)) {
    return providerOverrides.get(channel)!;
  }

  if (channel === "IN_APP") {
    return new InAppDeliveryProvider();
  }

  // All external channels remain explicitly unavailable unless real credentials configured
  return new UnavailableDeliveryProvider(channel);
}

export function setDeliveryProviderOverride(
  channel: DeliveryChannel,
  provider: NotificationDeliveryProvider
): void {
  providerOverrides.set(channel, provider);
}

export function resetDeliveryProviderOverrides(): void {
  providerOverrides.clear();
}

export const resetDeliveryProviders = resetDeliveryProviderOverrides;
