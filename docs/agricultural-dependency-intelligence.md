# Agricultural Dependency Graph & Network Intelligence Foundation (Phase 3.12)

## 1. Executive Summary & Purpose

AgroMarket Phase 3.12 establishes an explicit, strongly typed, and deterministic agricultural dependency graph layer. While previous phases (Phase 2.0–3.11) modeled individual value-chain actors, facilities, logistics movements, coordination opportunities, and fulfilment commitments, the relationships between these entities remained largely fragmented across isolated analytical models or inferred ad hoc.

Phase 3.12 introduces the foundational network intelligence substrate that allows existing analytical engines (Market Intelligence, Supply Matching, Procurement, Food Security, Logistics, Biosecurity, and Orchestration) to reason deterministically about structural vulnerabilities, supply concentration, single points of failure, corridor bottlenecks, and cascading disruption pathways across Nigerian agro-ecological corridors.

> [!IMPORTANT]
> **Advisory Nature**: The dependency graph represents dependency exposure, structural vulnerabilities, and correlated risk pathways. It **does not prove causality**, **does not execute autonomous procurement or logistics**, and **does not enact automated sanctions or cancellations**. Any consequential operational action continues through Phase 3.8 Governance with mandatory human oversight.

---

## 2. Core Architectural Principles

1. **Explicit vs Inferred**: Relationships are stored as explicit directed edges with verified node references, active temporal windows, and traceable provenance.
2. **Dependency vs Association**: The graph explicitly differentiates functional dependencies (where entity failure impairs downstream operation) from contextual associations (e.g., geographic co-location).
3. **Strength vs Confidence Orthogonality**: Dependency Strength (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`) measures the severity of the operational coupling, while Confidence (`HIGH`, `MODERATE`, `LOW`, `INSUFFICIENT_DATA`) measures the empirical quality and completeness of underlying evidence.
4. **Alternative ≠ Guaranteed Capacity**: Identified alternative facilities or corridors are marked with `UNVERIFIED_CAPACITY` and require operational and security validation before rerouting or re-allocation.
5. **Bounded Traversal & Cycle Protection**: All graph recursions are strictly depth-bounded ($1 \le \text{depth} \le 5$, default 3), node-bounded ($\le 100$), edge-bounded ($\le 250$), and cycle-protected to prevent infinite loops.
6. **Strict Anti-Pork Invariant**: Global zero-tolerance rejection of swine/pork terms across database constraints, validation schemas, queries, and filters.
7. **Privacy & Masking**: Public views display only safe aggregate metrics, suppressing exact GPS coordinates, private pricing, participant identities, and contact phone numbers.

---

## 3. Node Model

The dependency network leverages existing authoritative entity tables rather than creating duplicated abstract node tables:

| Node Type | Canonical Source Entity | Description |
| :--- | :--- | :--- |
| `PRODUCER` | `users` / `profiles` (Role `FARMER` / `PRODUCER`) | Agricultural primary producer or smallholder cooperative |
| `PRODUCTION_UNIT` | `production_units` (Phase 2.0) | Registered farm, parcel, or greenhouse facility |
| `PRODUCTION_OUTPUT` | `production_outputs` (Phase 2.0) | Recorded agricultural harvest or expected yield batch |
| `AGGREGATION_POOL` | `aggregation_pools` (Phase 2.0) | Collection center or commodity pooling point |
| `PROCESSING_FACILITY`| `processing_facilities` (Phase 2.0) | Processing plant, mill, silo, or cold-storage unit |
| `PROCESSING_OUTPUT` | `processing_events` (Phase 2.0) | Refined or processed derivative commodity batch |
| `B2B_DEMAND` | `b2b_demands` (Phase 2.0) | Structured institutional or commercial demand order |
| `MARKET` | `markets` / `marketplace_listings` | Physical or regional wholesale trading market |
| `LOGISTICS_PROVIDER`| `users` (Role `SERVICE_PROVIDER` / Logistics) | Verified freight or transport provider |
| `LOGISTICS_CORRIDOR`| `logistics_corridors` (Phase 2.9) | Trunk transit corridor (e.g., North-South Transit Corridors) |
| `REGION` | Nigerian State / LGA geographic boundary | Administrative and agro-ecological production zone |
| `COMMODITY` | Canonical agricultural produce list | Crop or livestock commodity class (Anti-pork verified) |
| `EQUIPMENT` | `equipment_listings` (Phase 1.3) | Critical mechanization or processing machinery |
| `SERVICE` | `services` (Phase 1.3) | Agricultural extension, spraying, or veterinary service |
| `INPUT` | Certified agro-inputs | Seed, fertilizer, or crop-protection input |
| `FOOD_SECURITY_DOMAIN`| `food_security_domains` (Phase 2.8) | Regional nutritional vulnerability domain |

---

## 4. Relationship Model

Relationships are strongly typed, directed edges connecting a source node to a target node:

```
[SOURCE NODE] ──(RELATIONSHIP TYPE)──> [TARGET NODE]
     │                                      │
     └── [NATURE: DEPENDENCY | ASSOCIATION] ┘
```

### Constrained Agricultural Relationship Vocabulary

- `PRODUCES`: Producer or region yields a commodity.
- `SUPPLIES`: Supplier, pool, or producer feeds commodity to a downstream facility.
- `CONTRIBUTES_TO`: Producer aggregates supply into an aggregation pool or coordination requirement.
- `AGGREGATES`: Aggregation pool consolidates commodity outputs.
- `PROCESSES`: Facility transforms raw input commodities into refined outputs.
- `REQUIRES_INPUT`: Facility or production unit requires specific raw produce or agro-inputs.
- `DEPENDS_ON`: Functional operational reliance between entities.
- `CONNECTED_TO`: Physical or operational link between facility and transit corridor.
- `SERVES`: Corridor or facility delivers produce into a target region or consumer market.
- `DEMANDS`: Buyer or market requires commodity volume.
- `DISTRIBUTES_TO`: Channel distributing output to regional distributors.
- `TRANSPORTS_THROUGH`: Logistics movement traversing a specific corridor.
- `ALTERNATIVE_TO`: Verified or potential structural substitute for a facility, corridor, or supplier.
- `CONSTRAINED_BY`: Entity operation restricted by infrastructure, biosecurity, or seasonal bottlenecks.
- `AFFECTS`: Disease, climate, or disruption event impacting downstream nodes.
- `LOCATED_IN`: Geographic spatial association with an administrative LGA or State.

---

## 5. Dependency vs Association

The system strictly enforces the distinction between:
- **`DEPENDENCY`**: An operational, physical, or supply reliance where failure, impairment, or disruption of the target node directly affects the functioning, input sufficiency, or throughput of the source node.
- **`ASSOCIATION`**: Contextual, spatial, or informational linkages (such as `LOCATED_IN` or informational co-membership) that do not constitute an operational throughput bottleneck.

Downstream cascade propagations prioritize `DEPENDENCY` edges and apply attenuated weighting to general associations.

---

## 6. Dependency Strength vs Evidence Confidence

These two dimensions are strictly separated:

### Dependency Strength (Operational Impact)
- `LOW`: Minor reliance (<30% flow share, abundant alternatives exist).
- `MODERATE`: Moderate reliance (30%–49.9% flow share, few alternatives).
- `HIGH`: Heavy reliance (50%–74.9% flow share, difficult replacement).
- `CRITICAL`: Vital reliance ($\ge$75% flow share or single point of failure).
- `INSUFFICIENT_DATA`: Empirical data insufficient to determine flow proportion.

### Evidence Confidence (Empirical Rigor)
- `HIGH`: Multi-source verified, directly observed transactional data.
- `MODERATE`: Single verified source or recent seasonal observation.
- `LOW`: Inferred, correlated, or dated historical estimation.
- `INSUFFICIENT_DATA`: Less than 3 observed events/transactions or missing telemetry.

---

## 7. Concentration & Single Point of Failure Analysis

Concentration assessments compute the Herfindahl-Hirschman Index (HHI) and dominant share ratio across four dimensions:
1. **Supplier Concentration**: Single producer or aggregator providing majority share of procurement demand.
2. **Processing Concentration**: Single milling/processing plant handling majority regional throughput.
3. **Corridor Concentration**: Single transit corridor carrying majority freight flow for a commodity.
4. **Regional Concentration**: Single State or LGA accounting for majority harvest supply.

### Canonical Thresholds
- **`NORMAL`**: Dominant entity share $< 30\%$ ($\text{ratio} < 0.30$).
- **`CONCENTRATED`**: Dominant entity share $30\% - 49.9\%$ ($0.30 \le \text{ratio} < 0.50$).
- **`HIGH_DEPENDENCY`**: Dominant entity share $50\% - 74.9\%$ ($0.50 \le \text{ratio} < 0.75$).
- **`CRITICAL_DEPENDENCY`**: Dominant entity share $\ge 75\%$ ($\text{ratio} \ge 0.75$).
- **`INSUFFICIENT_DATA`**: Observation sample size $< 3$.

---

## 8. Cascade Analysis & Disruption Propagation

When an upstream disruption occurs (e.g., flood on a corridor or plant breakdown), `getDependencyCascade` traverses downstream paths:

```
[LOGISTICS CORRIDOR: L-01] 
         │ (SERVES / CRITICAL)
         ▼
[PROCESSING FACILITY: P-01]
         │ (SUPPLIES / HIGH)
         ▼
[COMMODITY OUTPUT: Cassava Starch]
         │ (DEMANDS / CRITICAL)
         ▼
[B2B DEMAND: Commercial Food Processor]
```

### Cascade Guardrails
1. **Cycle Detection**: Branch tracking ensures circular loops (A $\to$ B $\to$ A) terminate gracefully with a `cycleDetected` flag.
2. **Bounded Depth**: Enforces $1 \le \text{depth} \le 5$ (default 3).
3. **Advisory Language**: Outputs are labeled as *"potential downstream impact"*, *"dependency exposure"*, and *"correlated risk pathway"*. No proof of causality is claimed.

---

## 9. Alternative Paths & Redundancy Discovery

`getPotentialAlternativePaths` identifies peer facilities or corridors that could structurally absorb throughput if an exposed node fails:

- Evaluates direct `ALTERNATIVE_TO` edges.
- Evaluates peer nodes of the same type matching commodity and regional vicinity.
- **Mandatory Caveat**: All identified candidates are flagged with `UNVERIFIED_CAPACITY`. AgroMarket explicitly disclaims guaranteed capacity, requiring field verification before rerouting.

---

## 10. Multi-Agent Intelligence Integrations

The dependency graph provides reusable query functions consumed by existing agents:

| Agent / Domain | Consumed Dependency Function | Integration Purpose |
| :--- | :--- | :--- |
| **Market Intelligence** | `getRegionalDependency` | Identifies single-origin price transmission vulnerabilities. |
| **Supply Matching** | `getDependencyExposure` | Flags candidates reliant on disrupted transit corridors without rejecting them silently. |
| **Procurement Intelligence**| `getSupplierConcentration` | Advises buyers on multi-supplier diversification strategies. |
| **Food Security** | `getCorridorDependency` | Factors single-corridor dependence into regional resilience scoring. |
| **Logistics Intelligence** | `getPotentialAlternativePaths` | Identifies non-tactical strategic fallback transit corridors. |
| **Disease / Biosecurity** | `getDependencyCascade` | Traces advisory downstream risk pathways from infected regions. |
| **Agricultural Coordination**| `getDependencyExposure` | Warns if coordinated contributors share identical downstream aggregation bottlenecks. |
| **Fulfilment & Reconciliation**| `assessAndRecordConcentration` | Updates facility bottleneck assessments when repeated fulfilment delays are observed. |
| **Scenario Modeling** | `getDependencyCascade` | Evaluates hypothetical "Facility Outage" or "Corridor Blockage" scenarios. |

---

## 11. Governance & Anti-Pork Guardrails

- **Zero-Tolerance Anti-Pork**: Evaluated at DB constraint (`chk_dep_rel_anti_pork`), Zod validator (`assertNoProhibitedProduceDependency`), action layer, and query layer. Terms like `pork`, `pig`, `swine`, `bacon`, `ham` throw immediate exceptions.
- **Human-in-the-Loop Governance**: Mutating dependency relationships or recording concentration assessments evaluates Phase 3.8 Governance Policy. Consequential mutations are blocked if policy returns `DENY`.

---

## 12. Verification & Testing

The Phase 3.12 implementation has been rigorously verified against live Supabase infrastructure and automated quality gates:

- **Database Migration**: `20261008170000_phase_3_12_agricultural_dependency_graph.sql` applied to live Supabase DB.
- **Automated Tests**:
  - `src/test/dependency-graph.test.ts`: 14 domain and integration tests passed.
  - Overall test suite: 64 test files, 1,085 tests passed (100% pass rate).
- **TypeScript Strictness**: `npm run typecheck` passed with 0 errors.
- **Next.js Linting**: `npm run lint` passed with 0 warnings and 0 errors.
- **Production Build**: `npm run build` compiled all 45 routes cleanly, including dynamic `/dependency-intelligence`.
