# AgroMarket Phase 3.3 — Agricultural Intelligence Action Integration

## 1. Executive Summary

Phase 3.3 creates the **Governed Action Integration Layer** in AgroMarket, connecting upstream analytical intelligence (Phase 2.1-3.0 Domain Agents, Phase 3.1 Orchestration, and Phase 3.2 Decision Foundation) directly into real, existing product capabilities:

```
INTELLIGENCE
     │
     ▼
RECOMMENDATION (Calibrated & Governed)
     │
     ▼
USER DECISION (Explicit Human Choice)
     │
     ▼
ACTION INTEGRATION (Deterministic Routing & Real-Time Revalidation)
     │
     ▼
EXISTING AGROMARKET WORKFLOW (Marketplace, Procurement, Equipment, etc.)
     │
     ▼
REAL OUTCOME (Audited Platform or User-Reported External)
     │
     ▼
EVALUATION (Continual Calibration Loop)
```

The system remains strictly **advisory**. AgroMarket **never** autonomously executes consequential actions, books equipment, debits accounts, signs contracts, or quarantines commodities without human confirmation.

---

## 2. Supported Normalized Action Intents

Phase 3.3 normalizes 26 distinct action intents mapped to verified AgroMarket domains:

| Action Intent | Primary Domain | Destination Route | Description |
|---|---|---|---|
| `VIEW_MARKETPLACE` | Marketplace | `/marketplace` | General produce browsing |
| `VIEW_SUPPLY_OPTIONS` | Marketplace / Supply Intel | `/marketplace`, `/supply-intelligence` | Regional or commodity supply sourcing |
| `VIEW_DEMAND_OPPORTUNITIES` | Demand Intel | `/demand-intelligence` | Commercial off-take signals |
| `VIEW_PROCUREMENT_OPTIONS` | Procurement Intel | `/procurement-intelligence` | Enterprise sourcing & tenders |
| `VIEW_ALTERNATIVE_SUPPLIERS` | Procurement Intel | `/procurement-intelligence` | Sourcing diversification |
| `VIEW_AGGREGATION_OPTIONS` | Shared Purchase | `/shared-purchases` | Volume aggregation pools |
| `CREATE_B2B_DEMAND` | Demand / Procurement | `/procurement-intelligence` | User-initiated B2B demand request |
| `CREATE_LISTING` | Farmer Listings | `/farmer/listings/new` | Produce inventory listing |
| `JOIN_SHARED_PURCHASE` | Shared Purchase | `/shared-purchases` | Group buying participant |
| `REQUEST_EQUIPMENT` | Equipment Rental | `/equipment` | Mechanization rental discovery |
| `REQUEST_SERVICE` | Services | `/services` | Agribusiness services marketplace |
| `VIEW_LOGISTICS_OPTIONS` | Logistics Intel | `/logistics-intelligence` | Corridor freight & route evaluation |
| `VIEW_MARKET_INTELLIGENCE` | Market Intel | `/market-intelligence` | Wholesale prices & volume trends |
| `VIEW_PRODUCTION_INTELLIGENCE` | Production Intel | `/production-intelligence` | Seasonal planning & agronomic windows |
| `VIEW_DEMAND_INTELLIGENCE` | Demand Intel | `/demand-intelligence` | Demand trends & consumer off-take |
| `VIEW_SUPPLY_INTELLIGENCE` | Supply Intel | `/supply-intelligence` | Regional cluster inventory levels |
| `VIEW_PROCUREMENT_INTELLIGENCE` | Procurement Intel | `/procurement-intelligence` | Supplier risk & procurement tenders |
| `VIEW_FOOD_SECURITY` | Food Security | `/food-security` | Strategic food reserves & community vulnerability |
| `VIEW_DISEASE_INTELLIGENCE` | Disease & Biosecurity | `/disease-intelligence` | Pest alerts & biosecurity advisories |
| `VIEW_AGRICULTURAL_SECURITY` | Security | `/learn/security` | Rural trade corridor safety updates |
| `VIEW_EXPERT_ADVICE` | Knowledge | `/learn/expert-advice` | Verified agronomy extension guidance |
| `SEEK_EXPERT` | Knowledge | `/learn/expert-advice` | Specialist consultation |
| `VIEW_FOOD_HEALTH` | Knowledge | `/learn/food-health` | Post-harvest handling & food safety |
| `REVIEW_RECOMMENDATION` | Decision Intelligence | `/my-intelligence` | Deeper multi-agent explainability |
| `CONTINUE_MONITORING` | Decision Intelligence | `/my-intelligence` | Routine observation without immediate action |
| `INSUFFICIENT_DATA` | Decision Intelligence | `/my-intelligence` | Low-confidence monitoring |

---

## 3. Recommendation-to-Action Mapping

The mapping from recommendation categories to action intents is **deterministic** and **role-aware**:

- **`REVIEW_SUPPLY_GAP`**:
  - For **Farmer**: Maps to `CREATE_LISTING` (`/farmer/listings/new`), encouraging sellers to supply active deficit regions.
  - For **Buyer / Business**: Maps to `VIEW_SUPPLY_OPTIONS` (`/marketplace?commodity=...`), helping buyers fulfill deficits.
- **`DIVERSIFY_SUPPLIERS`**:
  - Maps to `VIEW_ALTERNATIVE_SUPPLIERS` (`/procurement-intelligence`).
- **`REVIEW_EQUIPMENT_OPTIONS`**:
  - Maps to `REQUEST_EQUIPMENT` (`/equipment?state=...`).
- **`REVIEW_AGGREGATION_OPPORTUNITY`**:
  - Maps to `VIEW_AGGREGATION_OPTIONS` (`/shared-purchases?commodity=...`).
- **`REVIEW_LOGISTICS_OPTIONS`**:
  - Maps to `VIEW_LOGISTICS_OPTIONS` (`/logistics-intelligence`).
- **`REVIEW_BIOSECURITY_INFORMATION`**:
  - Maps to `VIEW_DISEASE_INTELLIGENCE` (`/disease-intelligence`).
- **`SEEK_EXPERT_GUIDANCE`**:
  - Maps to `SEEK_EXPERT` (`/learn/expert-advice`).

Unrecognized or unwhitelisted routes are automatically rejected and safely fallback to `/my-intelligence`.

---

## 4. Deep-Link Safety & Privacy Guardrails

When deep linking from a recommendation to a product workflow:
- **Allowed Parameters**: `commodity`, `state`, `category`, `intel_ref` (recommendation ID), and `dec_ref` (decision ID).
- **Zero Sensitive Data in URLs**: Never exposes phone numbers, farm coordinates, buyer identities, financial balances, or auth tokens.
- **Sanitization**: Validates commodity names against anti-pork rules and checks Nigerian state validity against `NIGERIAN_STATES`.

---

## 5. Real-Time Revalidation

Intelligence forecasts are snapshots. Before any consequential step is taken, the system runs live revalidation:
- **Marketplace**: Revalidates whether active listings actually exist right now for the requested commodity and state.
- **Shared Purchase**: Revalidates whether the pool is still open, remaining capacity, and current unit price.
- **Equipment**: Revalidates whether the equipment status is currently `AVAILABLE`.
- **Services**: Revalidates whether the provider is active and accepting requests.

If real-time state is stale or unavailable, an advisory notice is displayed:
> *"Notice: Stale snapshot detected. Live inventory may differ from recent forecast."*

The user is alerted immediately so they never make commitments based on obsolete data.

---

## 6. Intelligence Context Banner

When navigating to an existing product workflow (e.g., `/marketplace?commodity=cassava&intel_ref=rec-123`), the page displays the **`IntelligenceContextBanner`**:
- Informs the user: *"You're viewing this page because an AgroMarket intelligence recommendation identified active market pressure for cassava in Ogun."*
- Includes a direct *"Why am I seeing this?"* link back to full explainability.
- Supports one-click dismissal.

---

## 7. Action Linkage & Outcome Lifecycle

Every action initiated from intelligence records a governed entry in `agricultural_action_integrations`:
- Retains linkage to `recommendation_id`, `decision_id`, `action_id`, and `user_id`.
- Tracks lifecycle outcome states:
  - `NOT_STARTED`
  - `VIEWED`
  - `ACTION_INITIATED`
  - `ACTION_COMPLETED`
  - `ACTION_CANCELLED`
  - `ACTION_FAILED`
  - `EXPIRED`
  - `UNKNOWN`
- Records `revalidation_status` and `revalidated_at` timestamp.

---

## 8. Effectiveness & Conversion Metrics (Non-Causal Association)

Phase 3.3 implements deterministic analytics measuring intelligence usefulness:
- **Recommendation View Rate**
- **Decision Rate**
- **Action Initiation Rate**
- **Action Completion Rate**
- **Recommendation-to-Action Conversion Rate**
- **Action Success Rate**
- **Dismissal & Deferral Rates**
- **Average Minutes to Action**

### Governance Disclaimer:
All metrics are strictly reported using **"associated with"** terminology. AgroMarket explicitly disclaims causal determinism unless verified with external randomized control groups.

---

## 9. Row Level Security & Authorization

Table: `agricultural_action_integrations`
- **SELECT**: Users view only their own records (`auth.uid() = user_id OR is_admin()`).
- **INSERT**: Users create records only for themselves (`auth.uid() = user_id`).
- **UPDATE**: Users update only their own records (`auth.uid() = user_id OR is_admin()`).

---

## 10. Strict Anti-Pork Invariant

Zero tolerance enforced across all layers:
- Database check constraint on `context_payload` in `agricultural_action_integrations`.
- Runtime rejection via `assertNoProhibitedProduce()`.
- Deep-link parameter rejection on query strings.

---

## 11. AI Boundaries

AI is strictly auxiliary:
- **Allowed**: Explaining why an action is recommended, summarizing market trade-offs.
- **Prohibited**: Choosing the action autonomously, executing transactions, modifying inventory/prices, clinical diagnosis, or regulatory declarations.

---

## 12. Limitations & Future Extensions

- **External Verification**: Offline actions rely on user reporting (`USER_REPORTED_EXTERNAL_ACTION`).
- **Phase 3.4+ Roadmap**:
  - Interactive cooperative aggregation workflows.
  - Multi-party logistics bundling from cross-corridor recommendations.
  - Offline SMS/USSD action confirmation codes.
