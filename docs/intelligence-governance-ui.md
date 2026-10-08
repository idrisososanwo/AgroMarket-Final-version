# AgroMarket Phase 3.9: Governance Presentation & Administrative Review Infrastructure

## 1. Architectural Overview & Purpose

Phase 3.9 establishes the presentation and administrative review layer for the deterministic intelligence governance engine codified in Phase 3.8. 

The governance UI fulfills a core AgroMarket principle: **Autonomous intelligence must remain strictly bounded, observable, and governed by human oversight.**

The presentation layer exposes:
- Real-time governance command center metrics.
- Active human, professional, and authority approval queues.
- Deterministic policy evaluations with complete execution lineage (`Recommendation` $\rightarrow$ `Evaluation` $\rightarrow$ `Approval` $\rightarrow$ `Action Gate` $\rightarrow$ `Outcome`).
- Capability matrices, risk ceilings, and autonomy boundaries for all 9 canonical agents.
- Codified, read-only policy specifications and disclaimers.
- Immutable administrative override ledgers.
- Append-only governance audit trails.

```
       [Agricultural Intelligence Engine]
                       ↓
           [Action Proposal / Intent]
                       ↓
   [Deterministic Policy Evaluation Engine]
                       ↓
    ┌──────────────────┴──────────────────┐
    ↓                                     ↓
[ALLOW / PERMITTED]         [HUMAN / PRO / AUTHORITY REVIEW]
    ↓                                     ↓
[Action Integration Gate]          [Approval Queue (/admin/governance)]
    ↓                                     ↓
[Product Workflow Execution]     [Affirmative Justification Required]
                                          ↓
                              [Safety Re-evaluation & Expiry Check]
                                          ↓
                                     [Approved] → [Action Gate]
```

---

## 2. Protected Routes & Access Control

Governance interfaces are restricted exclusively to authorized operational roles:

| Route | Primary Roles | Purpose & Scope |
| :--- | :--- | :--- |
| `/admin/governance` | `ADMIN`, `PLATFORM_COORDINATOR` | Governance Command Center: Aggregate metrics, approval queues, evaluation inspection, agent matrices, policy engine viewer, override ledger, and audit trail. |
| `/my-intelligence` | All authenticated roles (`FARMER`, `BUYER`, `PROCESSOR`, `LOGISTICS`, etc.) | User-facing recommendations display non-intrusive governance status badges (`Action Permitted`, `Human Approval Required`, `Professional Review Required`, `Insufficient Data`). |

### Server-Side Authorization Invariant
- Every governance route strictly enforces `requireAnyRole(["ADMIN", "PLATFORM_COORDINATOR"])` on the server before data is queried or rendered.
- Client-provided roles, statuses, and query parameters are never trusted.
- Ordinary users and unauthenticated sessions receive standard 403 Forbidden or 401 Unauthorized errors.

---

## 3. Governance Statuses & Human Meanings

The system provides plain-language explanations for all 7 deterministic governance decisions:

| Governance Decision | Plain-Language Label | Visual Treatment | Operational Meaning |
| :--- | :--- | :--- | :--- |
| `ALLOW` | **Permitted** | Emerald (`bg-emerald-50 text-emerald-800`) | Action conforms to platform governance policy and is safe to execute. |
| `ALLOW_WITH_REVIEW` | **Advisory Permitted** | Teal (`bg-teal-50 text-teal-800`) | Advisory intelligence permitted with standard contextual notice. |
| `REQUIRE_HUMAN_APPROVAL` | **Human Approval Required** | Amber (`bg-amber-50 text-amber-800`) | Requires affirmative authorization by an authorized human operator before action can proceed. |
| `REQUIRE_PROFESSIONAL_REVIEW` | **Professional Review Required** | Purple (`bg-purple-50 text-purple-800`) | Requires verified veterinary, agronomy, or extension expert review. |
| `REQUIRE_AUTHORITY_REVIEW` | **Authority Review Required** | Indigo (`bg-indigo-50 text-indigo-800`) | Requires regulatory or administrative authority verification context. |
| `DENY` | **Policy Denied** | Rose/Red (`bg-rose-50 text-rose-800`) | Action is not permitted under AgroMarket governance policy. |
| `INSUFFICIENT_DATA` | **Insufficient Evidence** | Neutral (`bg-neutral-100 text-neutral-700`) | There is not enough reliable evidence to authorize this action. |

---

## 4. Reviewer Workflows & Approval Safety

### Affirmative Approval Protocol
When an authorized reviewer opens a pending item in `/admin/governance`:
1. **Context Inspection**: The reviewer reviews the triggering recommendation, requested action intent, evidence signal count, confidence score, policy version, and TTL expiry timestamp.
2. **Mandatory Justification**: Affirmative approval requires entering a substantive justification into the compliance ledger. Empty justifications are rejected server-side.
3. **Safety Re-evaluation**: Before saving the approval, the server re-evaluates the governance policy. If underlying conditions changed, policy version changed, or the re-evaluation returns `DENY` or `INSUFFICIENT_DATA`, the approval is immediately blocked.
4. **Expiry Enforcement**: Approvals past their TTL (`expiresAt`) are blocked from approval. Stale approvals require generating a fresh evaluation.
5. **Role Match Verification**: The user must hold `ADMIN`, `PLATFORM_COORDINATOR`, or the specific `approverRole`.

### Rejection Protocol
- Rejections require entering a substantive compliance rationale.
- Records transition to `REJECTED`, logging the reason and updating the append-only audit ledger.

---

## 5. Domain Safety Boundaries

### 1. Veterinary & Biosecurity Boundary
- Observational pest and disease alerts represent risk screening only.
- AgroMarket governance **never** provides autonomous veterinary diagnosis, chemical prescriptions, quarantine orders, or animal culling mandates.
- Items tagged with `DISEASE_BIOSECURITY` require professional review with clear operational disclaimers.

### 2. Physical Security & Corridor Logistics Boundary
- Logistics intelligence provides observational transit friction estimates and aggregation advice.
- AgroMarket **never** provides tactical armed conflict evasion routing, checkpoint avoidance, or physical security guarantees.
- Third-party carriers retain sole operational liability for fleet movement.

### 3. Food Security Emergency Boundary
- platform models cannot unilaterally declare statutory food emergencies or divert public strategic grain reserves.
- Statutory food security interventions require explicit government/state coordinator authority review.

### 4. Financial & Autonomous Execution Boundary
- No intelligence agent or model has authority to autonomously disburse funds, initiate escrow releases, process wallet withdrawals, or execute binding trades.
- Financial transactions require explicit human initiation and server-authoritative payment gateway authentication.

### 5. Zero-Tolerance Anti-Pork Invariant
- Strict ecosystem ban on all swine, pork, porcine, bacon, ham, lard, and wild boar products across all inputs, models, recommendations, and test fixtures.
- Validated via deterministic regex assertion across all governance inputs and metadata.

### 6. Commercial Privacy Protections
- Direct phone numbers and exact GPS coordinates are stripped before governance evaluations are processed or displayed.
- Geographic scopes are aggregated to State, LGA, or regional market corridors.

---

## 6. Action Integration Button Enforcement

The `ActionIntegrationButton` (`src/features/action-integration/components/action-integration-button.tsx`) integrates directly with the server-side governance gate:
1. When clicked, `createActionIntegrationAction` evaluates `evaluateActionGovernanceGate`.
2. If the policy decision denies the action or requires human review, the button:
   - Blocks navigation to the destination workflow.
   - Displays a prominent red warning banner detailing the policy infraction or review requirement.
3. Only permitted actions proceed to destination routes.

---

## 7. Metrics & Zero-Fabrication Invariant

The Governance Command Center calculates metrics strictly from persisted database records:
- Evaluations Today
- Evaluations Requiring Review
- Pending Human Approvals
- Professional Reviews Pending
- Authority Reviews Pending
- Blocked Actions
- Insufficient Data Decisions
- Expired Approvals
- Recent Overrides
- Active Policy Version (`v1.0.0`)

**Zero Fabrication Rule:** If no activity has occurred, metrics display `0` and empty states clearly show `"No approval records found"`, `"No governance evaluations yet"`, or `"No governance overrides recorded"`.
