# AgroMarket Phase 2.0: Agricultural Ecosystem & Value-Chain Coordination

This document details the architectural foundation, domain models, security boundaries, and coordination layer established in **Phase 2.0** of AgroMarket.

AgroMarket is a Nigerian-first agricultural ecosystem and digital coordination layer connecting:
**Production → Aggregation → Processing → Packaging → Logistics → Markets → Consumers / Businesses**.

---

## 1. Ecosystem Architecture

AgroMarket operates as an asset-light, multi-actor coordination layer:

```
                    AGROMARKET
                         |
              AGRICULTURAL ECOSYSTEM
                         |
       +-----------------+------------------+
       |                 |                  |
  PRODUCTION          SERVICES           MARKETS
       |                 |                  |
       +-----------------+------------------+
                         |
                VALUE-CHAIN COORDINATION
                         |
       +-----------------+------------------+
       |                 |                  |
  AGGREGATION        PROCESSING          DEMAND
       |                 |                  |
       +-----------------+------------------+
                         |
              PRODUCT / OUTPUT FLOWS
                         |
                PACKAGING + LOGISTICS
                         |
                       BUYERS
```

---

## 2. Core Domain 1 — Ecosystem Actor Model

### Principles:
- **No Role Explosion**: An actor type is **not** forced into a separate authentication role.
- **Multi-Capability Representation**: A single verified agribusiness or user profile can operate simultaneously across multiple functions (e.g., a company serving as both a `PROCESSOR` and a `COLD_CHAIN_PROVIDER`).
- **Reuse of Core Identity**: Extends `public.profiles` and `public.business_profiles`.

### Actor Types:
- `FARMER`
- `AGGREGATOR`
- `PROCESSOR`
- `PACKAGING_PROVIDER`
- `LOGISTICS_PROVIDER`
- `COLD_CHAIN_PROVIDER`
- `VETERINARY_PROVIDER`
- `INPUT_SUPPLIER`
- `EQUIPMENT_PROVIDER`
- `WHOLESALER`
- `RETAILER`
- `RESTAURANT`
- `HOTEL`
- `FOOD_PROCESSOR`
- `INSTITUTIONAL_BUYER`
- `COOPERATIVE`
- `MARKET_OPERATOR`

---

## 3. Core Domain 2 — Production Units

A reusable abstraction representing where agricultural primary production occurs:
- `unit_type`: `FARM`, `RANCH`, `POULTRY_FARM`, `FISH_FARM`, `DAIRY_OPERATION`, `GREENHOUSE`, `APIARY`, `SNAIL_FARM`, `OTHER_PERMITTED_PRODUCTION_UNIT`
- `location`: Scoped strictly to Nigerian state and LGA. Exact private GPS farm coordinates are never publicly exposed.
- `commodities`: Supported species or crops (strictly zero pork/swine).
- `capacity_value` and `capacity_unit`: Operational capacity metrics (e.g., birds, hectares, ponds, liters/day).

---

## 4. Core Domain 3 — Production Outputs

### Separation Principle:
**Animal != Final Product.** A crop harvest batch != packaged retail produce.
- `output_type`: `RAW_HARVEST`, `LIVE_ANIMALS`, `CARCASS`, `RAW_MILK`, `RAW_TUBERS`, `GRAIN`, `EGGS`, `HONEY`, `FISH_CATCH`, `BYPRODUCT`.
- `batch_number`, `quantity`, `unit`, `harvest_date`, `quality_grade`, and `status`.
- Allows primary outputs to be tracked and pooled before being transformed or portioned for retail sale.

---

## 5. Core Domain 4 — Aggregation

Aggregation pools consolidate supply from dispersed producers into bulk quantities:
- `aggregation_pools`: Title, commodity, target quantity, current quantity, collection center, expected availability date, target buyer or processor, and status (`OPEN`, `AGGREGATING`, `FULFILLED`, `DISPATCHED`, `CANCELLED`, `CLOSED`).
- `aggregation_pool_contributions`: Line commitments linking producers and their production outputs to pools.

---

## 6. Core Domain 5 — Processing Facilities

Lightweight abstraction for third-party facilities offering transformation services:
- `facility_type`: `POULTRY_PROCESSOR`, `ABATTOIR`, `FISH_PROCESSOR`, `DAIRY_PROCESSOR`, `CROP_PROCESSOR`, `GRAIN_MILL`, `FEED_MILL`, `COLD_STORAGE_PROCESSING`, `PACKAGING_FACILITY`.
- `services_offered`: Slaughtering, defeathering, dressing, portioning, milling, blast-freezing, pasteurization, packaging.
- `processing_capacity_value` and `minimum_batch_size`.
- `supported_commodities`: Strictly anti-pork verified.

---

## 7. Core Domain 6 — Processing Events (Input -> Process -> Output)

Tracks physical transformation of agricultural inputs into distinct outputs:
- `process_type`: `SLAUGHTER_AND_DRESS`, `PORTIONING`, `MILLING`, `DRYING`, `FERMENTATION`, `PASTEURIZATION`, `EXTRACTION`, `PACKAGING_PROCESSING`, `CLEANING_AND_GRADING`.
- `input_description` & `input_quantity` (e.g., 1,000 live broilers, 2,000 kg).
- `output_description` & `output_quantity` (e.g., dressed whole chickens, 1,560 kg).
- `yield_percentage`: Recorded or computed conversion ratio (e.g., 78.0%).
- `resulting_output_id` or `resulting_listing_id`: Direct relational bridge to downstream listings or secondary outputs.

---

## 8. Core Domain 7 — Value-Chain Events Ledger

Append-only historical event stream providing verifiable transparency:
- `event_type`: `PRODUCED`, `HARVESTED`, `AGGREGATED`, `TRANSPORTED`, `RECEIVED`, `PROCESSED`, `INSPECTED`, `PACKAGED`, `STORED`, `DISPATCHED`, `DELIVERED`.
- `entity_type`: `PRODUCTION_OUTPUT`, `AGGREGATION_POOL`, `PROCESSING_EVENT`, `B2B_DEMAND`, `MARKETPLACE_LISTING`.
- **Database Trigger Immutability**: Protected by `prevent_value_chain_event_mutation()` PostgreSQL trigger forbidding `UPDATE` and non-admin `DELETE`.

---

## 9. Core Domain 8 — Structured B2B Demand

Enables commercial buyers (restaurants, hotels, supermarket chains, industrial processors) to register structured demand:
- `title`, `commodity_or_product`, `quantity`, `unit`.
- `desired_delivery_date` and `frequency` (`ONE_TIME`, `DAILY`, `WEEKLY`, `BI_WEEKLY`, `MONTHLY`, `QUARTERLY`).
- `specifications`: JSON specifications (weight ranges, packaging standards, blast-freezing requirements).
- `target_price_per_unit`: Budget targets in NGN fiat.

---

## 10. Core Domain 9 — Supply / Demand Matching Foundation

Deterministic multi-actor coordination matching algorithm (`src/features/ecosystem/matching.ts`):
- **Candidate Supply Matching**: Evaluates commodity alignment, volume sufficiency ratio, and availability timeline.
- **Geopolitical Corridors**: Evaluates proximity tiers (`SAME_STATE`, `REGIONAL_CORRIDOR`, `NATIONAL`) across Nigerian zones (South-West, South-South, South-East, North-Central, North-West, North-East).
- **Processing Capacity**: Matches specialized abattoirs/mills able to dress or mill the requested commodity.
- **Logistics Capability**: Matches vetted third-party carriers with appropriate vehicle types (e.g., refrigerated reefers for meat/dairy/perishables).
- **Composite Score & Summary**: Transparent 0-100 score with plain-English explanation breakdown.

---

## 11. Core Domain 10 — Product Transformation & Value-Chain Graph

Establishes the link between primary production and commercial listings:
`production_outputs` → `processing_events` → `resulting_outputs` → `listings`.
Provides canonical, multi-stage value chain templates for:
- Broiler Poultry Value Chain
- Cattle & Beef Value Chain
- African Catfish Aquaculture Value Chain
- Cassava & Garri Value Chain
- Fresh Milk & Dairy Value Chain

---

## 12. Security & RLS Boundaries

1. **Mandatory Row Level Security (RLS)**: Enabled across all 8 ecosystem tables (`ecosystem_actors`, `production_units`, `production_outputs`, `aggregation_pools`, `aggregation_pool_contributions`, `processing_facilities`, `processing_events`, `value_chain_events`, `b2b_demands`).
2. **Server-Authoritative Identity**: Every create and update action derives `user_id`, `owner_id`, `producer_id`, `aggregator_id`, `operator_id`, or `buyer_id` exclusively from server session auth (`auth.uid()`).
3. **Location Privacy**: Locations are strictly scoped to Nigerian state and LGA. Sensitive exact GPS farm coordinates are never collected or exposed.
4. **Append-Only Immutability**: Historical value-chain events cannot be modified by clients.
5. **Audit Logging**: All important ecosystem lifecycle mutations invoke `recordAuditLog()` to maintain an immutable audit trail.

---

## 13. Anti-Pork Rules

In strict adherence to platform standards:
- All porcine terms (`pork`, `pig`, `swine`, `hog`, `boar`, `bacon`, `ham`, `lard`, `piglet`) are prohibited.
- Enforced at the database engine via PostgreSQL regex `CHECK` constraints on every text field across all 8 ecosystem tables.
- Enforced at the application layer via Zod schema refinements and `containsProhibitedProduce()` validation.

---

## 14. Asset-Light Principles

AgroMarket owns:
- ZERO farms or ranches.
- ZERO abattoirs or slaughterhouses.
- ZERO grain mills or processing factories.
- ZERO warehouses or collection depots.
- ZERO delivery trucks or cold rooms.

AgroMarket acts strictly as a digital orchestration and coordination layer connecting vetted third-party actors.

---

## 15. What Phase 2.0 Intentionally DOES NOT Implement

To preserve architectural focus and avoid premature overbuilding, the following items remain deferred to future phases:
- Automated RFID / ear-tag livestock identification hardware integration.
- Telemetry cold-chain sensor streams (IoT temperature probes).
- Full factory production scheduling / ERP factory floor management.
- Direct automated escrow capacity reservation checkout for processors.
- Formal regulatory accreditation / certification authority issuance.
- Automated AI dispatch routing / vehicle telematics.
- Cross-border West African customs clearance workflows.
- Stellar/crypto payment mechanisms (NGN fiat remains the primary rail).
- Fake data generation or simulated activity.
