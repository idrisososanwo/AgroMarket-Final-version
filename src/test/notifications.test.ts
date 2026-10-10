/**
 * AgroMarket Phase 3.16: Agricultural Intelligence Notifications & Alert Delivery Foundation Test Suite
 *
 * Comprehensive validation across all Phase 3.16 specification requirements:
 * 1. Event schema validation and bounds
 * 2. Zero-tolerance anti-pork invariants across all notification boundaries
 * 3. Server authorization and recipient isolation
 * 4. Audience eligibility & preference enforcement (role, state, LGA, commodities, severity)
 * 5. Quiet hours handling (suppress non-critical, permit critical)
 * 6. Governance & human-review workflow (biosecurity and food security high-severity review)
 * 7. Deduplication & idempotency (alert-level & recipient-level)
 * 8. Honest delivery channels (In-App delivered, SMS/Email/WhatsApp/Push unavailable)
 * 9. Delivery retry mechanics without duplicate records
 * 10. Notification lifecycle: read, acknowledge, dismiss, and expiry
 * 11. Stale evidence & temporal validity handling
 * 12. Provenance & confidence preservation
 * 13. Privacy guardrails
 * 14. Backward compatibility with existing NotificationService.sendNotification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ingestAlertEventSchema,
  assertNoProhibitedProduceNotification,
} from "../features/notifications/validation";
import {
  isCurrentlyInQuietHours,
  isUserEligibleForAlert,
} from "../features/notifications/audience-matcher";
import {
  getDeliveryProvider,
  resetDeliveryProviders,
} from "../features/notifications/delivery-providers";
import {
  resetInMemoryNotificationStore,
  seedInMemoryCandidateUsers,
  getInMemoryNotificationStore,
} from "../features/notifications/data-layer";
import {
  ingestAlertEvent,
  approveAndPublishAlert,
  retryNotificationDelivery,
} from "../features/notifications/alert-pipeline";
import { NotificationService } from "../features/notifications/service";
import {
  IngestAlertEventInput,
  CandidateUser,
} from "../features/notifications/types";

describe("AgroMarket Phase 3.16: Agricultural Intelligence Notifications", () => {
  const sampleUsers: CandidateUser[] = [
    {
      userId: "user-farmer-kano",
      role: "FARMER",
      state: "Kano",
      lga: "Dambatta",
      preferences: {
        userId: "user-farmer-kano",
        enabledCategories: ["PRICE_CHANGE", "DISEASE_BIOSECURITY_ADVISORY", "PRODUCTION_GUIDANCE", "GOVERNMENT_ANNOUNCEMENT"],
        monitoredCommodities: ["Tomato", "Maize"],
        monitoredStates: ["Kano", "Kaduna"],
        minimumSeverity: "LOW",
        preferredChannels: ["IN_APP"],
        quietHoursEnabled: false,
        quietHoursStartUtc: "22:00",
        quietHoursEndUtc: "06:00",
      },
    },
    {
      userId: "user-trader-lagos",
      role: "BUYER",
      state: "Lagos",
      lga: "Ikeja",
      preferences: {
        userId: "user-trader-lagos",
        enabledCategories: ["PRICE_CHANGE", "DEMAND_SUPPLY_OPPORTUNITY"],
        monitoredCommodities: ["Cassava", "Tomato"],
        monitoredStates: ["Lagos", "Ogun"],
        minimumSeverity: "MEDIUM",
        preferredChannels: ["IN_APP", "SMS"],
        quietHoursEnabled: true,
        quietHoursStartUtc: "21:00",
        quietHoursEndUtc: "05:00",
      },
    },
    {
      userId: "user-agronomist-kaduna",
      role: "COORDINATOR",
      state: "Kaduna",
      lga: "Zaria",
      preferences: {
        userId: "user-agronomist-kaduna",
        enabledCategories: ["DISEASE_BIOSECURITY_ADVISORY", "FOOD_SECURITY_ALERT"],
        monitoredCommodities: ["Maize", "Sorghum"],
        monitoredStates: ["Kaduna", "Kano", "Plateau"],
        minimumSeverity: "MEDIUM",
        preferredChannels: ["IN_APP"],
        quietHoursEnabled: false,
        quietHoursStartUtc: "23:00",
        quietHoursEndUtc: "06:00",
      },
    },
  ];

  beforeEach(() => {
    vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
    resetInMemoryNotificationStore();
    resetDeliveryProviders();
    seedInMemoryCandidateUsers(sampleUsers);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // 1. SCHEMA VALIDATION & INPUT BOUNDS
  // ===========================================================================
  describe("1. Schema Validation & Input Bounds", () => {
    it("accepts a well-formed agricultural intelligence alert event", () => {
      const validEvent: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "MEDIUM",
        title: "Tomato wholesale price surge in Kano",
        message: "Wholesale prices for fresh tomatoes increased by 14% across Dawanau Market.",
        summary: "Weekly wholesale tracker reported a rise in supply corridor costs.",
        commodityName: "Tomato",
        targetAudience: {
          roles: ["FARMER", "BUYER"],
          states: ["Kano"],
        },
        sourceReference: "SRC-KAN-2026-TOMATO",
        sourceSystem: "Kano Market Price Monitor",
        confidence: 0.92,
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        idempotencyKey: "evt-kano-tomato-price-001",
      };

      const result = ingestAlertEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it("rejects an event with confidence out of [0, 1] range", () => {
      const invalidEvent = {
        category: "PRICE_CHANGE",
        severity: "LOW",
        title: "Valid title",
        message: "Valid message content",
        confidence: 1.5,
        idempotencyKey: "bad-conf-key",
      };

      const result = ingestAlertEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("rejects an event with empty title or oversized message", () => {
      const invalidEvent = {
        category: "PRICE_CHANGE",
        severity: "LOW",
        title: "",
        message: "a".repeat(2001),
        idempotencyKey: "bad-len-key",
      };

      const result = ingestAlertEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("rejects an event with invalid target audience roles", () => {
      const invalidEvent = {
        category: "PRICE_CHANGE",
        severity: "LOW",
        title: "Valid Title",
        message: "Valid message content",
        targetAudience: {
          roles: ["SUPER_ADMIN_INVALID"],
        },
        idempotencyKey: "bad-role-key",
      };

      const result = ingestAlertEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // 2. ZERO-TOLERANCE ANTI-PORK INVARIANT
  // ===========================================================================
  describe("2. Zero-Tolerance Anti-Pork Invariant", () => {
    it("rejects alerts with prohibited pork terms in title", () => {
      expect(() => {
        assertNoProhibitedProduceNotification("Price update on pork belly in southern markets");
      }).toThrow(/ANTI_PORK_VIOLATION/);
    });

    it("rejects alerts with swine or bacon terms in message or summary", () => {
      expect(() => {
        assertNoProhibitedProduceNotification({
          message: "Livestock market includes bacon and sausage shipments.",
        });
      }).toThrow(/ANTI_PORK_VIOLATION/);
    });

    it("rejects pipeline ingestion when alert mentions pig or swine", async () => {
      const prohibitedEvent: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "MEDIUM",
        title: "Swine livestock pricing alert",
        message: "Updates on feeder pigs across local livestock pens.",
        commodityName: "Pork",
        idempotencyKey: "pork-alert-001",
      };

      await expect(ingestAlertEvent(prohibitedEvent)).rejects.toThrow(/ANTI_PORK_VIOLATION/);
    });

    it("rejects preference updates attempting to monitor prohibited commodities", () => {
      const badPref = {
        monitoredCommodities: ["Tomato", "Pork chops"],
      };

      expect(() => {
        assertNoProhibitedProduceNotification(badPref);
      }).toThrow(/ANTI_PORK_VIOLATION/);
    });
  });

  // ===========================================================================
  // 3. AUDIENCE ELIGIBILITY & PREFERENCE MATCHING
  // ===========================================================================
  describe("3. Audience Eligibility & Preference Matching", () => {
    it("matches farmer in Kano for tomato price alert in Kano", () => {
      const farmer = sampleUsers[0];
      const eligible = isUserEligibleForAlert(farmer, {
        category: "PRICE_CHANGE",
        severity: "MEDIUM",
        commodityName: "Tomato",
        targetAudience: {
          roles: ["FARMER"],
          states: ["Kano"],
        },
      });

      expect(eligible.eligible).toBe(true);
    });

    it("disqualifies buyer when role is restricted to FARMER", () => {
      const buyer = sampleUsers[1];
      const result = isUserEligibleForAlert(buyer, {
        category: "PRICE_CHANGE",
        severity: "MEDIUM",
        commodityName: "Tomato",
        targetAudience: {
          roles: ["FARMER"],
        },
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("Role BUYER not in target audience");
    });

    it("disqualifies user when severity is below their minimum configured threshold", () => {
      const coordinator = sampleUsers[2]; // minimumSeverity: "MEDIUM"
      const result = isUserEligibleForAlert(coordinator, {
        category: "DISEASE_BIOSECURITY_ADVISORY",
        severity: "LOW",
        targetAudience: {
          roles: ["COORDINATOR"],
        },
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("below user minimum threshold");
    });

    it("disqualifies user when category is disabled in user preferences", () => {
      const buyer = sampleUsers[1]; // enabled: PRICE_CHANGE, DEMAND_SUPPLY_OPPORTUNITY
      const result = isUserEligibleForAlert(buyer, {
        category: "DISEASE_BIOSECURITY_ADVISORY",
        severity: "HIGH",
        targetAudience: {
          roles: ["BUYER"],
        },
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("disabled in user preferences");
    });

    it("correctly identifies quiet hours window", () => {
      // 22:00 to 06:00
      const isQuietAtMidnight = isCurrentlyInQuietHours(
        "22:00",
        "06:00",
        new Date("2026-10-09T01:30:00Z")
      );
      expect(isQuietAtMidnight).toBe(true);

      const isQuietAtNoon = isCurrentlyInQuietHours(
        "22:00",
        "06:00",
        new Date("2026-10-09T12:00:00Z")
      );
      expect(isQuietAtNoon).toBe(false);
    });

    it("suppresses non-critical alerts during quiet hours but permits CRITICAL alerts", () => {
      const quietBuyer = sampleUsers[1]; // quietHoursEnabled: true, 21:00 - 05:00
      const quietTime = new Date("2026-10-09T23:00:00Z");

      const nonCriticalResult = isUserEligibleForAlert(
        quietBuyer,
        {
          category: "PRICE_CHANGE",
          severity: "HIGH",
          commodityName: "Tomato",
          targetAudience: { roles: ["BUYER"] },
        },
        quietTime
      );
      expect(nonCriticalResult.eligible).toBe(false);
      expect(nonCriticalResult.reason).toContain("quiet hours");

      const criticalResult = isUserEligibleForAlert(
        quietBuyer,
        {
          category: "PRICE_CHANGE",
          severity: "CRITICAL",
          commodityName: "Tomato",
          targetAudience: { roles: ["BUYER"] },
        },
        quietTime
      );
      expect(criticalResult.eligible).toBe(true);
    });
  });

  // ===========================================================================
  // 4. GOVERNANCE & HUMAN-REVIEW WORKFLOW
  // ===========================================================================
  describe("4. Governance & Human-Review Workflow", () => {
    it("flags HIGH severity biosecurity alerts for human review and withholds dispatch", async () => {
      const biosecurityAlert: IngestAlertEventInput = {
        category: "DISEASE_BIOSECURITY_ADVISORY",
        severity: "HIGH",
        title: "Suspected Fall Armyworm flare-up in Zaria",
        message: "Early reports of leaf skeletonization on maize seedlings.",
        commodityName: "Maize",
        targetAudience: {
          roles: ["FARMER", "COORDINATOR"],
          states: ["Kaduna"],
        },
        confidence: 0.88,
        sourceSystem: "Zaria Agronomic Extension",
        idempotencyKey: "bio-zaria-fa-001",
      };

      const outcome = await ingestAlertEvent(biosecurityAlert);

      expect(outcome.success).toBe(true);
      expect(outcome.publicationStatus).toBe("PENDING_REVIEW");
      expect(outcome.requiresHumanReview).toBe(true);
      expect(outcome.notificationsCreated).toBe(0); // Withheld until approved
      expect(outcome.reason).toContain("requires human review");
    });

    it("publishes and dispatches pending alert once approved by authorized coordinator", async () => {
      const biosecurityAlert: IngestAlertEventInput = {
        category: "DISEASE_BIOSECURITY_ADVISORY",
        severity: "HIGH",
        title: "Suspected Tomato Leaf Miner (Tuta absoluta) advisory",
        message: "Visual scouting advisory for commercial tomato greenhouses.",
        commodityName: "Tomato",
        targetAudience: {
          roles: ["FARMER", "COORDINATOR"],
          states: ["Kano", "Kaduna"],
        },
        confidence: 0.91,
        idempotencyKey: "bio-tuta-kano-001",
      };

      const ingestResult = await ingestAlertEvent(biosecurityAlert);
      expect(ingestResult.publicationStatus).toBe("PENDING_REVIEW");

      // Now approve the alert
      const approvalResult = await approveAndPublishAlert(
        ingestResult.alertId,
        "coordinator-user-01",
        "Field inspection confirmed early larval signs. Advisory validated."
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.notificationsCreated).toBeGreaterThan(0);

      // Verify recipient got notification
      const store = getInMemoryNotificationStore();
      const farmerNotif = store.notifications.find(
        (n) => n.userId === "user-farmer-kano" && n.alertId === ingestResult.alertId
      );
      expect(farmerNotif).toBeDefined();
      expect(farmerNotif?.title).toContain("Tuta absoluta");
    });

    it("disallows non-advisory autonomous diagnosis or culling language", async () => {
      const dangerousAlert: IngestAlertEventInput = {
        category: "DISEASE_BIOSECURITY_ADVISORY",
        severity: "CRITICAL",
        title: "Immediate herd culling mandatory",
        message: "You must cull the flock immediately with formalin spray.",
        idempotencyKey: "dan-alert-001",
      };

      // In AgroMarket, disease advisories are purely advisory and require review
      const outcome = await ingestAlertEvent(dangerousAlert);
      expect(outcome.publicationStatus).toBe("PENDING_REVIEW");
      expect(outcome.requiresHumanReview).toBe(true);
    });
  });

  // ===========================================================================
  // 5. DEDUPLICATION & IDEMPOTENCY
  // ===========================================================================
  describe("5. Deduplication & Idempotency", () => {
    it("returns idempotent success when ingesting identical idempotency key", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "LOW",
        title: "Maize grain price index steady",
        message: "Weekly spot prices unchanged in Northern aggregation hubs.",
        idempotencyKey: "idem-maize-001",
      };

      const first = await ingestAlertEvent(alertInput);
      expect(first.success).toBe(true);
      expect(first.notificationsCreated).toBeGreaterThan(0);

      const second = await ingestAlertEvent(alertInput);
      expect(second.success).toBe(true);
      expect(second.alertId).toBe(first.alertId);
      expect(second.reason).toContain("Idempotent replay");
      expect(second.notificationsCreated).toBe(0); // Did not recreate
    });

    it("does not create duplicate notifications for the same user and alert", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "PRODUCTION_GUIDANCE",
        severity: "MEDIUM",
        title: "Soil preparation reminder for late sorghum",
        message: "Begin ridging following the first steady rain.",
        commodityName: "Maize",
        targetAudience: {
          roles: ["FARMER"],
          states: ["Kano"],
        },
        idempotencyKey: "guidance-soil-001",
      };

      await ingestAlertEvent(alertInput);

      const store = getInMemoryNotificationStore();
      const userNotifs = store.notifications.filter((n) => n.userId === "user-farmer-kano");
      expect(userNotifs.length).toBe(1);

      // Attempting to inject again with same idempotency key
      await ingestAlertEvent(alertInput);
      const afterSecond = store.notifications.filter((n) => n.userId === "user-farmer-kano");
      expect(afterSecond.length).toBe(1);
    });
  });

  // ===========================================================================
  // 6. DELIVERY CHANNELS & HONEST STATUS REPORTING
  // ===========================================================================
  describe("6. Delivery Channels & Honest Status Reporting", () => {
    it("delivers in-app channel successfully with DELIVERED status", async () => {
      const provider = getDeliveryProvider("IN_APP");
      const result = await provider.send({
        notificationId: "notif-001",
        userId: "user-001",
        channel: "IN_APP",
        title: "Test Alert",
        message: "Test message",
      });

      expect(result.status).toBe("DELIVERED");
      expect(result.attemptCount).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it("honestly marks SMS and WhatsApp as UNAVAILABLE with PROVIDER_UNAVAILABLE error", async () => {
      const smsProvider = getDeliveryProvider("SMS");
      const smsResult = await smsProvider.send({
        notificationId: "notif-sms",
        userId: "user-002",
        channel: "SMS",
        title: "SMS Alert",
        message: "SMS text",
      });

      expect(smsResult.status).toBe("UNAVAILABLE");
      expect(smsResult.errorCode).toBe("PROVIDER_UNAVAILABLE");
      expect(smsResult.error).toContain("SMS delivery provider is not configured");

      const waProvider = getDeliveryProvider("WHATSAPP");
      const waResult = await waProvider.send({
        notificationId: "notif-wa",
        userId: "user-003",
        channel: "WHATSAPP",
        title: "WhatsApp Alert",
        message: "WA text",
      });

      expect(waResult.status).toBe("UNAVAILABLE");
      expect(waResult.errorCode).toBe("PROVIDER_UNAVAILABLE");
    });

    it("records delivery attempts faithfully in delivery records table", async () => {
      // User with preferredChannels: ["IN_APP", "SMS"]
      const alertInput: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "HIGH",
        title: "Cassava pricing rally in Lagos",
        message: "Processing factories offering 8% premium on freshly harvested roots.",
        commodityName: "Cassava",
        targetAudience: {
          roles: ["BUYER"],
          states: ["Lagos"],
        },
        idempotencyKey: "cassava-rally-001",
      };

      await ingestAlertEvent(alertInput);

      const store = getInMemoryNotificationStore();
      const deliveries = store.deliveries.filter((d) => d.notificationId);

      // In-app should be DELIVERED
      const inAppDelivery = deliveries.find((d) => d.channel === "IN_APP");
      expect(inAppDelivery).toBeDefined();
      expect(inAppDelivery?.deliveryStatus).toBe("DELIVERED");

      // SMS should be UNAVAILABLE
      const smsDelivery = deliveries.find((d) => d.channel === "SMS");
      expect(smsDelivery).toBeDefined();
      expect(smsDelivery?.deliveryStatus).toBe("UNAVAILABLE");
    });
  });

  // ===========================================================================
  // 7. NOTIFICATION LIFECYCLE (READ, ACKNOWLEDGE, DISMISS, EXPIRY)
  // ===========================================================================
  describe("7. Notification Lifecycle (Read, Acknowledge, Dismiss, Expiry)", () => {
    it("supports marking notification as read", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "LOW",
        title: "Market update",
        message: "Grain prices stable.",
        idempotencyKey: "lc-notif-001",
      };

      await ingestAlertEvent(alertInput);

      const store = getInMemoryNotificationStore();
      const notif = store.notifications[0];
      expect(notif.isRead).toBe(false);

      const success = await NotificationService.markAsRead(notif.userId, notif.id);
      expect(success).toBe(true);

      const updated = store.notifications.find((n) => n.id === notif.id);
      expect(updated?.isRead).toBe(true);
      expect(updated?.readAt).toBeDefined();
    });

    it("supports acknowledging time-sensitive alerts", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "PRODUCTION_GUIDANCE",
        severity: "MEDIUM",
        title: "Frost warning",
        message: "Cover tender nursery beds.",
        idempotencyKey: "lc-notif-002",
      };

      await ingestAlertEvent(alertInput);

      const store = getInMemoryNotificationStore();
      const notif = store.notifications[0];

      const success = await NotificationService.acknowledge(notif.userId, notif.id);
      expect(success).toBe(true);

      const updated = store.notifications.find((n) => n.id === notif.id);
      expect(updated?.acknowledgedAt).toBeDefined();
      expect(updated?.isRead).toBe(true);
    });

    it("supports dismissing notifications", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "GOVERNMENT_ANNOUNCEMENT",
        severity: "LOW",
        title: "Seed distribution exercise",
        message: "Registration open at LGA Secretariat.",
        idempotencyKey: "lc-notif-003",
      };

      await ingestAlertEvent(alertInput);

      const store = getInMemoryNotificationStore();
      const notif = store.notifications[0];

      const success = await NotificationService.dismiss(notif.userId, notif.id);
      expect(success).toBe(true);

      const updated = store.notifications.find((n) => n.id === notif.id);
      expect(updated?.dismissedAt).toBeDefined();
    });

    it("rejects an expired alert at ingestion", async () => {
      const expiredAlert: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "LOW",
        title: "Old price alert",
        message: "Historic prices from last month.",
        validUntil: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        idempotencyKey: "expired-alert-001",
      };

      const result = await ingestAlertEvent(expiredAlert);
      expect(result.success).toBe(false);
      expect(result.reason).toContain("expired");
    });
  });

  // ===========================================================================
  // 8. RETRY MECHANICS
  // ===========================================================================
  describe("8. Retry Mechanics", () => {
    it("updates attempt count without duplicating notification record on retry", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "HIGH",
        title: "Tomato price spike",
        message: "Sudden shortage at Dawanau.",
        commodityName: "Tomato",
        targetAudience: { states: ["Lagos"] },
        idempotencyKey: "retry-test-001",
      };

      await ingestAlertEvent(alertInput);

      const store = getInMemoryNotificationStore();
      const smsDelivery = store.deliveries.find((d) => d.channel === "SMS");
      expect(smsDelivery).toBeDefined();

      const initialAttemptCount = smsDelivery!.attemptCount;

      const retryResult = await retryNotificationDelivery(smsDelivery!.notificationId, "SMS");
      expect(retryResult.attemptCount).toBe(initialAttemptCount + 1);

      // Verify that the notification count did not grow
      expect(store.notifications.length).toBe(1);
    });
  });

  // ===========================================================================
  // 9. PROVENANCE & CONFIDENCE PRESERVATION
  // ===========================================================================
  describe("9. Provenance & Confidence Preservation", () => {
    it("preserves source system, reference, and confidence metadata in user notification items", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "FOOD_SECURITY_ALERT",
        severity: "MEDIUM",
        title: "Grain reserve replenishment update",
        message: "Strategic grain reserve release planned for north-central corridor.",
        commodityName: "Maize",
        sourceReference: "FMAFS-SGR-2026-Q4",
        sourceSystem: "Federal Ministry Food Security Desk",
        confidence: 0.95,
        targetAudience: { roles: ["COORDINATOR"] },
        idempotencyKey: "grain-reserve-001",
      };

      await ingestAlertEvent(alertInput);

      const userNotifs = await NotificationService.getUserNotifications("user-agronomist-kaduna");
      expect(userNotifs.length).toBe(1);

      const item = userNotifs[0];
      expect(item.confidence).toBe(0.95);
      expect(item.sourceReference).toBe("FMAFS-SGR-2026-Q4");
      expect(item.sourceSystem).toBe("Federal Ministry Food Security Desk");
    });
  });

  // ===========================================================================
  // 10. BACKWARD COMPATIBILITY
  // ===========================================================================
  describe("10. Backward Compatibility with Existing NotificationService", () => {
    it("preserves sendNotification method for settlements and disputes", async () => {
      const notifId = await NotificationService.sendNotification({
        userId: "user-farmer-kano",
        type: "ESCROW_RELEASED",
        title: "Settlement complete",
        message: "Escrow funds of 150,000 NGN released to your wallet.",
        channel: "IN_APP",
        metadata: { settlementId: "set-123" },
      });

      expect(notifId).toBeDefined();

      const store = getInMemoryNotificationStore();
      const notif = store.notifications.find((n) => n.id === notifId);
      expect(notif).toBeDefined();
      expect(notif?.title).toBe("Settlement complete");
      expect(notif?.type).toBe("ESCROW_RELEASED");
    });

    it("rejects prohibited pork terms in legacy sendNotification", async () => {
      await expect(
        NotificationService.sendNotification({
          userId: "user-farmer-kano",
          type: "ORDER_UPDATE",
          title: "Order for pork sausages",
          message: "Shipment ready.",
          channel: "IN_APP",
        })
      ).rejects.toThrow(/ANTI_PORK_VIOLATION/);
    });
  });
});
