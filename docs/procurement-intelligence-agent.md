# AgroMarket Phase 2.7: Procurement Intelligence & B2B Procurement Agent

## 1. Executive Summary & Purpose

The **Procurement Intelligence & B2B Procurement Agent** (`PROCUREMENT_INTELLIGENCE_AGENT`, alias `PROCUREMENT_INTELLIGENCE`) is AgroMarket's specialized decision-support layer for verified offtakers, agribusinesses, institutions, and wholesale buyers across Nigeria.

It turns verified B2B demand, price observations, supply matches, supply gaps, production opportunities, processing constraints, and transit logistics into actionable procurement intelligence, priority rankings, and advisory coordination recommendations.

### Authoritative Non-Autonomous Boundaries
The agent is strictly advisory and operates under immutable safety invariants. The platform **DOES NOT**:
1. **Autonomously purchase** agricultural goods or issue binding procurement orders.
2. **Commit buyer funds** or execute financial transactions without explicit human authorization.
3. **Negotiate binding contracts** or legal supplier commitments.
4. **Reserve inventory or supply** automatically without explicit supplier/buyer action.
5. **Act as a regulated escrow**, bank, lender, insurer, or financial institution.
6. **Guarantee physical supply availability, fixed prices, or guaranteed delivery schedules**.
7. **Certify road safety or guarantee physical passage** through corridors.
8. **Certify halal status, certify food safety, or diagnose agricultural disease**.
9. **Fabricate synthetic data**, fake prices, fake suppliers, or hallucinated orders.

---

## 2. Intelligence Architecture & Core Loop

The agent follows an explainable, deterministic intelligence loop:

```
OBSERVE
   ↓
NORMALIZE
   ↓
CONSOLIDATE
   ↓
PRIORITIZE (Deterministic 0–100 Priority Scoring)
   ↓
ESTIMATE PROCUREMENT NEED
   ↓
ANALYZE SUPPLY (Phase 2.6 Value-Chain Matching)
   ↓
ANALYZE MARKET (Phase 2.3 Market Intelligence & Real Prices)
   ↓
IDENTIFY PROCUREMENT STRATEGY
   ↓
INTERPRET (Phase 2.2 AI Gateway — Advisory Interpretation)
   ↓
RECOMMEND (Advisory PROPOSED State Machine)
   ↓
HUMAN / BUSINESS ACTION (Authoritative)
   ↓
OUTCOME
   ↓
EVALUATION & MEMORY
```

### Multi-Agent Integration
Procurement Intelligence does not duplicate calculations owned by upstream agents. It consumes their outputs:
- **Phase 2.3 (Market Intelligence)**: Real price observations, price trends, regional differentials, and market pressure.
- **Phase 2.4 (Production Planning)**: Upcoming harvest forecasts, opportunity scores, and seasonal availability.
- **Phase 2.5 (Demand Intelligence)**: Demand pressure, trend directions, unmet demand, and demand volatility.
- **Phase 2.6 (Supply Matching)**: Matched volume, supply gap, candidate suppliers, aggregation pools, and processing fit.
- **Phase 1.5 (Security Intelligence)**: Corridor security notices and movement disruption alerts.

---

## 3. Deterministic Priority Scoring (0–100)

Procurement priority is calculated deterministically through a weighted formula strictly bounded to $[0.0, 100.0]$:

$$\text{Priority Score} = \text{Urgency (25)} + \text{Gap (20)} + \text{Demand Pressure (15)} + \text{Market Pressure (15)} + \text{Match Quality (10)} + \text{Lead Time (10)} + \text{Disruption (5)}$$

| Component | Weight | Deterministic Allocation Rules |
| :--- | :---: | :--- |
| **Demand Urgency** | **25%** | Evaluated from delivery date: $\le 3$ days = 25 pts; $4\text{--}7$ days = 20 pts; $8\text{--}14$ days = 15 pts; $15\text{--}30$ days = 10 pts; $> 30$ days = 5 pts. |
| **Supply Gap** | **20%** | Proportional to unmet deficit ratio: 100% gap = 20 pts; $\ge 75\%$ = 16 pts; $\ge 50\%$ = 12 pts; $\ge 25\%$ = 8 pts; $> 0\%$ = 4 pts; fully sourced = 2 pts. |
| **Demand Pressure** | **15%** | Scaled from Phase 2.5 `DemandPressureScore` ($[0, 100] \times 0.15$). Default 6 pts if sparse. |
| **Market Pressure** | **15%** | Scaled from Phase 2.3 `MarketIntelligenceSnapshot` ($[0, 100] \times 0.15$). Default 6 pts if sparse. |
| **Match Quality** | **10%** | Scaled from Phase 2.6 `matchScore` ($[0, 100] \times 0.10$). Default 5 pts if sparse. |
| **Lead-Time Availability**| **10%** | Supplier readiness: immediate stock = 10 pts; within window = 8 pts; delayed = 3 pts. |
| **Risk / Disruption** | **5%** | Security alert or corridor friction = 5 pts; processing bottleneck = 4 pts; normal = 1 pt. |

### Priority Classifications
- **CRITICAL** ($\ge 80$): Imminent deadline, severe supply deficit, or high market disruption. Requires immediate executive procurement review.
- **HIGH** ($60\text{--}79$): Elevated urgency or high market pressure.
- **MEDIUM** ($40\text{--}59$): Standard procurement cycle with moderate lead time.
- **LOW** ($< 40$): Long lead time or fully sourced supply buffers.

---

## 4. Deterministic Procurement Strategies

The system classifies procurement opportunities into one of 7 deterministic strategies:

1. **`DIRECT_SUPPLIER`**: A single verified supplier has available capacity to satisfy $\ge 95\%$ of the requested volume. Bilateral RFQ recommended.
2. **`MULTI_SUPPLIER`**: Volume is fragmented across multiple independent verified suppliers. Split purchase orders recommended.
3. **`AGGREGATED_PROCUREMENT`**: Smallholder farmers or cooperative aggregation pools can collectively satisfy the volume at designated collection centers.
4. **`PROCESSING_REQUIRED`**: Raw commodity must undergo intermediate milling or processing, and certified processor capacity is identified.
5. **`REGIONAL_ALTERNATIVE`**: In-state supply is constrained ($< 30\%$), but an adjacent interstate agricultural corridor has verified inventory.
6. **`WAIT_AND_MONITOR`**: Spot market supply is tight and prices are inflated, but production planning models forecast upcoming harvest replenishment within 2–4 weeks.
7. **`INSUFFICIENT_DATA`**: Data sparsity or zero valid supply listings prevent reliable strategy recommendation.

---

## 5. Supplier Diversification & Concentration Risk

To prevent catastrophic fulfillment failures, the agent monitors supplier allocation concentration:

$$\text{Concentration Ratio} = \left(\frac{\text{Largest Supplier Quantity}}{\text{Total Matched Quantity}}\right) \times 100$$

- When **$\text{Concentration Ratio} \ge 80\%$** and multiple candidates exist, the agent flags **`SUPPLY_CONCENTRATION_RISK`**.
- An advisory recommendation is emitted: *"Single supplier represents $X\%$ of matched volume. Consider distributing allocation across multiple verified suppliers to mitigate fulfillment disruption risk."*

---

## 6. Real Market Price Integrity & Cost Intelligence

AgroMarket strictly enforces price integrity:
- **Observed Market Price**: Real min, max, and median prices derived solely from actual `price_observations` in the relevant state and commodity.
- **Estimated Procurement Cost**: Calculated only when real observations exist ($\text{Quantity} \times \text{Median Price}$).
- **Zero Fake Prices**: If no verified price observations exist in the database, the agent reports `null` and states: *"No real price observations found in target region. Estimated procurement cost withheld to prevent hallucination."*

---

## 7. Security & Food-Security Safeguards

- When active security incidents (Phase 1.5) or road friction impact transport routes, the agent applies:
  - `SECURITY_DISRUPTION_REPORTED`
  - `MOVEMENT_CONSTRAINT_REPORTED`
  - `CORRIDOR_REVIEW_REQUIRED`
- **The system NEVER declares a route safe or advises running checkpoints.**
- Food security sensitivities are highlighted when wholesale deficits threaten regional staple availability.

---

## 8. Privacy & Commercial Confidentiality

Procurement intelligence protects enterprise commercial secrets:
- Private buyer identities, phone numbers, exact warehouse addresses, and commercial budgets are strictly stripped from public snapshots.
- Public views and dashboard statistics display only anonymized, aggregate volume metrics.
- Database Row-Level Security (RLS) ensures that private procurement opportunities are only viewable by the initiating buyer or platform administrators.

---

## 9. Anti-Pork / Halal Invariant

AgroMarket maintains a zero-tolerance invariant regarding pig/pork/swine commodities:
- **Database Level**: Regex check constraints on snapshots, opportunities, and recommendations (`chk_no_pork_*`).
- **Validation Layer**: Zod schema refinement and `assertNoProhibitedProduce`.
- **Calculations**: Explicit check before executing priority scoring or strategy classification.
- **UI & Documentation**: Rejection of prohibited produce terms.

---

## 10. Human-in-the-Loop Recommendation Governance

Advisory recommendations follow an immutable state machine:

```
PROPOSED  →  REVIEWED  →  ACCEPTED / REJECTED  →  ACTIONED  →  COMPLETED
```

Business users retain authoritative discretion. Accepting or actioning a recommendation records the audit trail (`actioned_by`, `actioned_at`) without triggering unauthorized automated payments.
