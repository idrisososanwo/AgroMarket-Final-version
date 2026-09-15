# AgroMarket Logistics & Delivery Coordination Guide (Phase 0.7)

This document provides a comprehensive operational, architectural, and security guide to the **Logistics & Delivery Coordination Layer** in AgroMarket.

---

## 1. Executive Summary

AgroMarket is an **asset-light agricultural marketplace and digital coordination platform**.
AgroMarket does NOT own:
- Warehouses
- Cold-storage facilities
- Fulfilment centers
- Delivery fleets, trucks, or motorcycles

Instead, AgroMarket serves as the digital orchestration engine connecting buyers, farmers, and verified third-party logistics providers (3PLs) across Nigeria.

The logistical lifecycle extends the commerce pipeline:
$$\mathbf{PAID\ ORDER} \longrightarrow \mathbf{DELIVERY\ CREATION} \longrightarrow \mathbf{LOGISTICS\ ASSIGNMENT} \longrightarrow \mathbf{PICKUP} \longrightarrow \mathbf{IN\ TRANSIT} \longrightarrow \mathbf{DELIVERED}$$

---

## 2. Multi-Seller Consignment Partitioning

In Nigerian agricultural commerce, a single consumer or agribusiness order frequently contains diverse produce originating from multiple independent farms across different states.

**Example Order #AGRO-20260912-1094:**
- Seller A (Kano State): 50 Bags of White Maize
- Seller B (Plateau State): 40 Crates of Roma Tomatoes
- Seller C (Benue State): 100 Tubers of Yam

### Architectural Rule:
$$\text{One Order} \neq \text{One Seller} \neq \text{One Pickup}$$

The system partitions this order into **3 distinct delivery consignments** within `public.deliveries`, each with:
- Its own farm pickup location (State, LGA, Address)
- Destination: Buyer handover destination
- Individual AgroMarket tracking number (`AM-DLV-YYYYMMDD-XXXXXX`)
- Assigned carrier provider
- Independent transit state machine

---

## 3. Delivery State Machine

Consignments follow a strictly governed server-side lifecycle:

```
                  ┌──────────────┐
                  │   PENDING    │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │    QUOTED    │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │   ASSIGNED   │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │PICKUP_SCHED. │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │  PICKED_UP   │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │  IN_TRANSIT  │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │OUT_FOR_DELIV.│
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │  DELIVERED   │ (Terminal Success)
                  └──────────────┘

Failure & Cancellation Paths:
- PENDING, QUOTED, ASSIGNED, PICKUP_SCHEDULED ➔ CANCELLED (Terminal)
- PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY ➔ DELIVERY_FAILED
- DELIVERY_FAILED ➔ ASSIGNED | PICKUP_SCHEDULED | CANCELLED
```

### Invariants:
1. **Order Precondition**: Consignments can **never** be created for unpaid (`PENDING`) or cancelled orders. Only verified `PAID` or `PROCESSING` orders are eligible.
2. **Cancellation Restriction**: Cancellation is strictly prohibited once goods have been physically collected from the farm (`PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`).
3. **Order Lifecycle Integration**:
   - Order creation initializes consignments in `PENDING` or `QUOTED`.
   - When consignments are created for a `PAID` order, the parent order transitions to `PROCESSING`.
   - When some (but not all) consignments reach `DELIVERED`, the master order transitions to `PARTIALLY_FULFILLED`.
   - When all consignments reach `DELIVERED`, the parent order transitions strictly from `PROCESSING` or `PARTIALLY_FULFILLED` to `COMPLETED`. Direct illegal jumps (`PAID ➔ COMPLETED` or `CANCELLED ➔ COMPLETED`) are strictly prevented.

---

## 4. Provider Abstraction Architecture & Provisional Pricing

Carrier interactions are decoupled from the order domain via `LogisticsProviderAdapter`:

```
Order Domain
     ↓
LogisticsService
     ↓
LogisticsProviderAdapter
     ↓
┌──────────────────────────────────────────────┐
│ Standard Nigerian 3PL Adapter (Provisional)  │
│ Future GIG Logistics Integration             │
│ Future Kobo360 / TradeDepot Integration      │
└──────────────────────────────────────────────┘
```

> [!NOTE]
> **PROVISIONAL DEVELOPMENT / SIMULATION PRICING**
> The `StandardFleetLogisticsAdapter` implements heuristic zone-based transit pricing (e.g. ₦2,500 intra-state base, ₦7,500 regional base, ₦14,500 cross-corridor base) exclusively for development, demonstration, and automated integration testing.
> - AgroMarket owns **zero physical fleets** and does NOT operate as a transport company.
> - These numbers are **not legally binding commercial tariffs** or real-world contractual quotes.
> - In production environments, licensed Nigerian 3PL carriers with live API rate calculations and contracted SLA terms will replace this provisional adapter.

### Adapter Methods:
- `getQuote(params)`: Returns zone-based quote in NGN (intra-state vs. long-haul interstate corridor), estimated days, provisional flag, and expiration timestamp.
- `createShipment(params)`: Registers shipment with external carrier and returns external reference.
- `cancelShipment(ref, reason)`: Cancels dispatch before pickup.

---

## 5. Append-Only Event Ledger (`public.delivery_events`)

`public.delivery_events` is an immutable, append-only audit trail:
- **Database Mutation Prevention**: Enforced via a PostgreSQL trigger (`trg_prevent_delivery_events_mutation`) that raises a fatal exception on any attempted `UPDATE` or `DELETE` statement.
- **Privilege Revocation**: `UPDATE`, `DELETE`, and direct client `INSERT` are revoked from `anon` and `authenticated` roles.
- **Server-Authoritative Insertion**: Only trusted server workflows using the service role can append waypoints and checkpoints.

Recorded event attributes:
- `delivery_id`: Target consignment
- `status`: New delivery status
- `location_name`: Checkpoint location (e.g., *Ore Tollgate, Ondo State*)
- `description`: Detailed waypoint notes
- `actor_id`: User/carrier representative triggering the event
- `occurred_at`: ISO timestamp

---

## 6. Access Control & Authorization Boundaries

### Role & Carrier Account Distinction:
AgroMarket strictly distinguishes between:
1. **General `SERVICE_PROVIDER` Role**: Marketplace users offering agronomy, tractor repair, or farm extension services. They have **zero** authority to assign arbitrary logistics carriers to orders.
2. **Authorized Logistics Carrier Account**: A user profile linked to a verified record in `public.logistics_providers` (`profile_id = user.id AND is_verified = true AND is_active = true`). They are authorized only to claim unassigned consignments matching their registered coverage routes for their *own* fleet.
3. **Platform Administrator (`ADMIN`)**: Authorized to manage carrier registries and assign any verified provider to consignments.

### RLS Policies:
- **Buyer**: Can view all delivery consignments and event ledgers associated with their own orders (`order.buyer_id = auth.uid()`). Cannot alter delivery statuses, fees, or carrier assignments.
- **Seller**: Can view delivery consignments containing their own farm produce (`seller_id = auth.uid()`). Cannot view other sellers' deliveries from the same master order.
- **Logistics Carrier**: Can view deliveries assigned to their carrier organization (`logistics_providers.profile_id = auth.uid()`). Can update permitted transit checkpoints and statuses.
- **Admin**: Can view all consignments, manage 3PL providers, and assign carriers to consignments.

---

## 7. Implemented Routes

| Route | Access Guard | Description |
| :--- | :--- | :--- |
| `/account/orders/[orderId]/delivery` | Authenticated Buyer / Seller / Admin | Multi-consignment delivery tracking page with interactive visual stage stepper, route cards, provisional pricing notice, and chronological event ledger. |
| `/logistics/deliveries` | Carrier / Admin | Logistics carrier dashboard showing all assigned dispatches. |
| `/logistics/deliveries/[deliveryId]` | Carrier / Admin | Consignment dispatch control center with interactive status advancement buttons (`Schedule Pickup`, `Confirm Picked Up`, `Depart for Transit`, `Confirm Delivery`, `Report Issue`). |
