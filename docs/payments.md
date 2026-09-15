# AgroMarket Payments & Payment Verification Guide (Phase 0.6)

This document provides a comprehensive operational, architectural, and security guide to the **Payments & Payment Verification Foundation** in AgroMarket.

---

## 1. Executive Summary

AgroMarket's Phase 0.6 implements the primary financial settlement layer:
$$\mathbf{BUYER} \longrightarrow \mathbf{CART} \longrightarrow \mathbf{ORDER\ (PENDING)} \longrightarrow \mathbf{PAYMENT} \longrightarrow \mathbf{PAID}$$

Key Architectural Tenets:
1. **Provider-Agnostic Core**: The order and commerce domain is decoupled from payment providers via the `PaymentProvider` interface and `PaymentService`.
2. **Nigerian Fiat Foundation**: Paystack is implemented as the fully verified primary gateway; Flutterwave is provided as an adapter contract. Future providers slot into the same interface. All payments operate in NGN fiat.
3. **Zero Client Trust**: All amounts, currencies, order totals, and payment status updates are strictly derived and enforced server-side.
4. **Cryptographic Webhook Verification**: Inbound webhook requests are cryptographically authenticated via HMAC-SHA512 (Paystack `x-paystack-signature`) using timing-safe comparisons before any processing.
5. **Database-Level Webhook Idempotency**: Webhook events are journaled in `public.payment_webhook_events` with unique constraints on `(provider, event_id)` to ensure repeated webhook deliveries are safely acknowledged without duplicate state changes.
6. **No Fake Payments**: Orders only transition to `PAID` upon verified server-to-server confirmation or authenticated webhook processing.

---

## 2. Provider Abstraction Architecture

The payment architecture separates the core order domain from third-party gateway nuances:

```
                  ┌─────────────────────────────────┐
                  │          Order Domain           │
                  │ (Orders, Order Items, Checkout) │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │         Payment Service         │
                  │ (Idempotency, Amount/Currency   │
                  │  Validation, Audit Logging)     │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │    PaymentProvider Interface    │
                  │ (initialize, verify, webhook)   │
                  └───────┬─────────────────┬───────┘
                          │                 │
              ┌───────────▼────────┐   ┌────▼────────────────┐
              │  PaystackProvider  │   │ FlutterwaveProvider │
              │ (Kobo <-> NGN,     │   │ (Direct NGN,        │
              │  HMAC-SHA512)      │   │  verif-hash)        │
              └────────────────────┘   └─────────────────────┘
```

### 2.1 Interface Definition (`PaymentProvider`)
- `initializePayment(params: ProviderInitializeParams): Promise<ProviderInitializeResult>`
- `verifyPayment(reference: string): Promise<ProviderVerifyResult>`
- `verifyWebhookSignature(rawBody: string, signature: string): boolean`
- `parseWebhookEvent(rawBody: string): ProviderWebhookParsedEvent | null`

---

## 3. Paystack Integration

### 3.1 Currency & Kobo Normalization
- Paystack transactions operate in **Kobo** ($1\text{ NGN} = 100\text{ Kobo}$).
- `PaystackProvider` automatically converts authoritative NGN order amounts to Kobo during initialization:
  $$\text{amountInKobo} = \text{Math.round}(\text{amount} \times 100)$$
- Upon verification or webhook receipt, Kobo amounts are normalized back to Nigerian Naira:
  $$\text{amountInNaira} = \text{amountInKobo} / 100$$

### 3.2 Webhook Security
- Paystack sends webhooks with header `x-paystack-signature`.
- AgroMarket computes the HMAC-SHA512 digest of the raw request body using `PAYSTACK_SECRET_KEY` (or `PAYSTACK_WEBHOOK_SECRET`).
- The signature is validated using `crypto.timingSafeEqual` to prevent timing attacks.
- Invalid signatures immediately return `401 Unauthorized` and log a security audit event.

---

## 4. Payment Lifecycle & Order State Machine

```
              ┌─────────────────────────┐
              │     Order: PENDING      │
              └────────────┬────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  ┌──────────────────────┐    ┌──────────────────────┐
  │ Payment: INITIALIZED │    │   Order: CANCELLED   │
  └──────────┬───────────┘    └──────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
┌───────────┐ ┌───────────┐
│Payment:   │ │Payment:   │
│SUCCESSFUL │ │  FAILED   │
└─────┬─────┘ └─────┬─────┘
      │             │
      │             └──► Order remains PENDING
      │                  (Buyer can retry checkout)
      ▼
┌───────────┐
│  Order:   │
│   PAID    │
└─────┬─────┘
      │
      ▼
┌───────────┐
│PROCESSING │
└─────┬─────┘
      │
      ▼
┌───────────┐
│ COMPLETED │
└───────────┘
```

### 4.1 Order ➔ PAID Transition
- Payment success is the **only** trigger that transitions an order from `PENDING` to `PAID`.
- Client browsers and non-admin users have zero permissions to directly set `status = 'PAID'`.

### 4.2 Handling Failed & Abandoned Payments
- A failed payment attempt updates `payments.status` to `FAILED`.
- The order remains in `PENDING` status. Reserved inventory is preserved, allowing the buyer to retry payment with a different card or gateway.
- Orders are only cancelled if the buyer explicitly cancels before payment, which automatically restores reserved inventory.

---

## 5. Idempotency Strategy

### 5.1 Initialization Idempotency
- When `initializePaymentAction` is invoked, `PaymentService` queries for an active, unexpired pending payment attempt (`status IN ('INITIALIZED', 'INITIATED', 'PENDING')`) created within the last 30 minutes for the same order and provider.
- If found, it returns the existing checkout URL and reference rather than generating duplicate gateway sessions.

### 5.2 Webhook Idempotency
- Incoming events are journaled in `public.payment_webhook_events`.
- A database-level unique constraint `(provider, event_id)` rejects duplicate webhook deliveries (PostgreSQL error code `23505`), responding with `200 OK` ("Event already processed") without modifying order status or inventory.

---

## 6. Server-Side Verification Rules

When verifying transactions (via callback or webhook):
1. **Amount Match**: The provider verified amount must match `order.total_amount` within ₦0.01 tolerance:
   $$|\text{order.total\_amount} - \text{providerResult.amount}| \le 0.01$$
   If amounts differ, the payment is marked `FAILED` with a fraud alert in metadata and the order is NOT marked `PAID`.
2. **Currency Match**: Must strictly match `'NGN'`.
3. **Reference Match**: Must match an existing AgroMarket payment record.

---

## 7. Environment Variables

| Variable | Required | Scope | Description |
| :--- | :--- | :--- | :--- |
| `PAYSTACK_SECRET_KEY` | Production | Server-only | Paystack secret key (`sk_live_...` or `sk_test_...`) |
| `PAYSTACK_PUBLIC_KEY` | Optional | Client/Server | Paystack public key (`pk_live_...` or `pk_test_...`) |
| `PAYSTACK_WEBHOOK_SECRET` | Optional | Server-only | Secret used for HMAC-SHA512 webhook signature verification (defaults to secret key) |
| `FLUTTERWAVE_SECRET_KEY` | Production | Server-only | Flutterwave secret key (`FLWSECK-...`) |
| `FLUTTERWAVE_PUBLIC_KEY` | Optional | Client/Server | Flutterwave public key (`FLWPUBK-...`) |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Optional | Server-only | Secret hash for verifying `verif-hash` header |

---

## 8. Implemented Routes

| Route | Access Guard | Description |
| :--- | :--- | :--- |
| `/account/orders/[orderId]/pay` | Authenticated Buyer | Payment selection page with Paystack (recommended) and Flutterwave options, order breakdown, and secure redirection. |
| `/account/orders/[orderId]/payment/callback` | Authenticated Buyer | Gateway return destination; performs cryptographic server verification before redirecting to order receipt. |
| `/api/webhooks/paystack` | Public (Signed) | Webhook receiver verifying `x-paystack-signature` via HMAC-SHA512. |
| `/api/webhooks/flutterwave` | Public (Signed) | Webhook receiver verifying `verif-hash`. |
