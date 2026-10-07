# AgroMarket Phase 3.2 — Agricultural Decision & Action Intelligence Foundation

## 1. Executive Summary

Phase 3.2 establishes the decision and action governance layer in AgroMarket, connecting upstream analytical intelligence (Phase 2.1 Domain Agents & Phase 3.1 Cross-Domain Orchestration) directly to end-user utility:

```
INTELLIGENCE
  │
  ▼
RECOMMENDATION (Governed & Calibrated)
  │
  ▼
USER DECISION (Human Agency & Discretion)
  │
  ▼
ACTION (Audited AgroMarket Action or User-Reported External)
  │
  ▼
OUTCOME (Empirical Observation & Variance Analysis)
  │
  ▼
EVALUATION (Continual Calibration & Feedback Loop)
```

The system is strictly **advisory** and explicitly designed **not** to be an autonomous actor or generic chatbot. AgroMarket does not autonomously execute financial transactions, sign contracts, move freight, or issue regulatory verdicts without human initiation.

---

## 2. Decision Architecture

The decision engine synthesizes cross-domain signals into a normalized context adhering to the **8 Core Questions** required for every recommendation:

1. **WHAT IS HAPPENING?** — Concrete agricultural phenomenon (e.g., localized supply shortage, price surge, pest vector alert).
2. **WHY DOES IT MATTER?** — Direct economic, logistical, or food security implication for the specific user.
3. **WHO DOES IT AFFECT?** — Defined actor types (Farmer, Buyer, Procurement, Aggregator, Service Provider, Equipment Owner, Expert, Admin).
4. **WHERE?** — State, Local Government Area (LGA), or national agricultural corridor.
5. **WHAT EVIDENCE SUPPORTS IT?** — Direct citations of upstream intelligence snapshots, confidence levels, contributing agents, and data timestamps.
6. **WHAT COULD THE USER CONSIDER DOING?** — Non-prescriptive, realistic action pathways mapped to verified AgroMarket capabilities or legitimate external options.
7. **WHAT ARE THE LIMITATIONS?** — Explicit disclosures regarding data recency, coverage boundaries, and forecasting assumptions.
8. **WHAT HAPPENED AFTER THE USER DECIDED?** — Governed outcome tracking closing the loop between recommendation, user decision, action, and verified result.

---

## 3. Normalized Recommendation Categories

Phase 3.2 defines 17 standardized recommendation types:
- `MONITOR`
- `INVESTIGATE`
- `DIVERSIFY_SUPPLIERS`
- `REVIEW_ALTERNATIVE_REGION`
- `REVIEW_PROCESSING_CAPACITY`
- `REVIEW_LOGISTICS_OPTIONS`
- `REVIEW_PRODUCTION_OPPORTUNITY`
- `REVIEW_MARKET_OPPORTUNITY`
- `REVIEW_BIOSECURITY_INFORMATION`
- `REVIEW_FOOD_SECURITY_RISK`
- `REVIEW_DEMAND_SIGNAL`
- `REVIEW_SUPPLY_GAP`
- `SEEK_EXPERT_GUIDANCE`
- `REVIEW_EQUIPMENT_OPTIONS`
- `REVIEW_AGGREGATION_OPPORTUNITY`
- `NO_ACTION_RECOMMENDED`
- `INSUFFICIENT_DATA`

Recommendations never imply guaranteed returns, fixed margins, or risk-free market conditions.

---

## 4. Recommendation Lifecycle

Recommendations follow a deterministic lifecycle:

```
[ PROPOSED ] ──(Human Review / Auto-Trigger)──► [ REVIEWED ]
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      ▼                                                                   ▼
                [ ACCEPTED ]                                                        [ REJECTED ]
                      │
                      ▼
                [ ACTIONED ]
                      │
                      ▼
               [ COMPLETED ]
```
Additionally:
- `EXPIRED`: Triggered when time-sensitive windows elapse before interaction.

State mutations require user authorization or authorized administrative review.

---

## 5. User Decision Model

When a user reviews an actionable recommendation, they record one of eight explicit decisions:
- `ACCEPT`: The user agrees with the guidance and intends to act.
- `REJECT`: The user disagrees with the recommendation or deems it inapplicable.
- `DISMISS`: The user acknowledges but chooses not to engage now.
- `DEFER`: The user postpones review to a later date.
- `SAVE`: The user bookmarks the recommendation for future planning.
- `REQUEST_MORE_INFORMATION`: The user seeks deeper regional/market data.
- `SEEK_EXPERT`: The user chooses to consult verified agricultural specialists.
- `TAKE_EXTERNAL_ACTION`: The user acts outside of the AgroMarket digital platform.

---

## 6. Governed Action Tracking

Actions recorded within AgroMarket fall into two categories:

### Internal Platform Actions
Directly recorded and audited when performed through verified system routes:
- `VIEWED`
- `SAVED`
- `CONTACTED_PROVIDER`
- `REQUESTED_SERVICE`
- `JOINED_AGGREGATION`
- `CREATED_B2B_DEMAND`
- `CREATED_LISTING`
- `STARTED_PROCUREMENT`
- `REVIEWED_LOGISTICS`
- `SOUGHT_EXPERT_ADVICE`

### External Actions
When a user executes decisions outside AgroMarket (e.g., offline market purchase, local tractor hire), the system explicitly records the action type as:
- `USER_REPORTED_EXTERNAL_ACTION`

The platform does **not** claim to have digitally verified external activities.

---

## 7. Outcome Tracking and Evaluation

Recommendations, decisions, and actions link directly to `agricultural_orchestration_outcomes`:
- **Expected Outcome**: Documented prior to execution (e.g., target procurement price, mitigation of transit spoilage).
- **Observed Outcome**: Empirical data captured post-harvest or post-delivery.
- **Variance Analysis**: Quantitative and qualitative delta between expectation and reality.
- **Evaluation Status**: `MEASURED`, `IN_PROGRESS`, `FAILED`, `ABANDONED`.
- **Lessons Learned**: Synthesized insights feeding back into model confidence calibration.

Zero synthetic or fake outcomes are generated.

---

## 8. Role-Specific User Experiences

The `/my-intelligence` dashboard dynamically tailors views according to actor profiles:

| Role | Priority Intelligence Dimensions | Primary Action Routing |
|---|---|---|
| **Farmer** | Market pressure, local demand signals, production windows, disease/pest advisories, equipment availability | `/marketplace`, `/equipment`, `/disease-intelligence`, `/jobs` |
| **Buyer** | Regional supply gaps, wholesale pricing pressure, aggregation opportunities, supplier diversification | `/marketplace`, `/supply-intelligence`, `/procurement-intelligence` |
| **Business / Procurement** | B2B supplier concentration, volume contracts, cold-chain logistics, processing facility availability | `/procurement-intelligence`, `/logistics-intelligence` |
| **Service Provider** | Regional agricultural activity, equipment maintenance demand, transport needs | `/jobs`, `/logistics-intelligence` |
| **Equipment Owner** | Tractor/harvester rental demand, seasonal mechanization bottlenecks | `/equipment`, `/jobs` |
| **Agricultural Expert** | Biosecurity hotspots, agronomy query demand, farmer knowledge gaps | `/learn`, `/disease-intelligence` |
| **Administrator** | System-wide orchestration, cross-domain conflicts, food security resilience, data pipeline health | `/intelligence`, `/food-security` |

---

## 9. Explainability ("Why Am I Seeing This?")

Users can inspect the rationale for any recommendation without exposing internal prompts or uncalibrated reasoning chains:
- **Contributing Domain Agents**: Identified by domain (e.g., `MARKET_INTELLIGENCE_AGENT`, `LOGISTICS_INTELLIGENCE_AGENT`).
- **Contributing Signals**: Measurable metrics (e.g., 18% price disparity, inter-state fuel rate increase).
- **Confidence Calibration**: Transparent numerical rating (0.00 – 1.00) kept distinct from urgency/priority.
- **Data Recency & Scope**: Timestamps of source snapshots and geographic scope (e.g., Kano State, Dawanau Market).
- **Explicit Limitations**: Stated caveats regarding weather volatility or sample size.

---

## 10. Governed Notification Engine

Notifications alert users to critical changes without spamming:
- **Categories**: `MARKET_SIGNAL`, `SUPPLY_ALERT`, `DEMAND_SIGNAL`, `PROCUREMENT_ALERT`, `LOGISTICS_ALERT`, `FOOD_SECURITY_ALERT`, `DISEASE_BIOSECURITY_ALERT`, `RECOMMENDATION`, `SYSTEM_NOTICE`.
- **Severities**: `INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **Governance Gate**: Any alert of `CRITICAL` severity involving biosecurity or food security requires human review prior to public broadcast.
- **Expiration**: Ephemeral alerts carry `expires_at` timestamps to prevent stale guidance.

---

## 11. Data Privacy and Commercial Boundaries

To protect rural producers and enterprise buyers:
1. **No Exact Farm Coordinates**: Geolocation is aggregated to LGA or agricultural corridor level.
2. **No Direct Phone / Private Contact Exposure**: Identity protection maintains platform privacy.
3. **No Private Contract or Counterparty Revelation**: B2B terms remain compartmentalized under RLS.
4. **Minimum Necessary Data**: Personalization draws strictly from user preferences, verified roles, and selected commodities.

---

## 12. Strict Anti-Pork Invariant

In compliance with strict platform-wide cultural, religious, and supply chain standards:
- **Database Constraints**: Table-level check constraints prohibit porcine terms across descriptions, rationales, and metadata:
  ```sql
  CHECK (title !~* '(pork|pig|swine|hog|boar|ham|bacon|lard)')
  CHECK (summary !~* '(pork|pig|swine|hog|boar|ham|bacon|lard)')
  ```
- **Software Boundary**: All inputs, outputs, preferences, and notifications execute `assertNoProhibitedProduce()` before processing.
- **AI Boundary**: Prompts and completions strictly reject any generation or indexing of porcine commodities.

---

## 13. AI Boundaries & Fallback Mechanics

Phase 2.2 LLM reasoning is used strictly for interpretive clarity:
- **Permitted**: Explaining trade-offs, summarizing complex multi-agent correlations, providing context for non-technical users.
- **Prohibited**: Autonomous execution, altering quantitative priority/confidence scores, diagnosing livestock illnesses, prescribing uncertified chemicals, guaranteeing financial yields.
- **Deterministic Fallback**: If LLM endpoints are unavailable, the platform automatically renders deterministic rule-based rationales and explanations with zero loss of core capability.

---

## 14. Database Architecture & Migrations

Migration: `supabase/migrations/20261006220000_phase_3_2_decision_action_intelligence.sql`

### New Tables
1. `user_intelligence_preferences`: Actor role, selected commodities, geographic scope, digest frequencies, notification thresholds.
2. `agricultural_decisions`: Governed record of user decision on recommendations (`ACCEPT`, `REJECT`, `DEFER`, etc.).
3. `agricultural_actions`: Audited tracking of actions taken (`VIEWED`, `STARTED_PROCUREMENT`, `USER_REPORTED_EXTERNAL_ACTION`, etc.).
4. `decision_action_links`: Audit link joining recommendations, decisions, actions, and downstream outcomes.

### Reused / Extended Tables
1. `notifications`: Augmented with `severity`, `expires_at`, and `metadata`.
2. `agricultural_orchestration_recommendations`: Augmented with `EXPIRED` status, `recommendation_type`, `urgency`, `limitations`, `affected_actor`, and anti-pork constraints.
3. `agricultural_orchestration_outcomes`: Reused for outcome tracking and evaluation variance loops.

---

## 15. Limitations and Future Extensions

### Current Limitations
- External actions are reliant on self-reporting by the user (`USER_REPORTED_EXTERNAL_ACTION`).
- Physical outcome verification depends on post-transaction settlement confirmations and post-harvest audit records.
- Cross-border ECOWAS trade corridors are restricted to designated border markets.

### Future Roadmap (Phase 3.3+)
- USSD and offline SMS delivery channels for low-connectivity rural farmers.
- Cooperative group decision aggregation for smallholder farming clusters.
- IoT integration (weather stations, cold-storage telemetry) for automatic outcome verification.
