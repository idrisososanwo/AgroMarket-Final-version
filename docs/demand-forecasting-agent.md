# AGROMARKET PHASE 2.5: DEMAND FORECASTING & DEMAND INTELLIGENCE AGENT

> **CRITICAL ARCHITECTURAL PRINCIPLE:**
> "The Demand Forecasting Agent is decision-support infrastructure, not a guaranteed demand predictor or autonomous procurement system."

---

## 1. Executive Summary & Purpose

The **Demand Forecasting & Demand Intelligence Agent** (`DEMAND_FORECASTING_AGENT`) is the specialized intelligence layer within AgroMarket responsible for continuously analyzing, aggregating, and interpreting agricultural demand dynamics across Nigeria.

Operating within the canonical loop:
```
OBSERVE → NORMALIZE → DETECT → FORECAST → INTERPRET → RECOMMEND → HUMAN/BUSINESS ACTION → OUTCOME → EVALUATION → IMPROVEMENT
```

The agent provides decision support to answer critical agricultural and market questions:
- What agricultural commodities are consumers, institutions, and bulk buyers requesting?
- Where is demand growing, stabilizing, or declining across Nigeria's 36 states and FCT?
- How intense is demand pressure relative to available listed supply?
- Is observed demand an isolated spike, short-term surge, or sustained trend?
- How is demand split between direct consumer checkout, institutional B2B procurement, and communal shared purchase pools?
- Where does unmet demand exist due to supply shortages?
- How can farmers, processors, aggregators, and buyers plan production and offtake with grounded uncertainty quantification?

---

## 2. Agent Identity & Capabilities

Registered in `public.agricultural_intelligence_agents`:

| Field | Value |
|---|---|
| **Agent ID** | `DEMAND_FORECASTING_AGENT` (alias: `DEMAND_FORECASTING`) |
| **Name** | Specialized Demand Forecasting & Demand Intelligence Agent |
| **Version** | `1.0.0` (Phase 2.5) |
| **Status** | `ACTIVE` |
| **Capabilities** | `CONSUMER_DEMAND_ANALYSIS`, `B2B_DEMAND_TRACKING`, `SHARED_PURCHASE_DEMAND_INDEXING`, `DEMAND_TREND_DETECTION`, `DEMAND_PRESSURE_INDEXING`, `DEMAND_VOLATILITY_ANALYSIS`, `UNMET_DEMAND_MONITORING`, `DETERMINISTIC_FORECASTING`, `EVIDENCE_PACKAGING`, `ADVISORY_RECOMMENDATION` |
| **Supported Domains** | `CROPS`, `LIVESTOCK`, `POULTRY`, `AQUACULTURE` (Pork/Swine strictly prohibited) |
| **Primary Currency** | Nigerian Naira (`NGN`) |

---

## 3. Demand Data Sources

The agent consumes only verified, empirical platform data. Synthetic, fabricated, or simulated transaction counts are strictly forbidden.

1. **Consumer Orders (`order_items`, `orders`)**:
   - Confirmed, placed, or completed order items over 7-day, 30-day, and 90-day observation windows.
   - Strictly excludes cancelled orders.
   - Captures delivery state and transaction timestamps.
2. **Active Cart Intent (`cart_items`, `listings`)**:
   - Represents active buyer intent and pipeline demand.
   - **Critical rule:** Cart intent is strictly isolated from completed sales volume; it never inflates historical sales metrics.
3. **Institutional B2B Demands (`b2b_demands`)**:
   - Quantified commercial offtake requests, delivery deadlines, target pricing, and fulfilment status.
   - Captures buyer volume without assuming unfulfilled demands represent guaranteed revenue.
4. **Communal Shared Purchases (`shared_purchases`, `shared_purchase_participants`)**:
   - Group pooling activity for bulk crops and livestock splitting.
   - Bidirectional traceability via `orders.shared_purchase_id` prevents double-counting completed shared purchases.
5. **Active Listings (`listings`)**:
   - Listed inventory available per state and commodity, used to contrast against open demand to detect supply deficits.
6. **Existing Baseline Forecasts (`demand_forecasts`)**:
   - Integrates existing Phase 0.9/2.1 moving-average historical forecasts without duplication.
7. **Cross-Agent Signals (`agricultural_intelligence_signals`)**:
   - Market pressure indexes and price trends from Phase 2.3 `MARKET_INTELLIGENCE_AGENT`.
   - Harvest batches and production capacity from Phase 2.4 `PRODUCTION_PLANNING_AGENT`.
   - Disruption and security alerts from Phase 2.1 intelligence foundation.

---

## 4. Physical Unit Normalization

Agricultural demand in Nigeria involves diverse packaging units. Comparing unnormalized units is strictly invalid.

- **Mass / Weight:** Normalized deterministically to canonical **KG** (`50kg bag` $\to$ 50 kg, `100kg bag` $\to$ 100 kg, `tonne / mt` $\to$ 1,000 kg).
- **Volume / Liquids:** Normalized deterministically to canonical **LITRE** (`25l keg` $\to$ 25 litres, `gallon` $\to$ 25 litres).
- **Discrete Packaging:** Indeterminate or variable units (`crate`, `basket`, `head`, `bunch`, `tuber`) retain their discrete identity. Conversions between incompatible physical families (e.g. `crate` vs `kg`) are never fabricated; incompatible units are safely partitioned and flagged as `INSUFFICIENT_EVIDENCE`.

---

## 5. Pure Deterministic Mathematical Engines

All mathematical calculations are pure functions isolated from AI models.

### 5.1 Demand Trend Detection
- Evaluates 30-day percentage growth: $\Delta = \frac{V_{\text{current}} - V_{\text{prior}}}{V_{\text{prior}}} \times 100$.
- **Directions:**
  - $\Delta \ge +25\%$: `SHARP_INCREASE`
  - $+8\% \le \Delta < +25\%$: `MODERATE_INCREASE`
  - $-8\% < \Delta < +8\%$: `STABLE`
  - $-25\% < \Delta \le -8\%$: `MODERATE_DECREASE`
  - $\Delta \le -25\%$: `SHARP_DECREASE`
  - $N < 2$: `INSUFFICIENT_DATA`
- **Classifications:** `B2B_DRIVEN_INCREASE`, `CONSUMER_DRIVEN_INCREASE`, `ISOLATED_SPIKE`, `SHORT_TERM_INCREASE`, `SUSTAINED_INCREASE`, `STABLE`, `DECLINING`, `INSUFFICIENT_EVIDENCE`.

### 5.2 Deterministic Demand Pressure Formula
Measures empirical demand intensity bounded strictly between **0.0 and 100.0**:

$$\text{DemandPressure} = 0.35 \times \text{GrowthFactor} + 0.30 \times \text{B2BVolumeFactor} + 0.20 \times \text{OrderFrequencyFactor} + 0.15 \times \text{UnmetDemandFactor}$$

- **GrowthFactor (35%):** Base 50, scaled by $\Delta \times 0.8$, clamped $[0, 100]$.
- **B2BVolumeFactor (30%):** Ratio of bulk commercial demand to total demand volume, clamped $[0, 100]$.
- **OrderFrequencyFactor (20%):** Density of consumer checkouts in the observation window ($N_{\text{orders}} \times 8$), clamped $[0, 100]$.
- **UnmetDemandFactor (15%):** Ratio of unfulfilled demand intent over available listed inventory, clamped $[0, 100]$.

**Levels:**
- `< 30.0`: `LOW`
- `30.0 – 49.9`: `MODERATE`
- `50.0 – 69.9`: `ELEVATED`
- `70.0 – 84.9`: `ACUTE`
- `≥ 85.0`: `CRITICAL`

### 5.3 Demand Volatility
Computed using the coefficient of variation ($CV = \sigma / \mu$) across daily volume buckets:
- $CV < 0.35$: `LOW` (stable daily patterns)
- $0.35 \le CV < 0.75$: `MODERATE` (normal commercial fluctuations)
- $CV \ge 0.75$: `HIGH` (irregular buying spikes)
- $< 3$ observations: `INSUFFICIENT_DATA`

### 5.4 Demand Concentration
Identifies whether demand is vulnerable to single-point dependency:
- Regional concentration ($> 65\%$ of national demand in target state) $\to$ `CONCENTRATED_REGIONAL`.
- B2B concentration ($> 75\%$ of volume from institutional buyers) $\to$ `CONCENTRATED_B2B`.
- Otherwise $\to$ `BALANCED`.

### 5.5 Unmet Demand Detection
Detects when verified buyer intent ($V_{\text{B2B}} + V_{\text{Cart}}$) exceeds available listed stock ($V_{\text{Supply}}$) in a state, calculating the deficit quantity and issuing an `UNMET_DEMAND` intelligence signal.

---

## 6. AI Reasoning & Governance (Phase 2.2 Integration)

AI models are never accessed directly; all reasoning is mediated by the Phase 2.2 AI Gateway:
- **Objectives:** `DEMAND_TREND_INTERPRETATION`, `DEMAND_PRESSURE_ASSESSMENT`, `REGIONAL_DEMAND_ANALYSIS`, `UNMET_DEMAND_ANALYSIS`, `DEMAND_RISK_SUMMARY`.
- **Evidence Budgets:** Max 10 signals, 20 evidence items, 12,000 characters. Private buyer details stripped.
- **Safety Pre-Checks:** Validates schemas, enforces anti-pork prohibition, blocks autonomous purchasing verbs.
- **Safety Post-Checks:** Ensures structured reasoning format, strips speculative promises, guarantees human review requirement.
- **Graceful Fallback:** If the AI provider is offline, the orchestrator returns `DETERMINISTIC_ONLY` status with 100% mathematical integrity preserved.

---

## 7. Strict Safety & Ethical Boundaries

1. **Zero Autonomous Actions:** The agent CANNOT execute purchase orders, alter pricing, place contracts, adjust warehouse inventory, or dispatch delivery vehicles.
2. **Zero Pig / Pork Tolerance:** Strict database check constraints, domain validators (`assertNoProhibitedProduce`), regex filters, prompt instructions, and UI sanitization.
3. **No Speculative Guarantees:** Prohibited phrases include "guaranteed profit", "guaranteed sales", "buy now", "risk-free".
4. **Privacy Protection:** Individual buyer IDs, private farm addresses, and proprietary vendor contracts are completely redacted from public intelligence.
5. **Sparse Data Handling:** Low transaction density defaults to `LOW_CONFIDENCE` or `INSUFFICIENT_EVIDENCE`.

---

## 8. Multi-Agent Ecosystem Interconnection

```
                       AGROMARKET INTELLIGENCE
                                  │
       ┌──────────────────────────┼──────────────────────────┐
       │                          │                          │
 MARKET INTELLIGENCE     PRODUCTION PLANNING        DEMAND INTELLIGENCE
 (Phase 2.3)             (Phase 2.4)                (Phase 2.5)
   Price / Parity          Harvest / Seasonality      Consumer / B2B / Forecast
   / Market Pressure       / Opportunity / Constraints / Unmet Demand / Regional
       │                          │                          │
       └──────────────────────────┼──────────────────────────┘
                                  │
                       FUTURE INTELLIGENCE AGENTS
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
       Supply Matching       Procurement          Food Security
```

- **Feeds into Market Intelligence:** Demand pressure directly calibrates corridor market pressure indexes.
- **Feeds into Production Planning:** Provides verified demand signals so farmers avoid planting into market gluts.
- **Prepares Supply Matching & Procurement:** Structures demand specifications for future aggregation and supply-matching engines.
