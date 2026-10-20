# AgroMarket Mobile REST API Specification (Phase 2)

## 1. Overview & Architecture

AgroMarket exposes a dedicated, versioned REST API under `/api/v1/` to power the cross-platform native mobile application (Android & iOS built with React Native and Expo). 

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPO REACT NATIVE CLIENT                        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ Direct PostgREST (Anon + JWT)   │ REST Handlers (Bearer JWT)
                    ▼                                ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────┐
│          SUPABASE POSTGREST           │ │    AGROMARKET MOBILE API     │
│  - Browse Listings & Catalogs         │ │        (/api/v1/*)           │
│  - Cart CRUD                          │ │  - User Registration         │
│  - Atomic Order Placement (RPC)       │ │  - Payment Initialization    │
│  - Row Level Security (RLS) Enforced  │ │  - Payment Verification      │
└───────────────────┬───────────────────┘ │  - Scoped Image Uploads      │
                    │                     └──────────────┬───────────────┘
                    │                                    │
                    ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 UNIFIED POSTGRESQL PRODUCTION DATABASE                 │
│              (Preserving All Tables & Historical Orders)               │
└────────────────────────────────────────────────────────────────────────┘
```

### Architectural Principles:
1. **Zero Impact on Website:** The existing Next.js web application continues operating without interruption.
2. **Unified Data Core:** Mobile apps and web use the exact same Supabase database and authorization rules.
3. **Server-Authoritative Trust:** The server never trusts client-supplied amounts, user IDs, or roles.
4. **Dual Authentication:** Supports standard `Authorization: Bearer <supabase_jwt>` headers for native clients while gracefully supporting session cookies when invoked from web components.
5. **Rate Limiting:** Protects sensitive auth, payment, and upload endpoints via in-memory sliding-window rate limiters.

---

## 2. Authentication Strategy for Native Mobile

1. **Client Token Persistence:**
   The Expo client uses `expo-secure-store` to store `access_token` and `refresh_token` in the hardware keystore (Android Keystore / iOS Keychain).
2. **Header Specification:**
   All authenticated mobile API calls include:
   ```http
   Authorization: Bearer <supabase_access_token>
   ```
3. **Server Validation:**
   `/api/v1/*` routes pass the token to Supabase Auth to verify its cryptographic signature and expiration.
4. **Authoritative Role Retrieval:**
   Roles are strictly loaded from `public.user_roles` in PostgreSQL. User-supplied role flags in request payloads are disregarded.

---

## 3. Detailed Endpoint Reference

### 3.1 User Registration
* **Path:** `POST /api/v1/auth/register`
* **Authentication:** Public (rate-limited to 10 requests/min per IP)
* **Purpose:** Onboard new users across any supported role category (`BUYER`, `FARMER`, `BUSINESS`, `SERVICE_PROVIDER`, `EQUIPMENT_OWNER`, `JOB_SEEKER`, `EXPERT`).

#### Request Schema
```json
{
  "fullName": "Alaba Johnson",
  "phone": "08023456789",
  "email": "alaba.johnson@example.ng",
  "password": "StrongPassword123",
  "state": "Oyo",
  "lga": "Ibarapa East",
  "roleType": "FARMER",
  "providerSubtype": null,
  "additionalRoles": ["EQUIPMENT_OWNER"],
  "farmName": "Johnson Integrated Farms",
  "produceTypes": "Cassava Tubers, White Maize",
  "businessName": null,
  "servicesOffered": null,
  "bio": "Experienced cassava grower supplying wholesale markets across the South West."
}
```

#### Validation & Security Rules:
- **Phone:** Must match Nigerian mobile pattern (e.g., `080...`, `070...`, `+234...`) and is normalized to international format.
- **State:** Must be one of the 36 Nigerian States or `FCT - Abuja`.
- **Anti-Self-Promotion:** Attempts to set `roleType: "ADMIN"` or include `"ADMIN"` in `additionalRoles` are rejected with HTTP 403 Forbidden.
- **Universal Buyer Grant:** All registered users automatically receive the `BUYER` role alongside their chosen operational roles.
- **Duplicate Prevention:** Existing emails return HTTP 409 Conflict.

#### Response Example (HTTP 201 Created)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e4b5c7a1-8d2e-4f3a-9c6b-1a2b3c4d5e6f",
      "email": "alaba.johnson@example.ng",
      "fullName": "Alaba Johnson",
      "phone": "+2348023456789",
      "state": "Oyo",
      "lga": "Ibarapa East",
      "roles": ["BUYER", "FARMER", "EQUIPMENT_OWNER"],
      "isOnboarded": true
    },
    "message": "Registration completed successfully."
  }
}
```

---

### 3.2 Current User Profile & Roles
* **Path:** `GET /api/v1/auth/me`
* **Authentication:** Required (`Bearer <token>`)
* **Purpose:** Refresh the mobile app's active session, verification status, and assigned roles.

#### Response Example (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e4b5c7a1-8d2e-4f3a-9c6b-1a2b3c4d5e6f",
      "email": "alaba.johnson@example.ng",
      "fullName": "Alaba Johnson",
      "phone": "+2348023456789",
      "state": "Oyo",
      "lga": "Ibarapa East",
      "roles": ["BUYER", "FARMER", "EQUIPMENT_OWNER"],
      "isVerified": true,
      "isOnboarded": true,
      "createdAt": "2026-02-15T10:30:00Z"
    }
  }
}
```

---

### 3.3 Payment Initialization
* **Path:** `POST /api/v1/payments/initialize`
* **Authentication:** Required (`Bearer <token>`)
* **Rate Limit:** 20 requests/min per user
* **Purpose:** Initializes a secure Paystack checkout attempt for an order in test mode.

#### Request Schema
```json
{
  "orderId": "7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
  "provider": "PAYSTACK",
  "callbackUrl": "agromarket://payment-callback"
}
```

#### Security Safeguards:
- **Authoritative Amount:** The client CANNOT supply an amount. The server loads the order from `public.orders` and derives `total_amount` authoritatively.
- **Ownership Assertion:** Validates that `order.buyer_id === authenticated_user.id`.
- **Status Check:** Order must be in `PENDING` status.
- **Currency Check:** Currency must be `NGN`.
- **Idempotency:** Reuses existing unexpired payment references created within the last 30 minutes for the same order.

#### Response Example (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "paymentId": "f1e2d3c4-b5a6-7890-1234-56789abcdef0",
    "provider": "PAYSTACK",
    "reference": "AGRO-ORD-20260215-3A4B-1771144000-abcd",
    "checkoutUrl": "https://checkout.paystack.com/0123456789abcdef",
    "accessCode": "0123456789abcdef",
    "amount": 35000,
    "currency": "NGN"
  }
}
```

---

### 3.4 Payment Verification
* **Path:** `POST /api/v1/payments/verify`
* **Authentication:** Required (`Bearer <token>`)
* **Rate Limit:** 30 requests/min per user
* **Purpose:** Confirms payment completion with Paystack when the mobile user returns from the checkout screen.

#### Request Schema
```json
{
  "reference": "AGRO-ORD-20260215-3A4B-1771144000-abcd",
  "provider": "PAYSTACK"
}
```

#### Security Safeguards:
- **Server Verification:** Directly queries the Paystack API using `PAYSTACK_SECRET_KEY` on the server. Never trusts frontend status parameters.
- **Buyer Ownership:** Strict server-authoritative ownership. Callers can only verify payments for orders they personally created (`order.buyer_id === user.id`). Administrative dispute investigations remain strictly separated in dedicated administrative dispute tooling.
- **Amount & Currency Reconciliation:** Verifies that Paystack's verified amount matches `order.total_amount` and currency is `NGN`. Mismatches trigger a fraud alert and mark the payment `FAILED`.
- **Idempotency:** Safe to retry repeatedly without duplicate fulfillment.
- **Webhook Complement:** Works hand-in-hand with the Paystack webhook handler at `/api/webhooks/paystack`.

#### Response Example (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "paymentId": "f1e2d3c4-b5a6-7890-1234-56789abcdef0",
    "orderId": "7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
    "status": "SUCCESSFUL",
    "orderStatus": "PAID",
    "amount": 35000,
    "currency": "NGN",
    "reference": "AGRO-ORD-20260215-3A4B-1771144000-abcd",
    "message": "Payment verified and order confirmed successfully."
  }
}
```

---

### 3.5 Secure Produce Image Upload Ticket
* **Path:** `POST /api/v1/upload/produce-image`
* **Authentication:** Required (`Bearer <token>`)
* **Role Requirement:** Requires `FARMER`, `BUSINESS`, or `ADMIN`
* **Rate Limit:** 20 upload tickets/min per user
* **Purpose:** Generates a scoped, presigned upload URL for direct upload to Supabase Storage from the mobile phone camera.

#### Request Schema
```json
{
  "fileName": "fresh-cassava.jpg",
  "fileType": "image/jpeg",
  "fileSize": 2048576,
  "listingId": "c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f"
}
```

#### Security Safeguards:
- **Role Enforcement:** Rejects users with only `BUYER` role (HTTP 403 Forbidden).
- **Format Validation:** Strictly limits MIME types to `image/jpeg`, `image/png`, and `image/webp`. Executables and documents are rejected with HTTP 422.
- **Size Limitation:** Maximum file size is strictly 5 MB.
- **Path Isolation:** Files are stored under `farmers/<authenticated_user_id>/...`. Users cannot access or overwrite images belonging to other farmers.
- **Listing Association:** If `listingId` is supplied, verifies that the authenticated user owns the listing.

#### Response Example (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "bucket": "produce-images",
    "storagePath": "farmers/e4b5c7a1-8d2e-4f3a-9c6b-1a2b3c4d5e6f/c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f/a1b2c3d4-e5f6-7890-abcd-ef0123456789.jpg",
    "signedUploadUrl": "https://<supabase-ref>.supabase.co/storage/v1/object/upload/sign/produce-images/farmers/...token=...",
    "token": "signed-upload-token-...",
    "publicUrl": "https://<supabase-ref>.supabase.co/storage/v1/object/public/produce-images/farmers/...",
    "expiresInSeconds": 900,
    "maxFileSizeBytes": 5242880,
    "allowedMimeType": "image/jpeg"
  }
}
```

---

## 4. Error Response Format

All `/api/v1/*` endpoints return standard JSON error structures with appropriate HTTP status codes:

```json
{
  "success": false,
  "error": "Access denied. Requires one of: FARMER, BUSINESS",
  "code": "FORBIDDEN",
  "details": null
}
```

| HTTP Status | Code | Meaning |
| :--- | :--- | :--- |
| **400** | `BAD_REQUEST` | Malformed JSON or invalid syntax |
| **401** | `UNAUTHORIZED` | Missing, expired, or invalid Bearer token |
| **403** | `FORBIDDEN` | Missing required role or trying to access another user's resource |
| **404** | `NOT_FOUND` | Order, payment, or listing does not exist |
| **409** | `CONFLICT` | Resource already exists (e.g. duplicate email) |
| **422** | `VALIDATION_ERROR` | Request payload failed schema validation (field errors provided) |
| **429** | `RATE_LIMITED` | Too many requests; check `Retry-After` header |
| **500** | `INTERNAL_SERVER_ERROR` | Unexpected server error |

---

## 5. Storage Migration Reference

The additive storage migration file is prepared under:
`supabase/migrations/20261020100000_mobile_storage_buckets.sql`

It declares the `produce-images` bucket and sets up PostgreSQL Row Level Security (RLS) on `storage.objects` restricting writes to `farmers/<auth.uid()>/...`. 
*(Note: Prepared for staging/development testing; not executed against production).*

---

## 6. Environment Variables Used

The mobile API utilizes existing environment variables:
* `NEXT_PUBLIC_SUPABASE_URL` (Supabase API URL)
* `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Publishable client key)
* `SUPABASE_SERVICE_ROLE_KEY` (Server-side privileged operations)
* `PAYSTACK_SECRET_KEY` (Paystack transaction verification)
* `NEXT_PUBLIC_APP_URL` (Base URL for callbacks)

---

## 7. Calling the API from React Native / Expo

```typescript
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// 1. Initialize Supabase Client with SecureStore Persistence
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 2. Calling Protected Mobile API Endpoints
export async function initializeMobilePayment(orderId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please log in.");

  const response = await fetch(`${API_BASE_URL}/api/v1/payments/initialize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      orderId,
      provider: "PAYSTACK",
      callbackUrl: "agromarket://payment-callback",
    }),
  });

  return await response.json();
}
```
